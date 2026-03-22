import { readFile } from "node:fs/promises";
import { basename, extname, relative } from "node:path";
import { load as parseYaml } from "js-yaml";
import { htmlId } from "../utils/html-id.js";
import { renderIcon } from "../utils/icons.js";
import { renderMarkdown, extractHeadings, type PageHeading } from "../utils/markdown.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkdownPage {
  /** Page title from frontmatter */
  title: string;
  /** Page description from frontmatter */
  description: string;
  /** URL slug for this page (derived from filename) */
  slug: string;
  /** Rendered HTML body */
  html: string;
  /** Extracted h2/h3 headings for table of contents */
  headings: PageHeading[];
  /** Original file path (for error messages and dev server watching) */
  sourcePath: string;
}

export type { PageHeading } from "../utils/markdown.js";

interface Frontmatter {
  title?: string;
  description?: string;
  order?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const meta = (parseYaml(match[1]) as Frontmatter) ?? {};
  return { meta, body: match[2] };
}

// ---------------------------------------------------------------------------
// Component preprocessor: transforms MDX-style JSX components into HTML
// ---------------------------------------------------------------------------

/**
 * Convert JSX-style components to directive syntax so they go through
 * a single rendering path in preprocessDirectives.
 */
function preprocessComponents(body: string): string {
  let html = body;

  // <Steps> <Step title="...">content</Step> ... </Steps> → :::steps numbered list
  html = html.replace(
    /<Steps>\s*([\s\S]*?)\s*<\/Steps>/g,
    (_m, inner: string) => {
      const steps: { title: string; content: string }[] = [];
      inner.replace(
        /\s*<Step\s+title="([^"]*)">\s*([\s\S]*?)\s*<\/Step>/g,
        (_sm: string, title: string, content: string) => {
          steps.push({ title, content: content.trim() });
          return "";
        },
      );
      const list = steps
        .map((s, i) => `${i + 1}. ${s.title}\n   ${s.content}`)
        .join("\n");
      return `:::steps\n${list}\n:::`;
    },
  );

  // <CardGroup cols={N}> <Card ...> ... </Card> ... </CardGroup> → :::card-group
  html = html.replace(
    /<CardGroup\s+cols=\{(\d+)\}>\s*([\s\S]*?)\s*<\/CardGroup>/g,
    (_m, cols: string, inner: string) => {
      const cards = inner.replace(
        /\s*<Card\s+title="([^"]*)"\s+icon="([^"]*)"(?:\s+href="([^"]*)")?\s*>\s*([\s\S]*?)\s*<\/Card>/g,
        (_cm: string, title: string, icon: string, href: string | undefined, content: string) => {
          const hrefAttr = href ? ` href="${href}"` : "";
          return `\n::card{title="${title}" icon="${icon}"${hrefAttr}}\n${content.trim()}\n::`;
        },
      ).trim();
      return `:::card-group{cols="${cols}"}\n${cards}\n:::`;
    },
  );

  // <AccordionGroup> <Accordion ...> ... </AccordionGroup> → wrap in accordion-group
  html = html.replace(
    /<AccordionGroup>\s*([\s\S]*?)\s*<\/AccordionGroup>/g,
    (_m, inner: string) => {
      const items = inner.replace(
        /\s*<Accordion\s+title="([^"]*)">\s*([\s\S]*?)\s*<\/Accordion>/g,
        (_am: string, title: string, content: string) => {
          return `\n:::accordion{title="${title}"}\n${content.trim()}\n:::`;
        },
      ).trim();
      return `<div class="accordion-group not-prose">\n${items}\n</div>`;
    },
  );

  // Standalone <Accordion> outside of group
  html = html.replace(
    /<Accordion\s+title="([^"]*)">\s*([\s\S]*?)\s*<\/Accordion>/g,
    (_m, title: string, content: string) => {
      return `:::accordion{title="${title}"}\n${content.trim()}\n:::`;
    },
  );

  return html;
}

// ---------------------------------------------------------------------------
// Directive preprocessor: transforms :::directive blocks into HTML
// ---------------------------------------------------------------------------

