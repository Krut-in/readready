import { MAX_EPUB_BYTES, validateEpubFile, type EpubValidationResult } from "../validation/epub";

export const EPUB_BUCKET = "epubs";

export type UploadValidationResult =
  | {
      ok: true;
      file: File;
    }
  | {
      ok: false;
      code: "missing_file" | "invalid_type" | "file_too_large";
      message: string;
    };

export function getMaxEpubMb(): number {
  return Math.floor(MAX_EPUB_BYTES / (1024 * 1024));
}

export function validateUploadFormData(formData: FormData): UploadValidationResult {
  const maybeFile = formData.get("file");

  if (!(maybeFile instanceof File)) {
    return {
      ok: false,
      code: "missing_file",
      message: "Choose an EPUB file before uploading.",
    };
  }

  const epubValidation: EpubValidationResult = validateEpubFile(maybeFile);
  if (!epubValidation.valid) {
    return {
      ok: false,
      code: epubValidation.code,
      message: epubValidation.message,
    };
  }

  return { ok: true, file: maybeFile };
}

export function buildStorageObjectPath(userId: string, id: string = crypto.randomUUID()): string {
  return `${userId}/${id}.epub`;
}

export function buildStoredPath(objectPath: string): string {
  return objectPath;
}
