import test from "node:test";
import assert from "node:assert/strict";

import {
    READING_STATES,
    readingStateSchema,
    createBookSchema,
    updateBookSchema,
    dbRowToBook,
} from "./types";

// ── READING_STATES ────────────────────────────────────────────────────────────

test("READING_STATES contains exactly to_read, reading, completed", () => {
    assert.deepEqual([...READING_STATES], ["to_read", "reading", "completed"]);
});

// ── readingStateSchema ────────────────────────────────────────────────────────

test("readingStateSchema: 'to_read' parses", () => {
    const r = readingStateSchema.safeParse("to_read");
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data, "to_read");
});

test("readingStateSchema: 'reading' parses", () => {
    const r = readingStateSchema.safeParse("reading");
    assert.equal(r.success, true);
});

test("readingStateSchema: 'completed' parses", () => {
    const r = readingStateSchema.safeParse("completed");
    assert.equal(r.success, true);
});

test("readingStateSchema: invalid value fails", () => {
    const r = readingStateSchema.safeParse("archived");
    assert.equal(r.success, false);
});

test("readingStateSchema: empty string fails", () => {
    const r = readingStateSchema.safeParse("");
    assert.equal(r.success, false);
});

test("readingStateSchema: undefined fails", () => {
    const r = readingStateSchema.safeParse(undefined);
    assert.equal(r.success, false);
});

// ── createBookSchema ──────────────────────────────────────────────────────────

test("createBookSchema: valid title-only input", () => {
    const r = createBookSchema.safeParse({ title: "Dune" });
    assert.equal(r.success, true);
    if (r.success) {
        assert.equal(r.data.title, "Dune");
        assert.equal(r.data.state, "to_read"); // default applied
    }
});

test("createBookSchema: all valid fields", () => {
    const r = createBookSchema.safeParse({
        title: "1984",
        author: "George Orwell",
        state: "reading",
        coverUrl: "https://example.com/cover.jpg",
        googleBooksId: "abc123",
        openLibraryKey: "/works/OL123W",
    });
    assert.equal(r.success, true);
    if (r.success) {
        assert.equal(r.data.author, "George Orwell");
        assert.equal(r.data.state, "reading");
    }
});

test("createBookSchema: missing title fails", () => {
    const r = createBookSchema.safeParse({ author: "Someone" });
    assert.equal(r.success, false);
});

test("createBookSchema: empty title fails after trim", () => {
    const r = createBookSchema.safeParse({ title: "   " });
    assert.equal(r.success, false);
});

test("createBookSchema: invalid state fails", () => {
    const r = createBookSchema.safeParse({ title: "Book", state: "paused" });
    assert.equal(r.success, false);
});

test("createBookSchema: invalid coverUrl fails", () => {
    const r = createBookSchema.safeParse({ title: "Book", coverUrl: "not-a-url" });
    assert.equal(r.success, false);
});

test("createBookSchema: title is trimmed", () => {
    const r = createBookSchema.safeParse({ title: "  Dune  " });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.title, "Dune");
});

// ── updateBookSchema ──────────────────────────────────────────────────────────

test("updateBookSchema: empty object is valid (all optional)", () => {
    const r = updateBookSchema.safeParse({});
    assert.equal(r.success, true);
});

test("updateBookSchema: valid partial update", () => {
    const r = updateBookSchema.safeParse({ state: "completed" });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.state, "completed");
});

test("updateBookSchema: null author allowed (to clear)", () => {
    const r = updateBookSchema.safeParse({ author: null });
    assert.equal(r.success, true);
});

test("updateBookSchema: invalid state fails", () => {
    const r = updateBookSchema.safeParse({ state: "unknown" });
    assert.equal(r.success, false);
});

// ── dbRowToBook ───────────────────────────────────────────────────────────────

const mockRow: Record<string, unknown> = {
    id:                    "550e8400-e29b-41d4-a716-446655440000",
    user_id:               "user-abc-123",
    title:                 "Brave New World",
    author:                "Aldous Huxley",
    state:                 "reading",
    cover_url:             "https://example.com/cover.jpg",
    google_books_id:       "gbook-456",
    open_library_key:      "/works/OL789W",
    goodreads_search_url:  "https://www.goodreads.com/search?q=brave+new+world",
    progress_percent:      42,
    notes_count:           3,
    streak_days:           5,
    last_read_at:          "2026-02-18T10:00:00Z",
    current_chapter_index: 7,
    total_chapters:        18,
    upload_id:             "upload-789",
    created_at:            "2026-01-01T00:00:00Z",
    updated_at:            "2026-02-18T10:00:00Z",
};

test("dbRowToBook: maps all fields correctly", () => {
    const book = dbRowToBook(mockRow);
    assert.equal(book.id,                    mockRow.id);
    assert.equal(book.userId,                mockRow.user_id);
    assert.equal(book.title,                 mockRow.title);
    assert.equal(book.author,                mockRow.author);
    assert.equal(book.state,                 mockRow.state);
    assert.equal(book.coverUrl,              mockRow.cover_url);
    assert.equal(book.googleBooksId,         mockRow.google_books_id);
    assert.equal(book.openLibraryKey,        mockRow.open_library_key);
    assert.equal(book.goodreadsSearchUrl,    mockRow.goodreads_search_url);
    assert.equal(book.progressPercent,       mockRow.progress_percent);
    assert.equal(book.notesCount,            mockRow.notes_count);
    assert.equal(book.streakDays,            mockRow.streak_days);
    assert.equal(book.lastReadAt,            mockRow.last_read_at);
    assert.equal(book.currentChapterIndex,   mockRow.current_chapter_index);
    assert.equal(book.totalChapters,         mockRow.total_chapters);
    assert.equal(book.uploadId,              mockRow.upload_id);
    assert.equal(book.createdAt,             mockRow.created_at);
    assert.equal(book.updatedAt,             mockRow.updated_at);
});

test("dbRowToBook: null optional fields return null", () => {
    const sparse: Record<string, unknown> = {
        id:         "id-001",
        user_id:    "user-001",
        title:      "Unknown Book",
        state:      "to_read",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    };
    const book = dbRowToBook(sparse);
    assert.equal(book.author,              null);
    assert.equal(book.coverUrl,            null);
    assert.equal(book.googleBooksId,       null);
    assert.equal(book.openLibraryKey,      null);
    assert.equal(book.goodreadsSearchUrl,  null);
    assert.equal(book.lastReadAt,          null);
    assert.equal(book.uploadId,            null);
});

test("dbRowToBook: numeric fields default to 0 when absent", () => {
    const sparse: Record<string, unknown> = {
        id:         "id-002",
        user_id:    "user-002",
        title:      "Another Book",
        state:      "to_read",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    };
    const book = dbRowToBook(sparse);
    assert.equal(book.progressPercent,     0);
    assert.equal(book.notesCount,          0);
    assert.equal(book.streakDays,          0);
    assert.equal(book.currentChapterIndex, 0);
    assert.equal(book.totalChapters,       0);
});
