import type { GoodreadsRow, ReadingState } from "./types";

// ── Shelf → State mapping ───────────────────────────────────────────────

const SHELF_MAP: Record<string, ReadingState> = {
    "to-read": "to_read",
    "currently-reading": "reading",
    read: "completed",
};

export function mapShelfToState(shelf: string): { state: ReadingState; warning: string | null } {
    const normalized = shelf.trim().toLowerCase();
    const mapped = SHELF_MAP[normalized];

    if (mapped) {
        return { state: mapped, warning: null };
    }

    return {
        state: "to_read",
        warning: `Unknown shelf "${shelf}" mapped to "To Read"`,
    };
}

// ── CSV Parsing (RFC-4180 compatible) ───────────────────────────────────

const REQUIRED_COLUMNS = ["Title", "Author", "Exclusive Shelf"];

/**
 * Parse a Goodreads CSV export string into typed rows.
 * Handles quoted fields, commas in titles, escaped quotes (""), blank lines, and BOM.
 */
export function parseGoodreadsCsv(
    text: string,
): { ok: true; rows: GoodreadsRow[]; warnings: string[] } | { ok: false; message: string } {
    // Strip BOM
    const clean = text.replace(/^\uFEFF/, "");
    const lines = splitCsvLines(clean);

    if (lines.length < 2) {
        return { ok: false, message: "CSV file is empty or has no data rows." };
    }

    const headerLine = lines[0];
    if (!headerLine) {
        return { ok: false, message: "CSV file is empty." };
    }
    const headers = parseCsvRow(headerLine);
    const headerIndexes = new Map<string, number>();

    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header) {
            headerIndexes.set(header.trim(), i);
        }
    }

    // Validate required columns
    const missing = REQUIRED_COLUMNS.filter((col) => !headerIndexes.has(col));
    if (missing.length > 0) {
        return { ok: false, message: `Missing required columns: ${missing.join(", ")}` };
    }

    const titleIdx = headerIndexes.get("Title")!;
    const authorIdx = headerIndexes.get("Author")!;
    const shelfIdx = headerIndexes.get("Exclusive Shelf")!;
    const bookIdIdx = headerIndexes.get("Book Id") ?? null;

    const rows: GoodreadsRow[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === "") continue;

        const fields = parseCsvRow(line);
        const title = fields[titleIdx]?.trim() ?? "";
        const author = fields[authorIdx]?.trim() ?? "";
        const shelf = fields[shelfIdx]?.trim() ?? "";
        const bookId = bookIdIdx !== null ? (fields[bookIdIdx]?.trim() || null) : null;

        if (!title) {
            warnings.push(`Row ${i + 1}: Skipped — missing title`);
            continue;
        }

        const { state, warning } = mapShelfToState(shelf);
        if (warning) {
            warnings.push(`Row ${i + 1}: ${warning}`);
        }

        rows.push({ title, author, shelf, bookId, state, warning });
    }

    return { ok: true, rows, warnings };
}

// ── Internal CSV helpers ────────────────────────────────────────────────

/**
 * Split CSV text into logical lines, respecting quoted fields that span
 * multiple physical lines.
 */
function splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
        } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
            // Handle \r\n
            if (ch === "\r" && text[i + 1] === "\n") {
                i++;
            }
            lines.push(current);
            current = "";
        } else {
            current += ch;
        }
    }

    if (current.length > 0) {
        lines.push(current);
    }

    return lines;
}

/**
 * Parse a single CSV row into field values.
 * Supports quoted fields with escaped double-quotes ("").
 */
function parseCsvRow(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                // Check for escaped quote ""
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                current += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i++;
            } else if (ch === ",") {
                fields.push(current);
                current = "";
                i++;
            } else {
                current += ch;
                i++;
            }
        }
    }

    fields.push(current);
    return fields;
}
