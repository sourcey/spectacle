import type { NormalizedSpec } from "./types.js";
import { tagNavigationLabel } from "./tag-utils.js";
import { tabPath } from "../config.js";
import type { ResolvedTab } from "../config.js";
import type { DocsPage } from "./markdown-loader.js";
import { htmlId } from "../utils/html-id.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteNavigation {
  tabs: SiteTab[];
  activeTabSlug: string;
  activePageSlug: string;
}

export interface SiteTab {
  label: string;
  slug: string;
  /** Relative URL to this tab's first page (from site root) */
  href: string;
  kind: "spec" | "docs";
  groups: SiteNavGroup[];
}

export interface SiteNavGroup {
  label: string;
  items: SiteNavItem[];
}

export interface SiteNavItem {
  label: string;
  /** Relative URL to this item (from site root) */
  href: string;
  /** Unique ID for active-state matching */
  id: string;
  /** HTTP method for OpenAPI operations (colored dot in sidebar) */
  method?: string;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Build a navigation tab from an OpenAPI spec.
 * Extracts the same structure currently hardcoded in Sidebar.tsx:
 * Introduction + Authentication → tag groups with operations → Models.
 * All hrefs are #anchor links (single-page spec rendering).
 */
export function buildNavFromSpec(
  spec: NormalizedSpec,
  tabSlug: string,
): SiteTab {
  const basePath = tabPath(tabSlug, "index.html");
  const groups: SiteNavGroup[] = [];

  // Intro group
  const introItems: SiteNavItem[] = [
    { label: "Introduction", href: `${basePath}#introduction`, id: "introduction" },
  ];
  if (Object.keys(spec.securitySchemes).length > 0) {
    introItems.push({
      label: "Authentication",
      href: `${basePath}#authentication`,
      id: "authentication",
    });
  }
  groups.push({ label: "", items: introItems });

  // Tag groups with operations
  const tagsByName = new Map(spec.tags.map((tag) => [tag.name, tag]));
  for (const tag of spec.tags) {
    if (tag.hidden) continue;
    const items: SiteNavItem[] = tag.operations.map((op) => ({
      label: op.summary ?? `${op.method.toUpperCase()} ${op.path}`,
      href: `${basePath}#operation-${htmlId(op.path)}-${htmlId(op.method)}`,
      id: `operation-${htmlId(op.path)}-${htmlId(op.method)}`,
      method: op.method,
    }));
    if (!items.length) continue;
    groups.push({ label: tagNavigationLabel(tag, tagsByName), items });
  }

  // Models group
  const schemaNames = Object.keys(spec.schemas);
  if (schemaNames.length > 0) {
    const items: SiteNavItem[] = schemaNames.map((name) => ({
      label: name,
      href: `${basePath}#definition-${htmlId(name)}`,
      id: `definition-${htmlId(name)}`,
    }));
    groups.push({ label: "Models", items });
  }

  return {
    label: tabSlug,
    slug: tabSlug,
    href: basePath,
    kind: "spec",
    groups,
  };
}

/**
 * Build a navigation tab from markdown pages.
 * Groups come from the config; items come from loaded page data.
 */
export function buildNavFromPages(
  tab: ResolvedTab,
  pagesByPath: Map<string, DocsPage>,
): SiteTab {
  const groups: SiteNavGroup[] = [];

  if (tab.groups) {
    for (const group of tab.groups) {
      const items: SiteNavItem[] = [];
      for (const rp of group.pages) {
        const page = pagesByPath.get(rp.slug);
        if (!page) continue;
        items.push({
          label: page.title,
          href: tabPath(tab.slug, `${page.slug}.html`),
          id: page.slug,
        });
      }
      groups.push({ label: group.label, items });
    }
  }

  const firstItem = groups[0]?.items[0];
  const href = firstItem?.href ?? (tab.slug ? `${tab.slug}/` : "");

  return {
    label: tab.label,
    slug: tab.slug,
    href,
    kind: "docs",
    groups,
  };
}

/**
 * Assemble a SiteNavigation from a list of tabs.
 * Defaults to the first tab and first page as active.
 */
export function buildSiteNavigation(tabs: SiteTab[]): SiteNavigation {
  const firstTab = tabs[0];
  const firstItem = firstTab?.groups[0]?.items[0];

  return {
    tabs,
    activeTabSlug: firstTab?.slug ?? "",
    activePageSlug: firstItem?.id ?? "",
  };
}

/**
 * Create a copy of the navigation with a specific page marked as active.
 */
export function withActivePage(
  nav: SiteNavigation,
  tabSlug: string,
  pageSlug: string,
): SiteNavigation {
  return { ...nav, activeTabSlug: tabSlug, activePageSlug: pageSlug };
}
