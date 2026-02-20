import test from "node:test";
import assert from "node:assert/strict";

import { isValidCfi, normalizeCfi } from "./cfi";

// ── isValidCfi ────────────────────────────────────────────────────────────────

test("isValidCfi: valid location CFI", () => {
    assert.equal(
        isValidCfi("epubcfi(/6/4[chapter01]!/4/2/1:0)"),
        true,
    );
});

test("isValidCfi: valid range CFI (with comma)", () => {
    assert.equal(
        isValidCfi("epubcfi(/6/4[chapter01]!/4/2/1:0,/4/2/1:38)"),
        true,
    );
});

test("isValidCfi: realistic epub.js range CFI", () => {
    assert.equal(
        isValidCfi("epubcfi(/6/14[chapter07]!/4/2/122/2/1:0,/4/2/122/2/1:38)"),
        true,
    );
});

test("isValidCfi: empty string → false", () => {
    assert.equal(isValidCfi(""), false);
});

test("isValidCfi: null → false", () => {
    assert.equal(isValidCfi(null), false);
});

test("isValidCfi: undefined → false", () => {
    assert.equal(isValidCfi(undefined), false);
});

test("isValidCfi: plain text → false", () => {
    assert.equal(isValidCfi("chapter 3, paragraph 2"), false);
});

test("isValidCfi: missing closing paren → false", () => {
    assert.equal(isValidCfi("epubcfi(/6/4[chapter01]!/4/2/1:0"), false);
});

test("isValidCfi: missing opening prefix → false", () => {
    assert.equal(isValidCfi("/6/4[chapter01]!/4/2/1:0)"), false);
});

test("isValidCfi: number → false", () => {
    assert.equal(isValidCfi(42), false);
});

// ── normalizeCfi ──────────────────────────────────────────────────────────────

test("normalizeCfi: clean CFI is unchanged", () => {
    const cfi = "epubcfi(/6/4[chapter01]!/4/2/1:0)";
    assert.equal(normalizeCfi(cfi), cfi);
});

test("normalizeCfi: trims leading and trailing whitespace", () => {
    assert.equal(
        normalizeCfi("  epubcfi(/6/4!/4/2/1:0)  "),
        "epubcfi(/6/4!/4/2/1:0)",
    );
});

test("normalizeCfi: internal spaces are preserved (CFI content is opaque)", () => {
    // CFI strings may legitimately contain spaces in id attributes
    const cfi = "epubcfi(/6/4[my chapter]!/4/1:0)";
    assert.equal(normalizeCfi(cfi), cfi);
});

// ── JSON serialisation round-trip ─────────────────────────────────────────────
//
// Annotations are stored in Supabase as JSONB. These tests verify that CFI
// strings survive the JSON serialise/deserialise cycle unchanged, which is
// the same transformation they undergo during persistence and retrieval.

test("CFI string survives JSON round-trip unchanged", () => {
    const original = "epubcfi(/6/14[chapter07]!/4/2/122/2/1:0,/4/2/122/2/1:38)";
    const payload = JSON.parse(JSON.stringify({ cfi: original })) as { cfi: string };
    assert.equal(payload.cfi, original);
});

test("annotation object survives JSON round-trip with CFI intact", () => {
    const annotation = {
        id:         "ann-001",
        cfiRange:   "epubcfi(/6/4[chapter01]!/4/2/1:0,/4/2/1:10)",
        text:       "To be, or not to be",
        note:       "**Classic opening.** Explores existential choice.",
        color:      "yellow",
        createdAt:  "2026-02-19T12:00:00Z",
    };

    const restored = JSON.parse(JSON.stringify(annotation)) as typeof annotation;

    assert.equal(restored.id,        annotation.id);
    assert.equal(restored.cfiRange,  annotation.cfiRange);
    assert.equal(restored.text,      annotation.text);
    assert.equal(restored.note,      annotation.note);
    assert.equal(restored.color,     annotation.color);
    assert.equal(restored.createdAt, annotation.createdAt);
    assert.equal(isValidCfi(restored.cfiRange), true);
});

test("CFI with special characters (brackets, colons, slashes) survives round-trip", () => {
    const cfi = "epubcfi(/6/4[ch-01_section.2]!/4/2/1:0,/4/2/1:100)";
    const roundTripped = JSON.parse(JSON.stringify(cfi)) as string;
    assert.equal(roundTripped, cfi);
    assert.equal(isValidCfi(roundTripped), true);
});

test("array of CFI strings survives JSON round-trip", () => {
    const cfis = [
        "epubcfi(/6/4[ch01]!/4/2/1:0)",
        "epubcfi(/6/6[ch02]!/4/4/1:10,/4/4/1:30)",
        "epubcfi(/6/14[ch07]!/4/2/122/2/1:0,/4/2/122/2/1:38)",
    ];
    const restored = JSON.parse(JSON.stringify(cfis)) as string[];
    assert.equal(restored.length, cfis.length);
    for (let i = 0; i < cfis.length; i++) {
        assert.equal(restored[i], cfis[i]);
        assert.equal(isValidCfi(restored[i]!), true);
    }
});
