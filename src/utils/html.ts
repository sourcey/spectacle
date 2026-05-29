import sanitizeHtml from "sanitize-html";

const BASE_URL = "https://sourcey.invalid/";
const EXPLICIT_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

export interface SafeUrlOptions {
  allowedProtocols?: readonly string[];
  allowRelative?: boolean;
  allowAnchor?: boolean;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export function safeUrl(input: string, options: SafeUrlOptions = {}): string | null {
  const allowedProtocols = options.allowedProtocols ?? ["http:", "https:", "mailto:"];
  const allowRelative = options.allowRelative ?? true;
  const allowAnchor = options.allowAnchor ?? true;
  const value = input.trim();

  if (!value || hasRawControlOrSpace(value)) return null;
  if (value.startsWith("#")) return allowAnchor ? value : null;
  if (value.startsWith("//")) return null;

  try {
    const parsed = new URL(value, BASE_URL);
    const hasExplicitScheme = EXPLICIT_SCHEME_RE.test(value);
    if (!hasExplicitScheme) return allowRelative ? value : null;
    return allowedProtocols.includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function hasRawControlOrSpace(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function sanitizeRenderedHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "button",
      "details",
      "iframe",
      "img",
      "path",
      "source",
      "summary",
      "svg",
      "video",
    ],
    allowedAttributes: {
      "*": [
        "class",
        "id",
        "role",
        "tabindex",
        "title",
        "aria-expanded",
        "aria-hidden",
        "aria-label",
        "aria-selected",
        "data-clipboard-target",
        "data-cols",
        "data-copy-source",
        "data-display",
        "data-tab-group",
        "data-tab-index",
        "data-target",
        "data-traverse-target",
      ],
      a: ["href", "name", "target", "rel", "title", "class", "id"],
      button: [
        "type",
        "class",
        "aria-expanded",
        "aria-label",
        "aria-selected",
        "data-copy-source",
        "data-tab-group",
        "data-tab-index",
      ],
      div: [
        "class",
        "id",
        "role",
        "style",
        "data-cols",
        "data-tab-group",
        "data-tab-index",
        "data-traverse-target",
      ],
      details: ["class", "id", "open"],
      h1: ["id", "class"],
      h2: ["id", "class"],
      h3: ["id", "class"],
      h4: ["id", "class"],
      h5: ["id", "class"],
      h6: ["id", "class"],
      iframe: ["src", "title", "frameborder", "allow", "allowfullscreen", "loading", "class", "id"],
      img: ["src", "alt", "title", "width", "height", "loading", "class", "id"],
      path: ["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
      pre: ["class", "tabindex", "style"],
      source: ["src", "type"],
      span: ["class", "style", "title"],
      svg: [
        "xmlns",
        "width",
        "height",
        "viewBox",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "class",
        "aria-hidden",
        "focusable",
      ],
      table: ["class"],
      td: ["class", "colspan", "rowspan"],
      th: ["class", "colspan", "rowspan", "scope"],
      video: ["controls", "preload", "title", "class", "id"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      iframe: ["http", "https"],
      img: ["http", "https"],
      source: ["http", "https"],
    },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        background: [/^transparent$/, /^#[0-9a-fA-F]{3,8}$/],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/],
        color: [/^#[0-9a-fA-F]{3,8}$/],
        height: [/^\d{1,4}px$/],
        "--shiki-dark": [/^#[0-9a-fA-F]{3,8}$/],
        "--shiki-dark-bg": [/^#[0-9a-fA-F]{3,8}$/],
        "--shiki-light": [/^#[0-9a-fA-F]{3,8}$/],
        "--shiki-light-bg": [/^#[0-9a-fA-F]{3,8}$/],
      },
    },
  });
}
