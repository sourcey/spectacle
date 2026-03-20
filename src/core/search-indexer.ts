import type { NormalizedSpec } from "./types.js";
import type { MarkdownPage } from "./markdown-loader.js";
import type { SiteNavigation } from "./navigation.js";
import { htmlId } from "../utils/html-id.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchEntry {
  /** Display title */
  title: string;
  /** Plain text excerpt for display in results */
  content: string;
  /** Relative URL to the page (+ optional anchor) */
  url: string;
  /** HTTP method for API operations */
  method?: string;
  /** API path for operations */
  path?: string;
  /** Tab this entry belongs to */
  tab: string;
  /** Category for grouping results */
  category: string;
}

// ---------------------------------------------------------------------------
// Index builder
// ---------------------------------------------------------------------------

/**
 * Build a search index from specs and markdown pages.
 * Returns a JSON string ready to write to disk.
 */
export function buildSearchIndex(
  specs: Map<string, NormalizedSpec>,
  pages: Map<string, MarkdownPage[]>,
  navigation: SiteNavigation,
  assetBase = "/",
): string {
  const base = assetBase.endsWith("/") ? assetBase : assetBase + "/";
  const entries: SearchEntry[] = [];

  // Index OpenAPI specs
  for (const [tabSlug, spec] of specs) {
    const tab = navigation.tabs.find((t) => t.slug === tabSlug);
    const tabLabel = tab?.label ?? tabSlug;
    const basePath = `${tabSlug}/index.html`;

    // Operations
    for (const op of spec.operations) {
      entries.push({
        title: op.summary ?? `${op.method.toUpperCase()} ${op.path}`,
        content: op.description?.slice(0, 200) ?? "",
        url: `${base}${basePath}#operation-${htmlId(op.path)}-${htmlId(op.method)}`,
        method: op.method,
        path: op.path,
        tab: tabLabel,
        category: "Endpoints",
      });
    }

    // Schemas
    for (const name of Object.keys(spec.schemas)) {
      entries.push({
        title: name,
        content: spec.schemas[name].description?.slice(0, 200) ?? "",
        url: `${base}${basePath}#definition-${htmlId(name)}`,
        tab: tabLabel,
        category: "Models",
      });
    }
  }

  // Index markdown pages
  for (const [tabSlug, tabPages] of pages) {
    const tab = navigation.tabs.find((t) => t.slug === tabSlug);
    const tabLabel = tab?.label ?? tabSlug;

    for (const page of tabPages) {
      // Page itself
      entries.push({
        title: page.title,
        content: page.description || stripHtml(page.html).slice(0, 200),
        url: `${base}${tabSlug}/${page.slug}.html`,
        tab: tabLabel,
        category: "Pages",
      });

      // Headings within page
      for (const heading of page.headings) {
        entries.push({
          title: heading.text,
          content: `${page.title} — ${heading.text}`,
          url: `${base}${tabSlug}/${page.slug}.html#${heading.id}`,
          tab: tabLabel,
          category: "Sections",
        });
      }
    }
  }

  return JSON.stringify(entries);
}

/**
 * Strip HTML tags from a string to get plain text.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
