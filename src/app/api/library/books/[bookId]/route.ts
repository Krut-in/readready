import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildGoodreadsSearchUrl } from "@/lib/library/goodreads-link";
import { updateBookSchema, dbRowToBook } from "@/lib/library/types";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

/**
 * PATCH /api/library/books/[bookId]
 * Update book fields. Recomputes goodreads_search_url if title/author changes.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AppError("unauthorized", "Please sign in to update books.", 401);
        }

        const { bookId } = await context.params;

        const body: unknown = await request.json();
        const parsed = updateBookSchema.safeParse(body);

        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0];
            throw new AppError("validation_error", firstIssue?.message ?? "Invalid input.", 400);
        }

        const input = parsed.data;

        // Build the update payload (snake_case for DB)
        const updatePayload: Record<string, unknown> = {};

        if (input.title !== undefined) updatePayload.title = input.title;
        if (input.author !== undefined) updatePayload.author = input.author;
        if (input.state !== undefined) updatePayload.state = input.state;
        if (input.coverUrl !== undefined) updatePayload.cover_url = input.coverUrl;
        if (input.googleBooksId !== undefined) updatePayload.google_books_id = input.googleBooksId;
        if (input.openLibraryKey !== undefined) updatePayload.open_library_key = input.openLibraryKey;

        // Validation and derived updates that require current state
        if (input.title !== undefined || input.author !== undefined || input.state !== undefined) {
            const { data: current, error: fetchError } = await supabase
                .from("books")
                .select("title, author, state")
                .eq("id", bookId)
                .eq("user_id", user.id)
                .single();

            if (fetchError || !current) {
                throw new AppError("not_found", "Book not found.", 404);
            }

            if (input.state !== undefined && current.state === "completed" && input.state === "to_read") {
                throw new AppError("invalid_transition", "Cannot move a completed book back to purely 'to read'. Use 'reading' if you are re-reading.", 400);
            }

            if (input.title !== undefined || input.author !== undefined) {
                const finalTitle = input.title ?? (current.title as string);
                const finalAuthor = input.author !== undefined ? input.author : (current.author as string | null);
                updatePayload.goodreads_search_url = buildGoodreadsSearchUrl(finalTitle, finalAuthor);
            }
        }

        if (Object.keys(updatePayload).length === 0) {
            throw new AppError("no_changes", "No fields to update.", 400);
        }

        const { data, error } = await supabase
            .from("books")
            .update(updatePayload)
            .eq("id", bookId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                throw new AppError("duplicate_book", "A book with this title and author already exists.", 409);
            }
            throw new AppError("update_failed", "Failed to update book.", 500);
        }

        if (!data) {
            throw new AppError("not_found", "Book not found.", 404);
        }

        return NextResponse.json({ ok: true, book: dbRowToBook(data) });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}

/**
 * DELETE /api/library/books/[bookId]
 * Remove a library entry. Does NOT delete storage objects.
 */
export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AppError("unauthorized", "Please sign in to delete books.", 401);
        }

        const { bookId } = await context.params;

        const { error, count } = await supabase
            .from("books")
            .delete({ count: "exact" })
            .eq("id", bookId)
            .eq("user_id", user.id);

        if (error) {
            throw new AppError("delete_failed", "Failed to delete book.", 500);
        }

        if (count === 0) {
            throw new AppError("not_found", "Book not found.", 404);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}
