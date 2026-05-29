import { Marked, type Token, type Tokens } from "marked";
import { highlightCode } from "./highlighter.js";
import { COPY_ICON_SVG } from "./copy-svg.js";
import { htmlId } from "./html-id.js";
import { escapeAttr, safeUrl, sanitizeRenderedHtml } from "./html.js";

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

/* ── Video directive ──────────────────────────────────────────────── */

interface VideoToken extends Tokens.Generic {
  type: "video";
  raw: string;
  url: string;
  title: string;
}

function parseVideoUrl(
  url: string,
): { src: string; type: "iframe" | "video"; mime?: string } | null {
  const webUrl = safeUrl(url, {
    allowedProtocols: ["http:", "https:"],
    allowRelative: false,
    allowAnchor: false,
  });
  if (webUrl) {
    const parsed = new URL(webUrl);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id && /^[\w-]+$/.test(id)) {
        return { src: `https://www.youtube-nocookie.com/embed/${id}`, type: "iframe" };
      }
    }
    if (hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id && /^[\w-]+$/.test(id)) {
        return { src: `https://www.youtube-nocookie.com/embed/${id}`, type: "iframe" };
      }
    }
    if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
      const id = parsed.pathname
        .split("/")
        .filter(Boolean)
        .find((segment) => /^\d+$/.test(segment));
      if (id) return { src: `https://player.vimeo.com/video/${id}`, type: "iframe" };
    }
  }

  const rawVideoUrl = safeUrl(url, {
    allowedProtocols: ["http:", "https:"],
    allowRelative: true,
    allowAnchor: false,
  });
  if (!rawVideoUrl) return null;
  const ext = rawVideoUrl.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase();
  const mime = ext === "webm" ? "video/webm" : "video/mp4";
  return { src: rawVideoUrl, type: "video", mime };
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
        if (!parsed) return `<p>[video: invalid URL]</p>\n`;
        const safeTitle = escapeAttr(title);
        if (parsed.type === "iframe") {
          return `<div class="prose-video not-prose">
<iframe src="${escapeAttr(parsed.src)}" title="${safeTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
</div>\n`;
        }
        return `<div class="prose-video not-prose">
<video controls preload="metadata" title="${safeTitle}">
<source src="${escapeAttr(parsed.src)}" type="${escapeAttr(parsed.mime ?? "video/mp4")}" />
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
        return {
          type: "iframe",
          raw: match[0],
          url: match[1],
          title: attrs.title ?? "",
          height: Number.isFinite(height) ? height : 400,
        };
      },
      renderer(token: Tokens.Generic): string {
        const { url, title, height } = token as IframeToken;
        const iframeUrl = safeUrl(url, {
          allowedProtocols: ["http:", "https:"],
          allowRelative: false,
          allowAnchor: false,
        });
        if (!iframeUrl) return `<p>[iframe: invalid URL]</p>\n`;
        return `<div class="prose-iframe not-prose" style="height:${height}px">
<iframe src="${escapeAttr(iframeUrl)}" title="${escapeAttr(title)}" frameborder="0" loading="lazy" allowfullscreen></iframe>
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
      const header = token.header
        .map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
        .join("");
      const body = token.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`,
        )
        .join("\n");
      return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
    },
    link({ href, title, tokens }: Tokens.Link): string {
      const text = this.parser.parseInline(tokens);
      const linkUrl = safeUrl(href);
      if (!linkUrl) return text;
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      const isExternal = linkUrl.startsWith("http://") || linkUrl.startsWith("https://");
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeAttr(linkUrl)}"${titleAttr}${target}>${text}</a>`;
    },
  },
});

/**
 * Lex markdown into tokens using the shared Sourcey Marked instance.
 * This keeps directive support and heading parsing aligned with rendering.
 */
export function lexMarkdown(input?: string): Token[] {
  if (!input) return [];
  return marked.lexer(input);
}

/**
 * Extract h2/h3 headings from a markdown string by lexing the token tree.
 * No rendering needed; pure token walk.
 */
export function extractHeadings(input: string): PageHeading[] {
  const tokens = lexMarkdown(input);
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
  const tokens = lexMarkdown(input);
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
  let output = "";
  let index = 0;

  while (index < input.length) {
    const isImage = input[index] === "!" && input[index + 1] === "[";
    const isLink = input[index] === "[";
    const labelStart = isImage ? index + 2 : isLink ? index + 1 : -1;

    if (labelStart !== -1) {
      const labelEnd = findMarkdownLabelEnd(input, labelStart);
      if (labelEnd !== -1 && input[labelEnd + 1] === "(") {
        const hrefEnd = findMarkdownHrefEnd(input, labelEnd + 2);
        if (hrefEnd !== -1) {
          output += input.slice(labelStart, labelEnd);
          index = hrefEnd + 1;
          continue;
        }
      }
    }

    output += input[index];
    index += 1;
  }

  return output;
}

function findMarkdownLabelEnd(input: string, start: number): number {
  let inCode = false;
  for (let i = start; i < input.length; i += 1) {
    const char = input[i];
    if (char === "`") inCode = !inCode;
    if (char === "\n") return -1;
    if (char === "]" && !inCode) return i;
  }
  return -1;
}

function findMarkdownHrefEnd(input: string, start: number): number {
  for (let i = start; i < input.length; i += 1) {
    const char = input[i];
    if (char === "\n") return -1;
    if (char === ")") return i;
  }
  return -1;
}

/**
 * Render Markdown to HTML.
 */
export function renderMarkdown(input?: string): string {
  if (!input) return "";
  return sanitizeRenderedHtml(marked.parse(input, { async: false }) as string);
}

/**
 * Render Markdown to inline HTML (strip wrapping <p> tags).
 */
export function renderMarkdownInline(input?: string): string {
  if (!input) return "";
  return sanitizeRenderedHtml(marked.parseInline(input, { async: false }) as string);
}