/** Parse {key="value" key2="value2"} attribute strings. */
function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!raw) return attrs;
  for (const m of raw.matchAll(/(\w+)="([^"]*)"/g)) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/** Deterministic tab-group ID; reset per page. */
let directiveCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++directiveCounter}`;
}

/** Reset counter between builds (called from loadMarkdownPage). */
function resetDirectiveCounter(): void {
  directiveCounter = 0;
}

/** Build tabbed UI HTML (shared by :::tabs and :::code-group). */
function buildTabbedHtml(
  tabs: { title: string; body: string }[],
  id: string,
  extraClass?: string,
): string {
  const cls = extraClass
    ? `directive-tabs ${extraClass} not-prose`
    : "directive-tabs not-prose";
  const buttons = tabs
    .map(
      (t, i) =>
        `<button class="directive-tab${i === 0 ? " active" : ""}" data-tab-group="${id}" data-tab-index="${i}">${t.title}</button>`,
    )
    .join("\n");
  const panels = tabs
    .map(
      (t, i) =>
        `<div class="directive-tab-panel${i === 0 ? " active" : ""}" data-tab-group="${id}" data-tab-index="${i}">

${t.body}

</div>`,
    )
    .join("\n");
  return `<div class="${cls}">
<div class="directive-tab-bar">${buttons}</div>
${panels}
</div>`;
}

/**
 * Split content on `::child` markers, returning { attrs, body } for each.
 * Leading content before the first marker is discarded.
 */
function splitChildren(
  content: string,
  marker: string,
): { attrs: Record<string, string>; body: string }[] {
  const children: { attrs: Record<string, string>; body: string }[] = [];
  const parts = content.split(new RegExp(`^\\s*::${marker}`, "gm"));
  for (const part of parts) {
    if (!part.trim()) continue;
    const m = part.match(/^\{([^}]*)\}\s*\n?([\s\S]*)/);
    if (m) {
      // Strip trailing :: child-close marker
      const body = m[2].trim().replace(/\n?::$/m, "").trim();
      children.push({ attrs: parseAttrs(m[1]), body });
    }
  }
  return children;
}

/**
 * Process :::directive blocks. Handles callouts, steps, tabs,
 * code-group, card-group, and accordion.
 *
 * Matching strategy: process one block type at a time. Each regex
 * matches a specific `:::type` opener so closing `:::` markers
 * from other directive types cannot collide.
 */
function preprocessDirectives(body: string): string {
  let html = body;

  // Callouts: :::note, :::warning, :::tip, :::info (optional title)
  html = html.replace(
    /^:::(note|warning|tip|info)(?:[^\S\n]+(.+))?\s*\n([\s\S]*?)^:::\s*$/gm,
    (_m, type: string, title: string | undefined, content: string) => {
      const label = title?.trim() || type.charAt(0).toUpperCase() + type.slice(1);
      const body = content.trim();
      return `\n\n<div class="callout callout-${type} not-prose">
<div class="callout-title">${label}</div>
${body ? `<div class="callout-content">\n\n${body}\n\n</div>` : ""}
</div>\n\n`;
    },
  );

  // Steps: :::steps with a plain numbered list inside
  html = html.replace(
    /^:::steps\s*\n([\s\S]*?)^:::\s*$/gm,
    (_m, content: string) => {
      const lines = content.trim().split("\n");
      const steps: { title: string; body: string[] }[] = [];
      for (const line of lines) {
        const sm = line.match(/^\d+\.\s+(.+)/);
        if (sm) {
          steps.push({ title: sm[1], body: [] });
        } else if (steps.length > 0) {
          // Strip up to 3 leading spaces (markdown list indent)
          steps[steps.length - 1].body.push(line.replace(/^ {1,3}/, ""));
        }
      }
      const items = steps
        .map(
          (s, i) =>
            `<div role="listitem" class="step-item">
<div class="step-number">${i + 1}</div>
<div class="step-body">
<p class="step-title">${s.title}</p>
<div class="step-content">

${s.body.join("\n").trim()}

