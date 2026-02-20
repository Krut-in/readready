import test from "node:test";
import assert from "node:assert/strict";

// We test the individual search functions (searchGoogleBooks, searchOpenLibrary)
// by mocking global fetch, and the top-level searchMetadata for fallback behavior.

import { searchMetadata, searchGoogleBooks, searchOpenLibrary } from "./metadata-search";

// ── Helpers ─────────────────────────────────────────────────────────────

function mockFetch(response: object, ok = true) {
    const original = globalThis.fetch;
    globalThis.fetch = async () =>
        ({
            ok,
            json: async () => response,
        }) as Response;
    return () => {
        globalThis.fetch = original;
    };
}

function mockFetchReject(error: Error) {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
        throw error;
    };
    return () => {
        globalThis.fetch = original;
    };
}

// ── searchGoogleBooks ───────────────────────────────────────────────────

test("searchGoogleBooks returns normalized results", async () => {
    const restore = mockFetch({
        items: [
            {
                id: "gb-1",
                volumeInfo: {
                    title: "Dune",
                    authors: ["Frank Herbert"],
                    imageLinks: { thumbnail: "https://img.example.com/dune.jpg" },
                },
            },
        ],
    });

    try {
        const results = await searchGoogleBooks("dune");
        assert.equal(results.length, 1);
        assert.equal(results[0]!.title, "Dune");
        assert.equal(results[0]!.author, "Frank Herbert");
        assert.equal(results[0]!.sourceLabel, "google_books");
        assert.equal(results[0]!.sourceId, "gb-1");
    } finally {
        restore();
    }
});

test("searchGoogleBooks returns empty for no items", async () => {
    const restore = mockFetch({ items: [] });
    try {
        const results = await searchGoogleBooks("nonexistent");
        assert.equal(results.length, 0);
    } finally {
        restore();
    }
});

// ── searchOpenLibrary ───────────────────────────────────────────────────

test("searchOpenLibrary returns normalized results", async () => {
    const restore = mockFetch({
        docs: [
            {
                key: "/works/OL1234",
                title: "1984",
                author_name: ["George Orwell"],
                cover_i: 12345,
            },
        ],
    });

    try {
        const results = await searchOpenLibrary("1984");
        assert.equal(results.length, 1);
        assert.equal(results[0]!.title, "1984");
        assert.equal(results[0]!.author, "George Orwell");
        assert.equal(results[0]!.sourceLabel, "open_library");
        assert.ok(results[0]!.coverUrl?.includes("12345"));
    } finally {
        restore();
    }
});

// ── searchMetadata fallback ─────────────────────────────────────────────

test("searchMetadata returns empty for blank query", async () => {
    const results = await searchMetadata("   ");
    assert.equal(results.length, 0);
});

test("searchMetadata falls back to Open Library when Google fails", async () => {
    let callCount = 0;
    const original = globalThis.fetch;

    globalThis.fetch = async (input: string | URL | Request) => {
        callCount++;
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("googleapis")) {
            throw new Error("Google down");
        }

        return {
            ok: true,
            json: async () => ({
                docs: [{ key: "/works/OL1", title: "Fallback Book", author_name: ["Author"], cover_i: null }],
            }),
        } as Response;
    };

    try {
        const results = await searchMetadata("test");
        assert.equal(results.length, 1);
        assert.equal(results[0]!.title, "Fallback Book");
        assert.equal(results[0]!.sourceLabel, "open_library");
        assert.ok(callCount >= 2);
    } finally {
        globalThis.fetch = original;
    }
});

test("searchMetadata falls back when Google returns empty", async () => {
    const original = globalThis.fetch;

    globalThis.fetch = async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("googleapis")) {
            return { ok: true, json: async () => ({ items: [] }) } as Response;
        }

        return {
            ok: true,
            json: async () => ({
                docs: [{ key: "/works/OL2", title: "OL Book", author_name: ["OL Author"] }],
            }),
        } as Response;
    };

    try {
        const results = await searchMetadata("test");
        assert.equal(results.length, 1);
        assert.equal(results[0]!.sourceLabel, "open_library");
    } finally {
        globalThis.fetch = original;
    }
});

test("searchMetadata returns empty when both sources fail", async () => {
    const restore = mockFetchReject(new Error("Network down"));
    try {
        const results = await searchMetadata("test");
        assert.equal(results.length, 0);
    } finally {
        restore();
    }
});
