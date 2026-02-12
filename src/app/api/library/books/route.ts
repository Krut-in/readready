import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildGoodreadsSearchUrl } from "@/lib/library/goodreads-link";
import { createBookSchema, dbRowToBook } from "@/lib/library/types";

/**
 * GET /api/library/books
 * Optional query params: state, q (search term)
 * Returns user-scoped books sorted by updated_at DESC.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AppError("unauthorized", "Please sign in to view your library.", 401);
        }

        const { searchParams } = request.nextUrl;
        const stateFilter = searchParams.get("state");
        const query = searchParams.get("q");

        let dbQuery = supabase
            .from("books")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

        if (stateFilter && ["to_read", "reading", "completed"].includes(stateFilter)) {
            dbQuery = dbQuery.eq("state", stateFilter);
        }

        if (query && query.trim().length > 0) {
            const term = `%${query.trim()}%`;
            dbQuery = dbQuery.or(`title.ilike.${term},author.ilike.${term}`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            throw new AppError("query_failed", "Failed to load library.", 500);
        }

        const books = (data ?? []).map(dbRowToBook);
        return NextResponse.json({ ok: true, books });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}

/**
 * POST /api/library/books
 * Create a new book entry. Computes goodreads_search_url server-side.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AppError("unauthorized", "Please sign in to add books.", 401);
        }

        const body: unknown = await request.json();
        const parsed = createBookSchema.safeParse(body);

        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0];
            throw new AppError("validation_error", firstIssue?.message ?? "Invalid input.", 400);
        }

        const input = parsed.data;
        const goodreadsSearchUrl = buildGoodreadsSearchUrl(input.title, input.author);

        const { data, error } = await supabase
            .from("books")
            .insert({
                user_id: user.id,
                title: input.title,
                author: input.author ?? null,
                state: input.state,
                cover_url: input.coverUrl ?? null,
                google_books_id: input.googleBooksId ?? null,
                open_library_key: input.openLibraryKey ?? null,
                goodreads_search_url: goodreadsSearchUrl,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                throw new AppError("duplicate_book", "This book already exists in your library.", 409);
            }
            throw new AppError("insert_failed", "Failed to add book. Please try again.", 500);
        }

        return NextResponse.json({ ok: true, book: dbRowToBook(data) }, { status: 201 });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}
