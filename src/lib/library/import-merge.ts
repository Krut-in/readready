import type { Book, GoodreadsRow, ImportDecision, ImportPreviewRow } from "./types";

// ── Normalization ───────────────────────────────────────────────────────

/**
 * Normalize a string for conflict matching:
 * trim → lowercase → collapse runs of whitespace to a single space.
 */
export function normalizeForMatch(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── Conflict Detection ──────────────────────────────────────────────────

/**
 * Match imported rows against existing books to detect conflicts.
 * Uses normalized title+author match. Falls back to title-only when the
 * import row has no author.
 */
export function detectConflicts(
    rows: GoodreadsRow[],
    existingBooks: Book[],
): ImportPreviewRow[] {
    // Build lookup maps keyed by normalized values
    const byTitleAuthor = new Map<string, Book>();
    const byTitleOnly = new Map<string, Book>();

    for (const book of existingBooks) {
        const tn = normalizeForMatch(book.title);
        const an = book.author ? normalizeForMatch(book.author) : "";
        const key = `${tn}|||${an}`;
        byTitleAuthor.set(key, book);

        // Only set title-only if not already set (first match wins)
        if (!byTitleOnly.has(tn)) {
            byTitleOnly.set(tn, book);
        }
    }

    return rows.map((row, rowIndex) => {
        const tn = normalizeForMatch(row.title);
        const an = row.author ? normalizeForMatch(row.author) : "";

        // Try title+author first
        const fullKey = `${tn}|||${an}`;
        const fullMatch = byTitleAuthor.get(fullKey);

        if (fullMatch) {
            return { rowIndex, row, hasConflict: true, existingBookId: fullMatch.id };
        }

        // Fallback: title-only when import row has no author
        if (!an) {
            const titleMatch = byTitleOnly.get(tn);
            if (titleMatch) {
                return { rowIndex, row, hasConflict: true, existingBookId: titleMatch.id };
            }
        }

        return { rowIndex, row, hasConflict: false, existingBookId: null };
    });
}

// ── Decision Application ────────────────────────────────────────────────

export type MergeResult = {
    creates: ImportPreviewRow[];
    replaces: ImportPreviewRow[];
    skipped: number;
};

/**
 * Split preview rows into actionable batches based on user decisions.
 * Non-conflicting rows are always in `creates`. Conflicting rows are routed
 * based on their explicit decision.
 */
export function applyDecisions(
    previews: ImportPreviewRow[],
    decisions: Map<number, ImportDecision>,
): MergeResult {
    const creates: ImportPreviewRow[] = [];
    const replaces: ImportPreviewRow[] = [];
    let skipped = 0;

    for (const preview of previews) {
        if (!preview.hasConflict) {
            creates.push(preview);
            continue;
        }

        const decision = decisions.get(preview.rowIndex);

        switch (decision) {
            case "replace_existing":
                replaces.push(preview);
                break;
            case "keep_existing":
            case "skip_import":
                skipped++;
                break;
            default:
                // If no decision provided for a conflict, skip it
                skipped++;
        }
    }

    return { creates, replaces, skipped };
}
