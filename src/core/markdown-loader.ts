import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { load as parseYaml } from "js-yaml";
import { Marked, type Tokens } from "marked";
import { highlightCode } from "../utils/highlighter.js";
import { htmlId } from "../utils/html-id.js";

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

export interface PageHeading {
  level: 2 | 3;
  text: string;
  id: string;
}

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
// Marked instance with Shiki highlighting and heading extraction
// ---------------------------------------------------------------------------

function createProseMarked(headings: PageHeading[]): Marked {
  const marked = new Marked();

  marked.use({
    renderer: {
      code({ text, lang }: Tokens.Code): string {
        const language = lang?.split(/\s/)[0] ?? "";
        return highlightCode(text, language);
      },

      heading({ tokens, depth }: Tokens.Heading): string {
        const text = tokens.map(t => ("text" in t ? t.text : t.raw)).join("");
        const id = htmlId(text);

        if (depth === 2 || depth === 3) {
          headings.push({ level: depth as 2 | 3, text, id });
        }

        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });

  return marked;
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

  const headings: PageHeading[] = [];
  const marked = createProseMarked(headings);
  const html = marked.parse(body, { async: false }) as string;

  const title = meta.title ?? slug;
  const description = meta.description ?? "";

  return { title, description, slug, html, headings, sourcePath: filePath };
}

/**
 * Derive a URL slug from a file path.
 * "docs/getting-started.md" → "getting-started"
 */
export function slugFromPath(filePath: string): string {
  return htmlId(basename(filePath, extname(filePath)));
}
