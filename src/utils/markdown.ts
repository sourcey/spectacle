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

/* ── Shared directive helpers ─────────────────────────────────────── */

function parseDirectiveAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [, k, v] of raw.matchAll(/(\w+)="([^"]*)"/g)) attrs[k] = v;
  return attrs;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function requireHttps(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.href;
  } catch {
    return null;
  }
}

/* ── Video directive ──────────────────────────────────────────────── */

interface VideoToken extends Tokens.Generic {
  type: "video";
  raw: string;
  url: string;
  title: string;
}

function parseVideoUrl(url: string): { src: string; type: "iframe" | "video"; mime?: string } {
  // YouTube
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, type: "iframe" };
  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return { src: `https://player.vimeo.com/video/${m[1]}`, type: "iframe" };
  // Raw video
  const ext = url.split(".").pop()?.toLowerCase();
  const mime = ext === "webm" ? "video/webm" : "video/mp4";
  return { src: url, type: "video", mime };
}

const videoExtension: import("marked").MarkedExtension = {
  extensions: [
    {
      name: "video",
      level: "block",
      start(src: string) {
        return src.match(/::video\[/)?.index;
      },
      tokenizer(src: string): VideoToken | undefined {
        const match = src.match(/^::video\[([^\]]+)\](?:\{([^}]*)\})?/);
        if (!match) return undefined;
        const attrs = parseDirectiveAttrs(match[2] ?? "");
        return { type: "video", raw: match[0], url: match[1], title: attrs.title ?? "" };
      },
      renderer(token: Tokens.Generic): string {
        const { url, title } = token as VideoToken;
        const parsed = parseVideoUrl(url);
        const safeTitle = escAttr(title);
        if (parsed.type === "iframe") {
          return `<div class="prose-video not-prose">
<iframe src="${parsed.src}" title="${safeTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
</div>\n`;
        }
        return `<div class="prose-video not-prose">
<video controls preload="metadata" title="${safeTitle}">
<source src="${parsed.src}" type="${parsed.mime}" />
</video>
</div>\n`;
      },
    },
  ],
};

/* ── Iframe directive ─────────────────────────────────────────────── */

interface IframeToken extends Tokens.Generic {
  type: "iframe";
  raw: string;
  url: string;
  title: string;
  height: number;
}

const iframeExtension: import("marked").MarkedExtension = {
  extensions: [
    {
      name: "iframe",
      level: "block",
      start(src: string) {
        return src.match(/::iframe\[/)?.index;
      },
      tokenizer(src: string): IframeToken | undefined {
        const match = src.match(/^::iframe\[([^\]]+)\](?:\{([^}]*)\})?/);
        if (!match) return undefined;
        const attrs = parseDirectiveAttrs(match[2] ?? "");
        const height = parseInt(attrs.height ?? "", 10);
        return { type: "iframe", raw: match[0], url: match[1], title: attrs.title ?? "", height: Number.isFinite(height) ? height : 400 };
      },
      renderer(token: Tokens.Generic): string {
        const { url, title, height } = token as IframeToken;
        const safeUrl = requireHttps(url);
        if (!safeUrl) return `<p>[iframe: invalid URL]</p>\n`;
        return `<div class="prose-iframe not-prose" style="height:${height}px">
<iframe src="${escAttr(safeUrl)}" title="${escAttr(title)}" frameborder="0" loading="lazy" allowfullscreen></iframe>
</div>\n`;
      },
    },
  ],
};

/** Singleton Marked instance — code blocks get Shiki + prose wrapper, headings get IDs. */
const marked = new Marked(videoExtension, iframeExtension, {
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
 * Extract the first paragraph token from markdown.
 * Useful for generated docs where a summary paragraph is embedded in the body.
 */
export function extractFirstParagraph(input?: string): string {
  if (!input) return "";
  const tokens = marked.lexer(input);
  for (const token of tokens) {
    if (token.type === "paragraph") {
      const raw = token.raw.trim();
      if (!raw) continue;
      if (!raw.replace(/<[^>]+>/g, "").trim()) continue;
      return raw;
    }
  }
  return "";
}

/**
 * Replace markdown links with their visible labels.
 * Useful when rendering inside an existing clickable container.
 */
export function stripMarkdownLinks(input?: string): string {
  if (!input) return "";
  return input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
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
