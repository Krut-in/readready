import { z } from "zod";

// ── Reading States ──────────────────────────────────────────────────────

export const READING_STATES = ["to_read", "reading", "completed"] as const;
export type ReadingState = (typeof READING_STATES)[number];

export const READING_STATE_LABELS: Record<ReadingState, string> = {
    to_read: "To Read",
    reading: "Reading",
    completed: "Completed",
};

// ── Book (DB row, camelCase) ────────────────────────────────────────────

export type Book = {
    id: string;
    userId: string;
    title: string;
    author: string | null;
    state: ReadingState;
    coverUrl: string | null;
    googleBooksId: string | null;
    openLibraryKey: string | null;
    goodreadsSearchUrl: string | null;
    progressPercent: number;
    notesCount: number;
    streakDays: number;
    lastReadAt: string | null;
    /** 0-indexed chapter the user is currently on (from TOC) */
    currentChapterIndex: number;
    /** Total TOC items — 0 if not yet loaded */
    totalChapters: number;
    // FIXED: Added lastReadLocation — field exists in DB (migration 0004) but was missing from type
    /** EPUB CFI string for reading position */
    lastReadLocation: string | null;
    uploadId: string | null;
    createdAt: string;
    updatedAt: string;
};

// ── Metadata Search ─────────────────────────────────────────────────────

export type MetadataResult = {
    title: string;
    author: string | null;
    coverUrl: string | null;
    sourceId: string;
    sourceLabel: "google_books" | "open_library";
};

// ── Goodreads Import ────────────────────────────────────────────────────

export type GoodreadsRow = {
    title: string;
    author: string;
    shelf: string;
    bookId: string | null;
    state: ReadingState;
    warning: string | null;
};

export type ImportPreviewRow = {
    rowIndex: number;
    row: GoodreadsRow;
    hasConflict: boolean;
    existingBookId: string | null;
};

export const IMPORT_DECISIONS = [
    "keep_existing",
    "replace_existing",
    "skip_import",
] as const;
export type ImportDecision = (typeof IMPORT_DECISIONS)[number];

// ── Zod Schemas ─────────────────────────────────────────────────────────

export const readingStateSchema = z.enum(READING_STATES);

export const createBookSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),
    author: z.string().trim().optional(),
    state: readingStateSchema.optional().default("to_read"),
    coverUrl: z.string().url().optional(),
    googleBooksId: z.string().optional(),
    openLibraryKey: z.string().optional(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;

export const updateBookSchema = z.object({
    title: z.string().trim().min(1).optional(),
    author: z.string().trim().nullable().optional(),
    state: readingStateSchema.optional(),
    coverUrl: z.string().url().nullable().optional(),
    googleBooksId: z.string().nullable().optional(),
    openLibraryKey: z.string().nullable().optional(),
});

export type UpdateBookInput = z.infer<typeof updateBookSchema>;

export const importDecisionSchema = z.enum(IMPORT_DECISIONS);

export const importConfirmItemSchema = z.object({
    rowIndex: z.number().int().min(0),
    decision: importDecisionSchema,
});

export const importConfirmSchema = z.object({
    csvText: z.string().min(1, "CSV content is required"),
    decisions: z.array(importConfirmItemSchema),
});

export type ImportConfirmInput = z.infer<typeof importConfirmSchema>;

// ── DB Row → Book helper ────────────────────────────────────────────────

export function dbRowToBook(row: Record<string, unknown>): Book {
    return {
        id: row.id as string,
        userId: row.user_id as string,
        title: row.title as string,
        author: (row.author as string) ?? null,
        state: row.state as ReadingState,
        coverUrl: (row.cover_url as string) ?? null,
        googleBooksId: (row.google_books_id as string) ?? null,
        openLibraryKey: (row.open_library_key as string) ?? null,
        goodreadsSearchUrl: (row.goodreads_search_url as string) ?? null,
        progressPercent: (row.progress_percent as number) ?? 0,
        notesCount: (row.notes_count as number) ?? 0,
        streakDays: (row.streak_days as number) ?? 0,
        lastReadAt: (row.last_read_at as string) ?? null,
        currentChapterIndex: (Number(row.current_chapter_index) || 0),
        totalChapters: (Number(row.total_chapters) || 0),
        lastReadLocation: (row.last_read_location as string) ?? null,
        uploadId: (row.upload_id as string) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}
