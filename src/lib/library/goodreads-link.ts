const GOODREADS_SEARCH_BASE = "https://www.goodreads.com/search";

/**
 * Build a Goodreads search URL for the given title and optional author.
 * The URL is safe for use in `<a href>` and always opens a title(+author) search.
 */
export function buildGoodreadsSearchUrl(title: string, author?: string | null): string {
    const parts = [title.trim()];

    if (author && author.trim().length > 0) {
        parts.push(author.trim());
    }

    const query = parts.join(" ");
    const url = new URL(GOODREADS_SEARCH_BASE);
    url.searchParams.set("q", query);

    return url.toString();
}
