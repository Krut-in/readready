/**
 * Utilities for EPUB CFI (Canonical Fragment Identifier) validation.
 *
 * CFI strings anchor annotations to specific text locations in an EPUB.
 * These helpers verify that CFI values are structurally sound before
 * they are persisted to the database, and that they survive serialisation
 * without mutation.
 */

/**
 * Returns true if the value is a non-empty string that starts with "epubcfi("
 * and ends with ")". This is a structural check, not a full CFI parser.
 *
 * Valid forms:
 *   - Location:  epubcfi(/6/4[chapter01]!/4/2/1:0)
 *   - Range:     epubcfi(/6/4[chapter01]!/4/2/1:0,/4/2/1:10)
 */
export function isValidCfi(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.startsWith("epubcfi(") &&
    value.endsWith(")")
  );
}

/**
 * Trim surrounding whitespace from a CFI string.
 * CFI strings must not be otherwise modified; internal content is opaque.
 */
export function normalizeCfi(cfi: string): string {
  return cfi.trim();
}
