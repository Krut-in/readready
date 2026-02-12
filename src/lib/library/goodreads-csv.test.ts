import test from "node:test";
import assert from "node:assert/strict";

import { parseGoodreadsCsv, mapShelfToState } from "./goodreads-csv";

// ── mapShelfToState ─────────────────────────────────────────────────────

test("maps 'to-read' to to_read", () => {
    const result = mapShelfToState("to-read");
    assert.equal(result.state, "to_read");
    assert.equal(result.warning, null);
});

test("maps 'currently-reading' to reading", () => {
    const result = mapShelfToState("currently-reading");
    assert.equal(result.state, "reading");
    assert.equal(result.warning, null);
});

test("maps 'read' to completed", () => {
    const result = mapShelfToState("read");
    assert.equal(result.state, "completed");
    assert.equal(result.warning, null);
});

test("maps unknown shelf to to_read with warning", () => {
    const result = mapShelfToState("favorites");
    assert.equal(result.state, "to_read");
    assert.ok(result.warning?.includes("favorites"));
});

test("maps empty shelf to to_read with warning", () => {
    const result = mapShelfToState("");
    assert.equal(result.state, "to_read");
    assert.ok(result.warning);
});

test("trims and lowercases shelf name", () => {
    const result = mapShelfToState("  Currently-Reading  ");
    assert.equal(result.state, "reading");
});

// ── parseGoodreadsCsv ───────────────────────────────────────────────────

test("parses basic CSV", () => {
    const csv = `Title,Author,Exclusive Shelf
The Great Gatsby,F. Scott Fitzgerald,read
1984,George Orwell,to-read`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0]!.title, "The Great Gatsby");
    assert.equal(result.rows[0]!.author, "F. Scott Fitzgerald");
    assert.equal(result.rows[0]!.state, "completed");
    assert.equal(result.rows[1]!.state, "to_read");
});

test("handles quoted fields with commas", () => {
    const csv = `Title,Author,Exclusive Shelf
"Gone with the Wind, Vol. 1",Margaret Mitchell,read`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]!.title, "Gone with the Wind, Vol. 1");
});

test("handles escaped double quotes", () => {
    const csv = `Title,Author,Exclusive Shelf
"She said ""hello""",Jane Doe,to-read`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.rows[0]!.title, 'She said "hello"');
});

test("skips blank lines", () => {
    const csv = `Title,Author,Exclusive Shelf

Dune,Frank Herbert,to-read

1984,George Orwell,read
`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rows.length, 2);
});

test("strips BOM", () => {
    const csv = `\uFEFFTitle,Author,Exclusive Shelf
Dune,Frank Herbert,read`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rows.length, 1);
});

test("rejects CSV missing required columns", () => {
    const csv = `Title,Other
Dune,blah`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.message.includes("Author"));
    assert.ok(result.message.includes("Exclusive Shelf"));
});

test("rejects empty CSV", () => {
    const result = parseGoodreadsCsv("");
    assert.equal(result.ok, false);
});

test("skips rows with empty title and adds warning", () => {
    const csv = `Title,Author,Exclusive Shelf
,Frank Herbert,read
1984,George Orwell,to-read`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rows.length, 1);
    assert.equal(result.warnings.length, 1);
});

test("handles Book Id column when present", () => {
    const csv = `Book Id,Title,Author,Exclusive Shelf
12345,Dune,Frank Herbert,read`;

    const result = parseGoodreadsCsv(csv);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rows[0]!.bookId, "12345");
});
