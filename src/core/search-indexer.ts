import type { NormalizedSpec } from "./types.js";
import type { DocsPage } from "./markdown-loader.js";
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
  /** Featured in default search results */
  featured?: boolean;
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
  pages: Map<string, DocsPage[]>,
  navigation: SiteNavigation,
  assetBase = "/",
  featuredSlugs: string[] = [],
): string {
  const base = assetBase.endsWith("/") ? assetBase : assetBase + "/";
  const featuredSet = new Set(featuredSlugs);
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
      const pageBase = tabSlug ? `${base}${tabSlug}/` : base;
      const isFeatured = featuredSet.has(page.slug);
      entries.push({
        title: page.title,
        content: page.kind === "markdown"
          ? page.description || stripHtml(page.html).slice(0, 200)
          : page.description || summarizeChangelog(page).slice(0, 200),
        url: `${pageBase}${page.slug}.html`,
        tab: tabLabel,
        category: "Pages",
        ...(isFeatured && { featured: true }),
      });

      if (page.kind === "markdown") {
        for (const heading of page.headings) {
          entries.push({
            title: heading.text,
            content: `${page.title} — ${heading.text}`,
            url: `${pageBase}${page.slug}.html#${heading.id}`,
            tab: tabLabel,
            category: "Sections",
          });
        }
      } else {
        for (const version of page.changelog.versions) {
          entries.push({
            title: version.version ?? "Unreleased",
            content: summarizeVersion(version).slice(0, 200),
            url: `${pageBase}${page.slug}.html#${version.id}`,
            tab: tabLabel,
            category: "Releases",
          });
        }
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

function summarizeChangelog(page: Extract<DocsPage, { kind: "changelog" }>): string {
  return page.changelog.versions
    .slice(0, 3)
    .map(summarizeVersion)
    .join(" ");
}

function summarizeVersion(
  version: Extract<DocsPage, { kind: "changelog" }>["changelog"]["versions"][number],
): string {
  if (version.summary) return version.summary;

  const entries = version.sections.flatMap((section) => section.entries.map((entry) => entry.text));
  return entries.slice(0, 3).join(" ");
}
