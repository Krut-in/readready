import test from "node:test";
import assert from "node:assert/strict";

import { buildGoodreadsSearchUrl } from "./goodreads-link";

test("builds URL with title and author", () => {
    const url = buildGoodreadsSearchUrl("The Great Gatsby", "F. Scott Fitzgerald");
    assert.equal(url, "https://www.goodreads.com/search?q=The+Great+Gatsby+F.+Scott+Fitzgerald");
});

test("builds URL with title only when author is missing", () => {
    const url = buildGoodreadsSearchUrl("1984");
    assert.equal(url, "https://www.goodreads.com/search?q=1984");
});

test("builds URL with title only when author is empty string", () => {
    const url = buildGoodreadsSearchUrl("1984", "");
    assert.equal(url, "https://www.goodreads.com/search?q=1984");
});

test("builds URL with title only when author is null", () => {
    const url = buildGoodreadsSearchUrl("1984", null);
    assert.equal(url, "https://www.goodreads.com/search?q=1984");
});

test("encodes special characters in title", () => {
    const url = buildGoodreadsSearchUrl("Harry Potter & the Sorcerer's Stone", "J.K. Rowling");
    // The URL API will percent-encode the & and '
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), "Harry Potter & the Sorcerer's Stone J.K. Rowling");
});

test("trims whitespace from title and author", () => {
    const url = buildGoodreadsSearchUrl("  Dune  ", "  Frank Herbert  ");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), "Dune Frank Herbert");
});

test("handles unicode characters", () => {
    const url = buildGoodreadsSearchUrl("Les Misérables", "Victor Hugo");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), "Les Misérables Victor Hugo");
});