</div>
</div>
</div>`,
        )
        .join("\n");
      return `\n\n<div role="list" class="steps not-prose">\n${items}\n</div>\n\n`;
    },
  );

  // Tabs: :::tabs with ::tab{title="..."} children
  html = html.replace(
    /^:::tabs\s*\n([\s\S]*?)^:::\s*$/gm,
    (_m, content: string) => {
      const tabs = splitChildren(content, "tab").map((c) => ({
        title: c.attrs.title || "",
        body: c.body,
      }));
      return `\n\n${buildTabbedHtml(tabs, nextId("tabs"))}\n\n`;
    },
  );

  // Code Group: :::code-group with titled fenced code blocks
  html = html.replace(
    /^:::code-group\s*\n([\s\S]*?)^:::\s*$/gm,
    (_m, content: string) => {
      const blocks: { title: string; body: string }[] = [];
      const re = /```(\w+)\s+title="([^"]*)"\s*\n([\s\S]*?)```/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(content)) !== null) {
        blocks.push({ title: match[2], body: `\`\`\`${match[1]}\n${match[3]}\`\`\`` });
      }
      if (blocks.length === 0) return content;
      return `\n\n${buildTabbedHtml(blocks, nextId("cg"), "directive-code-group")}\n\n`;
    },
  );

  // Card Group: :::card-group{cols="N"} with ::card children
  html = html.replace(
    /^:::card-group(?:\{([^}]*)\})?\s*\n([\s\S]*?)^:::\s*$/gm,
    (_m, attrsRaw: string | undefined, content: string) => {
      const cols = parseAttrs(attrsRaw || "").cols || "2";
      const cards = splitChildren(content, "card").map((c) => {
        const tag = c.attrs.href ? "a" : "div";
        const href = c.attrs.href ? ` href="${c.attrs.href}"` : "";
        const iconHtml = renderIcon(c.attrs.icon || "");
        return `<${tag}${href} class="card-item">
<div class="card-item-inner">
${iconHtml}
<h3 class="card-item-title">${c.attrs.title || ""}</h3>
<div class="card-item-content">

${c.body}

</div>
</div>
</${tag}>`;
      });
      return `\n\n<div class="card-group not-prose" data-cols="${cols}">\n${cards.join("\n")}\n</div>\n\n`;
    },
  );

  // Accordion: :::accordion{title="..."}
  html = html.replace(
    /^:::accordion(?:\{([^}]*)\})?\s*\n([\s\S]*?)^:::\s*$/gm,
    (_m, attrsRaw: string | undefined, content: string) => {
      const title = parseAttrs(attrsRaw || "").title || "";
      return `\n\n<details class="accordion-item">
<summary class="accordion-trigger">${title}</summary>
<div class="accordion-content">

${content.trim()}

</div>
</details>\n\n`;
    },
  );

  // Auto-wrap consecutive accordion items in an accordion-group
  html = html.replace(
    /(<details class="accordion-item">[\s\S]*?<\/details>\s*){2,}/g,
    (match) => `<div class="accordion-group not-prose">\n${match.trim()}\n</div>`,
  );

  return html;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a single markdown file and return a MarkdownPage.
 */
export async function loadMarkdownPage(
  filePath: string,
  slug: string,
): Promise<MarkdownPage> {
  const raw = await readFile(filePath, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  resetDirectiveCounter();
  const preprocessed = preprocessDirectives(preprocessComponents(body));
  const headings = extractHeadings(preprocessed);
  const html = renderMarkdown(preprocessed);

  const title = meta.title ?? extractFirstHeading(preprocessed) ?? slug;
  const description = meta.description ?? "";

  // Strip leading h1 from rendered HTML when it duplicates the page title
  const cleanHtml = html.replace(
    /^\s*<h1[^>]*>(.*?)<\/h1>\s*/i,
    (_m, inner) => inner.replace(/<[^>]+>/g, "").trim() === title ? "" : _m,
  );

  return { title, description, slug, html: cleanHtml, headings, sourcePath: relative(process.cwd(), filePath) };
}

/**
 * Extract the first # heading from markdown as a fallback title.
 */
function extractFirstHeading(md: string): string | undefined {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

/**
 * Derive a URL slug from a file path.
 * "docs/getting-started.md" → "getting-started"
 */
export function slugFromPath(filePath: string): string {
  return htmlId(basename(filePath, extname(filePath)));
}
