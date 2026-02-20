import test from "node:test";
import assert from "node:assert/strict";

import { normalizeForMatch, detectConflicts, applyDecisions } from "./import-merge";
import type { Book, GoodreadsRow, ImportPreviewRow, ImportDecision } from "./types";

// ── normalizeForMatch ───────────────────────────────────────────────────

test("trims whitespace", () => {
    assert.equal(normalizeForMatch("  hello  "), "hello");
});

test("lowercases text", () => {
    assert.equal(normalizeForMatch("Hello World"), "hello world");
});

test("collapses multiple whitespace chars", () => {
    assert.equal(normalizeForMatch("hello   world"), "hello world");
});

test("handles mixed whitespace and case", () => {
    assert.equal(normalizeForMatch("  The  Great   Gatsby  "), "the great gatsby");
});

// ── detectConflicts ─────────────────────────────────────────────────────

function makeBook(title: string, author: string | null, id = "id-1"): Book {
    return {
        id,
        userId: "user-1",
        title,
        author,
        state: "to_read",
        coverUrl: null,
        googleBooksId: null,
        openLibraryKey: null,
        goodreadsSearchUrl: null,
        progressPercent: 0,
        notesCount: 0,
        streakDays: 0,
        lastReadAt: null,
        lastReadLocation: null,
        currentChapterIndex: 0,
        totalChapters: 0,
        uploadId: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
    };
}

function makeRow(title: string, author: string): GoodreadsRow {
    return { title, author, shelf: "read", bookId: null, state: "completed", warning: null };
}

test("detects exact title+author conflict", () => {
    const existing = [makeBook("Dune", "Frank Herbert")];
    const rows = [makeRow("Dune", "Frank Herbert")];

    const result = detectConflicts(rows, existing);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.hasConflict, true);
    assert.equal(result[0]!.existingBookId, "id-1");
});

test("detects conflict with case/whitespace differences", () => {
    const existing = [makeBook("  The Great Gatsby  ", "F. Scott Fitzgerald")];
    const rows = [makeRow("the great gatsby", "f. scott fitzgerald")];

    const result = detectConflicts(rows, existing);
    assert.equal(result[0]!.hasConflict, true);
});

test("reports no conflict when titles differ", () => {
    const existing = [makeBook("Dune", "Frank Herbert")];
    const rows = [makeRow("1984", "George Orwell")];

    const result = detectConflicts(rows, existing);
    assert.equal(result[0]!.hasConflict, false);
});

test("title-only fallback when import row has no author", () => {
    const existing = [makeBook("Dune", "Frank Herbert")];
    const rows = [makeRow("Dune", "")];

    const result = detectConflicts(rows, existing);
    assert.equal(result[0]!.hasConflict, true);
});

test("no title-only fallback when import row has different author", () => {
    const existing = [makeBook("Dune", "Frank Herbert")];
    const rows = [makeRow("Dune", "Someone Else")];

    const result = detectConflicts(rows, existing);
    assert.equal(result[0]!.hasConflict, false);
});

// ── applyDecisions ──────────────────────────────────────────────────────

function makePreview(rowIndex: number, hasConflict: boolean): ImportPreviewRow {
    return {
        rowIndex,
        row: makeRow("Book " + rowIndex, "Author"),
        hasConflict,
        existingBookId: hasConflict ? "existing-" + rowIndex : null,
    };
}

test("non-conflicting rows go to creates", () => {
    const previews = [makePreview(0, false), makePreview(1, false)];
    const decisions = new Map<number, ImportDecision>();

    const result = applyDecisions(previews, decisions);
    assert.equal(result.creates.length, 2);
    assert.equal(result.replaces.length, 0);
    assert.equal(result.skipped, 0);
});

test("replace_existing goes to replaces", () => {
    const previews = [makePreview(0, true)];
    const decisions = new Map<number, ImportDecision>([[0, "replace_existing"]]);

    const result = applyDecisions(previews, decisions);
    assert.equal(result.creates.length, 0);
    assert.equal(result.replaces.length, 1);
    assert.equal(result.skipped, 0);
});

test("keep_existing and skip_import both increment skipped", () => {
    const previews = [makePreview(0, true), makePreview(1, true)];
    const decisions = new Map<number, ImportDecision>([
        [0, "keep_existing"],
        [1, "skip_import"],
    ]);

    const result = applyDecisions(previews, decisions);
    assert.equal(result.skipped, 2);
});

test("mixed decisions are routed correctly", () => {
    const previews = [
        makePreview(0, false),
        makePreview(1, true),
        makePreview(2, true),
        makePreview(3, false),
    ];
    const decisions = new Map<number, ImportDecision>([
        [1, "replace_existing"],
        [2, "keep_existing"],
    ]);

    const result = applyDecisions(previews, decisions);
    assert.equal(result.creates.length, 2);
    assert.equal(result.replaces.length, 1);
    assert.equal(result.skipped, 1);
});
