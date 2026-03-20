import { generate, type GeneratedPage } from "moxygen";
import type { ResolvedDoxygenConfig } from "../config.js";
import { renderMarkdown, extractHeadings } from "../utils/markdown.js";
import type { MarkdownPage } from "./markdown-loader.js";
import type { SiteTab, SiteNavGroup, SiteNavItem } from "./navigation.js";

// ---------------------------------------------------------------------------
// Load Doxygen XML via Moxygen and produce MarkdownPage[]
// ---------------------------------------------------------------------------

export interface DoxygenResult {
  pages: Map<string, MarkdownPage>;
  navTab: SiteTab;
}

export async function loadDoxygenTab(
  config: ResolvedDoxygenConfig,
  tabSlug: string,
  tabLabel: string,
): Promise<DoxygenResult> {
  const generated = await generate({
    directory: config.xml,
    language: config.language,
    quiet: true,
  });

  const pages = new Map<string, MarkdownPage>();
  const groupMap = new Map<string, GeneratedPage[]>();

  for (const page of generated) {
    // Skip empty pages
    if (!page.markdown.trim()) continue;

    // Strip frontmatter before rendering (generate() prepends it)
    const body = stripFrontmatter(page.markdown);
    const html = await renderMarkdown(body);
    const headings = extractHeadings(body);

    const mdPage: MarkdownPage = {
      title: page.title,
      description: page.description,
      slug: page.slug,
      html,
      headings,
      sourcePath: config.xml,
    };

    pages.set(page.slug, mdPage);

    // Group by module (Doxygen group name) or namespace, or "API" as fallback
    const groupKey = page.module ?? page.namespace ?? "API";
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(page);
  }

  // Build navigation groups
  const groups: SiteNavGroup[] = [];

  for (const [groupLabel, groupPages] of groupMap) {
    // Put namespace index pages first, then classes alphabetically
    const sorted = groupPages.sort((a, b) => {
      if (a.kind === "namespace" && b.kind !== "namespace") return -1;
      if (a.kind !== "namespace" && b.kind === "namespace") return 1;
      return a.title.localeCompare(b.title);
    });

    const items: SiteNavItem[] = sorted.map((p) => ({
      label: p.title,
      href: `${tabSlug}/${p.slug}.html`,
      id: p.slug,
    }));

    groups.push({ label: shortGroupLabel(groupLabel), items });
  }

  const firstItem = groups[0]?.items[0];
  const href = firstItem?.href ?? `${tabSlug}/`;

  const navTab: SiteTab = {
    label: tabLabel,
    slug: tabSlug,
    href,
    kind: "docs",
    groups,
  };

  return { pages, navTab };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\s*\n[\s\S]*?\n---\s*\n/;

function stripFrontmatter(md: string): string {
  return md.replace(FRONTMATTER_RE, "");
}

function shortGroupLabel(name: string): string {
  const parts = name.split("::");
  return parts[parts.length - 1] || name;
}
