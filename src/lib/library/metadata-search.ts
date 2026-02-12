import { AppError } from "../errors";
import type { MetadataResult } from "./types";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";

const TIMEOUT_MS = 5_000;
const MAX_RESULTS = 10;

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Search for book metadata. Tries Google Books first, falls back to
 * Open Library when Google fails, times out, or returns no usable results.
 */
export async function searchMetadata(query: string): Promise<MetadataResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }

    try {
        const googleResults = await searchGoogleBooks(trimmed);
        if (googleResults.length > 0) {
            return googleResults;
        }
    } catch {
        // Google failed — fall through to Open Library
    }

    try {
        return await searchOpenLibrary(trimmed);
    } catch {
        // Both sources failed — return empty, don't throw
        return [];
    }
}

// ── Google Books ────────────────────────────────────────────────────────

export async function searchGoogleBooks(query: string): Promise<MetadataResult[]> {
    const url = new URL(GOOGLE_BOOKS_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(MAX_RESULTS));

    const response = await fetchWithTimeout(url.toString(), TIMEOUT_MS);

    if (!response.ok) {
        throw new AppError("google_books_error", "Google Books search failed.", 502);
    }

    const data = (await response.json()) as GoogleBooksResponse;

    if (!data.items || data.items.length === 0) {
        return [];
    }

    return data.items
        .filter((item) => item.volumeInfo?.title)
        .map((item): MetadataResult => {
            const info = item.volumeInfo;
            return {
                title: info.title,
                author: info.authors?.[0] ?? null,
                coverUrl: info.imageLinks?.thumbnail ?? null,
                sourceId: item.id,
                sourceLabel: "google_books",
            };
        });
}

// ── Open Library ────────────────────────────────────────────────────────

export async function searchOpenLibrary(query: string): Promise<MetadataResult[]> {
    const url = new URL(OPEN_LIBRARY_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(MAX_RESULTS));

    const response = await fetchWithTimeout(url.toString(), TIMEOUT_MS);

    if (!response.ok) {
        throw new AppError("open_library_error", "Open Library search failed.", 502);
    }

    const data = (await response.json()) as OpenLibraryResponse;

    if (!data.docs || data.docs.length === 0) {
        return [];
    }

    return data.docs
        .filter((doc) => doc.title)
        .map((doc): MetadataResult => {
            const coverId = doc.cover_i;
            return {
                title: doc.title,
                author: doc.author_name?.[0] ?? null,
                coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
                sourceId: doc.key,
                sourceLabel: "open_library",
            };
        });
}

// ── Fetch with timeout ──────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ── External API response shapes ────────────────────────────────────────

type GoogleBooksResponse = {
    items?: Array<{
        id: string;
        volumeInfo: {
            title: string;
            authors?: string[];
            imageLinks?: { thumbnail?: string };
        };
    }>;
};

type OpenLibraryResponse = {
    docs?: Array<{
        key: string;
        title: string;
        author_name?: string[];
        cover_i?: number;
    }>;
};
