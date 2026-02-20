import test from "node:test";
import assert from "node:assert/strict";

import {
  buildStorageObjectPath,
  buildStoredPath,
  validateUploadFormData,
} from "../../../../lib/uploads/epub-upload";

test("server-side validation rejects invalid file types", () => {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array(10)], "not-an-epub.txt", { type: "text/plain" }));

  const result = validateUploadFormData(formData);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_type");
  }
});

test("server-side validation rejects oversized files", () => {
  const formData = new FormData();
  formData.set(
    "file",
    new File([new Uint8Array(100 * 1024 * 1024 + 1)], "huge.epub", { type: "application/epub+zip" }),
  );

  const result = validateUploadFormData(formData);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "file_too_large");
  }
});

test("stored path is user-scoped in epubs bucket", () => {
  const objectPath = buildStorageObjectPath("user-123", "file-abc");
  const storedPath = buildStoredPath(objectPath);

  assert.equal(objectPath, "user-123/file-abc.epub");
  assert.equal(storedPath, "user-123/file-abc.epub");
});
