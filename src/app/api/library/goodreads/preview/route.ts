import { NextResponse } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseGoodreadsCsv } from "@/lib/library/goodreads-csv";
import { detectConflicts } from "@/lib/library/import-merge";
import { dbRowToBook } from "@/lib/library/types";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/library/goodreads/preview
 * Upload a Goodreads CSV for preview. Returns parsed rows with conflict metadata.
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

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new AppError("missing_file", "Choose a CSV file to upload.", 400);
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            throw new AppError("invalid_type", "Only CSV files are supported.", 400);
        }

        if (file.size > MAX_CSV_BYTES) {
            throw new AppError("file_too_large", "CSV file exceeds the 5 MB limit.", 400);
        }

        const csvText = await file.text();
        const parseResult = parseGoodreadsCsv(csvText);

        if (!parseResult.ok) {
            throw new AppError("parse_error", parseResult.message, 400);
        }

        // Fetch all existing books for conflict detection
        const { data: existingData, error: fetchError } = await supabase
            .from("books")
            .select("*")
            .eq("user_id", user.id);

        if (fetchError) {
            throw new AppError("query_failed", "Failed to load existing library.", 500);
        }

        const existingBooks = (existingData ?? []).map(dbRowToBook);
        const previews = detectConflicts(parseResult.rows, existingBooks);

        return NextResponse.json({
            ok: true,
            previews,
            warnings: parseResult.warnings,
            csvText,
        });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}
