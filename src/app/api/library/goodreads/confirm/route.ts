import { NextResponse } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseGoodreadsCsv } from "@/lib/library/goodreads-csv";
import { detectConflicts, applyDecisions } from "@/lib/library/import-merge";
import { buildGoodreadsSearchUrl } from "@/lib/library/goodreads-link";
import { importConfirmSchema, dbRowToBook } from "@/lib/library/types";
import type { ImportDecision } from "@/lib/library/types";

/**
 * POST /api/library/goodreads/confirm
 * Confirm Goodreads import. Re-parses + re-detects conflicts server-side,
 * then applies decisions as create / replace / skip operations.
 */
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AppError("unauthorized", "Please sign in to import books.", 401);
        }

        const body: unknown = await request.json();
        const parsed = importConfirmSchema.safeParse(body);

        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0];
            throw new AppError("validation_error", firstIssue?.message ?? "Invalid input.", 400);
        }

        const { csvText, decisions: decisionItems } = parsed.data;

        // Re-parse CSV server-side
        const parseResult = parseGoodreadsCsv(csvText);
        if (!parseResult.ok) {
            throw new AppError("parse_error", parseResult.message, 400);
        }

        // Re-detect conflicts
        const { data: existingData, error: fetchError } = await supabase
            .from("books")
            .select("*")
            .eq("user_id", user.id);

        if (fetchError) {
            throw new AppError("query_failed", "Failed to load existing library.", 500);
        }

        const existingBooks = (existingData ?? []).map(dbRowToBook);
        const previews = detectConflicts(parseResult.rows, existingBooks);

        // Validate: every conflicting row must have a decision
        const decisionMap = new Map<number, ImportDecision>();
        for (const item of decisionItems) {
            decisionMap.set(item.rowIndex, item.decision);
        }

        const conflictsWithoutDecision = previews.filter(
            (p) => p.hasConflict && !decisionMap.has(p.rowIndex),
        );
        if (conflictsWithoutDecision.length > 0) {
            throw new AppError(
                "missing_decisions",
                `${conflictsWithoutDecision.length} conflicting book(s) require a decision.`,
                400,
            );
        }

        // Apply decisions
        const { creates, replaces, skipped } = applyDecisions(previews, decisionMap);

        let createdCount = 0;
        let replacedCount = 0;

        // Process creates
        for (const preview of creates) {
            const row = preview.row;
            const goodreadsUrl = buildGoodreadsSearchUrl(row.title, row.author || undefined);

            const { error: insertError } = await supabase.from("books").insert({
                user_id: user.id,
                title: row.title,
                author: row.author || null,
                state: row.state,
                goodreads_search_url: goodreadsUrl,
            });

            if (!insertError) {
                createdCount++;
            }
            // Skip duplicates silently (race condition guard)
        }

        // Process replaces — update title/author/state/link, keep progress/upload
        for (const preview of replaces) {
            const row = preview.row;
            const goodreadsUrl = buildGoodreadsSearchUrl(row.title, row.author || undefined);

            if (preview.existingBookId) {
                const { error: updateError } = await supabase
                    .from("books")
                    .update({
                        title: row.title,
                        author: row.author || null,
                        state: row.state,
                        goodreads_search_url: goodreadsUrl,
                    })
                    .eq("id", preview.existingBookId)
                    .eq("user_id", user.id);

                if (!updateError) {
                    replacedCount++;
                }
            }
        }

        return NextResponse.json({
            ok: true,
            created: createdCount,
            replaced: replacedCount,
            skipped,
        });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}
