import { generate } from "moxygen";
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
  const groupMap = new Map<string, { slug: string; title: string; kind: string }[]>();

  for (const page of generated) {
    if (!page.markdown.trim()) continue;

    const html = renderMarkdown(page.markdown);
    const headings = extractHeadings(page.markdown);

    pages.set(page.slug, {
      title: page.title,
      description: page.description,
      slug: page.slug,
      html,
      headings,
      sourcePath: config.xml,
    });

    // Group by the last segment of namespace (e.g. "icy::http" -> "http")
    const groupKey = page.module ?? lastSegment(page.namespace) ?? "API";
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push({ slug: page.slug, title: page.title, kind: page.kind });
  }

  // Build navigation: namespace index pages first, then classes alphabetically
  const groups: SiteNavGroup[] = [];

  for (const [key, items] of groupMap) {
    // Use the group overview page's title as the sidebar label if available
    const groupPage = items.find((i) => i.kind === "group");
    const label = groupPage?.title ?? key;
    const sorted = items.sort((a, b) => {
      // Group overview page always first
      if (a.kind === "group" && b.kind !== "group") return -1;
      if (a.kind !== "group" && b.kind === "group") return 1;
      // Then namespace index pages
      if (a.kind === "namespace" && b.kind !== "namespace") return -1;
      if (a.kind !== "namespace" && b.kind === "namespace") return 1;
      return a.title.localeCompare(b.title);
    });

    groups.push({
      label,
      items: sorted.map((p): SiteNavItem => ({
        label: p.kind === "group" ? "Overview" : p.title,
        href: `${tabSlug}/${p.slug}.html`,
        id: p.slug,
      })),
    });
  }

  const firstItem = groups[0]?.items[0];

  return {
    pages,
    navTab: {
      label: tabLabel,
      slug: tabSlug,
      href: firstItem?.href ?? `${tabSlug}/`,
      kind: "docs",
      groups,
    },
  };
}

function lastSegment(name?: string): string | undefined {
  if (!name) return undefined;
  const parts = name.split("::");
  return parts[parts.length - 1] || name;
}
