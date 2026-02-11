import test from "node:test";
import assert from "node:assert/strict";

import { MAX_EPUB_BYTES, validateEpubFile } from "./epub";

test("accepts valid epub under limit", () => {
  const file = new File([new Uint8Array(1024)], "book.epub", { type: "application/epub+zip" });
  const result = validateEpubFile(file);

  assert.deepEqual(result, { valid: true });
});

test("rejects non-epub file type", () => {
  const file = new File([new Uint8Array(1024)], "notes.pdf", { type: "application/pdf" });
  const result = validateEpubFile(file);

  assert.deepEqual(result, {
    valid: false,
    code: "invalid_type",
    message: "Only EPUB files are supported in ReadReady.",
  });
});

test("rejects epub file above 100 MB", () => {
  const file = {
    name: "big-book.epub",
    type: "application/epub+zip",
    size: MAX_EPUB_BYTES + 1,
  } as File;
  const result = validateEpubFile(file);

  assert.deepEqual(result, {
    valid: false,
    code: "file_too_large",
    message: "EPUB exceeds the 100 MB upload limit.",
  });
});
