/**
 * Convert a string into a URL-safe HTML id attribute value.
 * Matches the legacy htmlId Handlebars helper behavior.
 */
export function htmlId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
