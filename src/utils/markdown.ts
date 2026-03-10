import { marked } from "marked";

/**
 * Render Markdown to HTML. Used for spec descriptions.
 */
export function renderMarkdown(input?: string): string {
  if (!input) return "";
  return marked.parse(input, { async: false }) as string;
}

/**
 * Render Markdown to inline HTML (strip wrapping <p> tags).
 */
export function renderMarkdownInline(input?: string): string {
  if (!input) return "";
  return marked.parseInline(input, { async: false }) as string;
}
