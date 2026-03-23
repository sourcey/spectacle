import { Marked, type Token, type Tokens } from "marked";
import { highlightCode } from "./highlighter.js";
import { COPY_ICON_SVG } from "./copy-svg.js";
import { htmlId } from "./html-id.js";

/**
 * Shared code block renderer used by all markdown rendering.
 * Outputs the prose-code-block wrapper with copy button and Shiki highlighting.
 */
export function renderCodeBlock(text: string, lang?: string): string {
  const language = lang?.split(/\s/)[0] ?? "";
  const shiki = highlightCode(text, language);
  return `<div class="prose-code-block not-prose">
<div class="prose-code-copy">
<button aria-label="Copy code" class="copy-btn" type="button" data-copy-source="code">${COPY_ICON_SVG}</button>
</div>
<div class="prose-code-content">${shiki}</div>
</div>`;
}

/** Heading info collected during render. */
export interface PageHeading {
  level: 2 | 3;
  text: string;
  id: string;
}

/** Singleton Marked instance — code blocks get Shiki + prose wrapper, headings get IDs. */
const marked = new Marked({
  renderer: {
    code({ text, lang }: Tokens.Code): string {
      return renderCodeBlock(text, lang);
    },
    heading({ tokens, depth }: Tokens.Heading): string {
      const text = tokens.map((t) => ("text" in t ? t.text : t.raw)).join("");
      const id = htmlId(text);
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    table(token: Tokens.Table): string {
      const header = token.header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join("");
      const body = token.rows.map((row) =>
        `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`
      ).join("\n");
      return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
    },
    link({ href, title, tokens }: Tokens.Link): string {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : "";
      const isExternal = href.startsWith("http://") || href.startsWith("https://");
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
    },
  },
});

/**
 * Extract h2/h3 headings from a markdown string by lexing the token tree.
 * No rendering needed; pure token walk.
 */
export function extractHeadings(input: string): PageHeading[] {
  const tokens = marked.lexer(input);
  const headings: PageHeading[] = [];
  for (const token of tokens) {
    if (token.type === "heading") {
      const depth = (token as Tokens.Heading).depth;
      if (depth === 2 || depth === 3) {
        const text = (token as Tokens.Heading).tokens
          .map((t: Token) => ("text" in t ? (t as { text: string }).text : t.raw))
          .join("");
        headings.push({ level: depth as 2 | 3, text, id: htmlId(text) });
      }
    }
  }
  return headings;
}

/**
 * Render Markdown to HTML.
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
