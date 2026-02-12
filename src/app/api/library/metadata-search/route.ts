import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchMetadata } from "@/lib/library/metadata-search";

/**
 * GET /api/library/metadata-search?q=<query>
 * Search external metadata sources (Google Books, Open Library fallback).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AppError("unauthorized", "Please sign in to search.", 401);
        }

        const query = request.nextUrl.searchParams.get("q");

        if (!query || query.trim().length === 0) {
            throw new AppError("missing_query", "Search query is required.", 400);
        }

        const results = await searchMetadata(query.trim());

        return NextResponse.json({ ok: true, results });
    } catch (error) {
        const handled = toApiError(error);
        return NextResponse.json(handled.payload, { status: handled.status });
    }
}
