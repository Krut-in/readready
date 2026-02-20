export const MAX_EPUB_BYTES = 100 * 1024 * 1024;

// EPUB files should have this MIME type, but browsers may send different values
const ALLOWED_EPUB_MIME_TYPES = new Set([
  "application/epub+zip",
  "application/octet-stream", // Some browsers send this for .epub files
]);

export type EpubValidationCode = "invalid_type" | "file_too_large";

export type EpubValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      code: EpubValidationCode;
      message: string;
    };

function hasEpubExtension(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".epub");
}

function hasAllowedMime(fileType: string): boolean {
  // If browser doesn't provide a MIME type, we rely on extension check
  if (!fileType) {
    return true;
  }

  return ALLOWED_EPUB_MIME_TYPES.has(fileType);
}

export function validateEpubFile(file: File): EpubValidationResult {
  if (!hasEpubExtension(file.name) || !hasAllowedMime(file.type)) {
    return {
      valid: false,
      code: "invalid_type",
      message: "Only EPUB files are supported in ReadReady.",
    };
  }

  if (file.size > MAX_EPUB_BYTES) {
    return {
      valid: false,
      code: "file_too_large",
      message: "EPUB exceeds the 100 MB upload limit.",
    };
  }

  return { valid: true };
}
