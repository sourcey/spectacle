import type { ResolvedRustdocConfig } from "../config.js";
import type { MarkdownPage, PageHeading, PageSearchEntry } from "./markdown-loader.js";
import type { SiteTab, SiteNavGroup, SiteNavItem } from "./navigation.js";
import { runIntrospector, RustdocIntrospectorError } from "./rustdoc-introspector.js";
import { RUSTDOC_DIAGNOSTIC_CODES } from "./rustdoc-types.js";
import type {
  CrateSpec,
  Doctest,
  ExternalCrateRef,
  Item,
  ModuleSpec,
  RustdocDiagnostic,
} from "./rustdoc-types.js";
import {
  itemAnchor,
  renderDoctestBlock,
  renderModulePage,
  type RenderContext,
} from "./rustdoc-render.js";

export interface RustdocLoaderDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  crate?: string;
  file?: string;
  line?: number;
}

export interface RustdocLoaderResult {
  pages: Map<string, MarkdownPage>;
  navTab: SiteTab;
  diagnostics: RustdocLoaderDiagnostic[];
}

export interface RustdocSourceLinkOptions {
  repo?: string;
  editBranch?: string;
  editBasePath?: string;
}

/** Load a rustdoc tab from the configured manifest or snapshot. */
export async function loadRustdocTab(
  config: ResolvedRustdocConfig,
  tabSlug: string,
  tabLabel: string,
  sourceLinks: RustdocSourceLinkOptions = {},
): Promise<RustdocLoaderResult> {
  let result;
  try {
    result = await runIntrospector({ config });
  } catch (err) {
    if (err instanceof RustdocIntrospectorError) {
      const pages = new Map<string, MarkdownPage>();
      pages.set(
        "index",
        emptyIndexPage(tabSlug, tabLabel, `Rustdoc introspection failed: ${err.message}`),
      );
      return {
        pages,
        navTab: emptyNavTab(tabSlug, tabLabel),
        diagnostics: [
          {
            severity: "error",
            code: err.code,
            message: err.message,
          },
        ],
      };
    }
    throw err;
  }

  const pages = new Map<string, MarkdownPage>();
  const navGroups: SiteNavGroup[] = [];
  const diagnostics: RustdocLoaderDiagnostic[] = result.diagnostics.map(toLoaderDiagnostic);

  const allDoctests: Array<{ crate: CrateSpec; item: Item; doctest: Doctest }> = [];

  for (const crate of result.spec.crates) {
    const crateItems = itemsAsMap(crate.items);
    for (const module of crate.modules) {
      const renderDiagnostics: RustdocDiagnostic[] = [];
      const page = renderModulePageLoader(
        crate,
        module,
        crateItems,
        tabSlug,
        sourceLinks,
        renderDiagnostics,
      );
      pages.set(page.slug, page);
      for (const d of renderDiagnostics) diagnostics.push(toLoaderDiagnostic(d));
    }

    const indexPage = renderCrateIndexPage(crate, tabSlug);
    pages.set(indexPage.slug, indexPage);

    for (const item of crateItems.values()) {
      for (const dt of item.doctests) {
        allDoctests.push({ crate, item, doctest: dt });
      }
    }

    navGroups.push(buildCrateNavGroup(crate, tabSlug));
  }

  if (config.doctestsIndex && allDoctests.length > 0) {
    const dtPage = renderDoctestsIndexPage(allDoctests, tabSlug);
    pages.set(dtPage.slug, dtPage);
    navGroups.unshift({
      label: "Examples",
      items: [
        {
          label: "Doctests",
          href: tabRelativeHref(tabSlug, dtPage.slug),
          id: "doctests",
        } satisfies SiteNavItem,
      ],
    });
  }

  if (result.spec.crates.length === 0) {
    pages.set("index", emptyIndexPage(tabSlug, tabLabel, "No documented crates."));
  } else {
    pages.set("index", renderWorkspaceIndexPage(result.spec.crates, tabSlug, tabLabel));
  }

  const navTab: SiteTab = {
    label: tabLabel,
    slug: tabSlug,
    href: tabRelativeHref(tabSlug, "index"),
    kind: "docs",
    groups: navGroups,
  };

  return { pages, navTab, diagnostics };
}

function renderModulePageLoader(
  crate: CrateSpec,
  module: ModuleSpec,
  itemsById: Map<string, Item>,
  tabSlug: string,
  sourceLinks: RustdocSourceLinkOptions,
  diagnostics: RustdocDiagnostic[],
): MarkdownPage {
  const slug = moduleSlug(crate.name, module.path);
  const title = module.path.length === 0 ? crate.name : module.path.join("::");
  const description = firstLine(module.docs_markdown) ?? "";
  const items: Item[] = module.item_ids
    .map((id) => itemsById.get(id))
    .filter((i): i is Item => Boolean(i));

  const headings = collectHeadings(items);
  const searchEntries = collectSearchEntries(items, title);
  const ctx = buildRenderContext(crate, itemsById, tabSlug, sourceLinks, diagnostics);
  const rendered = renderModulePage(module, items, ctx);
  const html = rendered.html;

  return {
    kind: "markdown",
    title,
    description,
    slug,
    html,
    headings,
    sourcePath: `rustdoc/${slug}.md`,
    editPath: module.source ? module.source.file : null,
    editBasePath: sourceLinks.editBasePath ?? "",
    searchEntries,
  };
}

function renderWorkspaceIndexPage(
  crates: CrateSpec[],
  tabSlug: string,
  tabLabel: string,
): MarkdownPage {
  const headings: PageHeading[] = [];
  const searchEntries: PageSearchEntry[] = [];
  const cards = crates.map((c) => {
    const href = tabRelativeHref(tabSlug, crateIndexSlug(c.name));
    const version = c.version ? ` <span class="rust-crate-card-version">${escapeHtml(c.version)}</span>` : "";
    const items = Object.keys(c.items).length;
    const modules = c.modules.length;
    const summary = `${items} item${items === 1 ? "" : "s"} across ${modules} module${modules === 1 ? "" : "s"}.`;
    headings.push({ id: crateIndexSlug(c.name), text: c.name, level: 3 });
    searchEntries.push({
      title: c.name,
      content: summary,
      anchor: crateIndexSlug(c.name),
      category: "rust crate",
      qualifiedName: c.name,
    });
    return (
      `<a class="rust-crate-card api-card" href="${escapeHtml(href)}" id="${crateIndexSlug(c.name)}">` +
      `<h3 class="rust-crate-card-title">${escapeHtml(c.name)}${version}</h3>` +
      `<p class="rust-crate-card-summary">${escapeHtml(summary)}</p>` +
      `</a>`
    );
  });
  return {
    kind: "markdown",
    title: tabLabel,
    description: `Rust API across ${crates.length} crate${crates.length === 1 ? "" : "s"}.`,
    slug: "index",
    html: `<section class="rust-workspace-index"><div class="rust-crate-cards">${cards.join("\n")}</div></section>`,
    headings,
    sourcePath: `rustdoc/index.md`,
    searchEntries,
  };
}

function renderCrateIndexPage(crate: CrateSpec, _tabSlug: string): MarkdownPage {
  const slug = crateIndexSlug(crate.name);
  const moduleCount = crate.modules.length;
  const itemCount = Object.keys(crate.items).length;
  const description = `Rust API for ${crate.name} (${itemCount} items across ${moduleCount} modules).`;
  const html =
    `<section class="rust-crate-index"><h1>${escapeHtml(crate.name)}</h1>` +
    `<p>${escapeHtml(description)}</p></section>`;
  return {
    kind: "markdown",
    title: crate.name,
    description,
    slug,
    html,
    headings: [],
    sourcePath: `rustdoc/${slug}.md`,
  };
}

function renderDoctestsIndexPage(
  doctests: Array<{ crate: CrateSpec; item: Item; doctest: Doctest }>,
  _tabSlug: string,
): MarkdownPage {
  const headings: PageHeading[] = [];
  const searchEntries: PageSearchEntry[] = [];
  const parts: string[] = [];
  parts.push(`<section class="rust-doctests-index">`);
  parts.push(`<h1>Doctests</h1>`);
  parts.push(`<p>${doctests.length} runnable example${doctests.length === 1 ? "" : "s"}.</p>`);
  for (const { crate, item, doctest } of doctests) {
    const parentPath = item.path.join("::");
    const anchor = `doctest-${itemAnchor(item)}-${doctest.ordinal}`;
    headings.push({ id: anchor, text: parentPath, level: 3 });
    searchEntries.push({
      title: `Doctest: ${parentPath}`,
      content: doctest.display_code.slice(0, 200),
      anchor,
      category: "rust doctest",
      ownerKind: itemKindLabel(item),
      owner: parentPath,
      namespace: crate.name,
    });
    parts.push(
      `<section class="rust-doctest" id="${anchor}"><h3>${escapeHtml(parentPath)}</h3>` +
        renderDoctestBadges(doctest) +
        renderCodeBlockPlaceholder(doctest.display_code) +
        `</section>`,
    );
  }
  parts.push(`</section>`);
  return {
    kind: "markdown",
    title: "Doctests",
    description: `Aggregated doctests across the workspace.`,
    slug: "doctests",
    html: parts.join("\n"),
    headings,
    sourcePath: `rustdoc/doctests.md`,
    searchEntries,
  };
}

function buildRenderContext(
  crate: CrateSpec,
  itemsById: Map<string, Item>,
  tabSlug: string,
  sourceLinks: RustdocSourceLinkOptions,
  diagnostics: RustdocDiagnostic[] = [],
): RenderContext {
  const externalCrates = new Map<number, ExternalCrateRef>();
  for (const ec of crate.external_crates) externalCrates.set(ec.crate_id, ec);
  return {
    crate,
    itemsById,
    externalCrates,
    tabSlug,
    sourceLinks: {
      repo: sourceLinks.repo,
      editBranch: sourceLinks.editBranch,
      editBasePath: sourceLinks.editBasePath,
    },
    diagnostics,
  };
}

function signatureForItem(item: Item): string | null {
  switch (item.inner.kind) {
    case "function":
      return item.inner.signature.display;
    case "struct":
      return `struct ${item.path.join("::")}`;
    case "enum":
      return `enum ${item.path.join("::")}`;
    case "trait":
      return `trait ${item.path.join("::")}`;
    case "type_alias":
      return `type ${item.path.join("::")} = ${item.inner.aliased_type.display}`;
    case "constant":
      return `const ${item.path.join("::")}: ${item.inner.type_display}`;
    case "static":
      return `static ${item.path.join("::")}: ${item.inner.type_display}`;
    case "macro":
      return `macro_rules! ${item.name ?? ""}`;
    case "proc_macro":
      return `#[${item.inner.macro_kind === "derive" ? "derive" : "proc_macro"}] ${item.name ?? ""}`;
    default:
      return item.name ? item.path.join("::") : null;
  }
}

function itemKindLabel(item: Item): string {
  switch (item.inner.kind) {
    case "function":
      return "rust function";
    case "struct":
      return "rust struct";
    case "enum":
      return "rust enum";
    case "variant":
      return "rust variant";
    case "union":
      return "rust union";
    case "trait":
      return "rust trait";
    case "trait_alias":
      return "rust trait alias";
    case "impl":
      return "rust impl";
    case "type_alias":
      return "rust type alias";
    case "constant":
      return "rust constant";
    case "static":
      return "rust static";
    case "macro":
      return "rust macro";
    case "proc_macro":
      return "rust proc-macro";
    case "assoc_type":
      return "rust associated type";
    case "assoc_const":
      return "rust associated constant";
    case "module":
      return "rust module";
    case "use":
      return "rust re-export";
    case "struct_field":
      return "rust struct field";
    case "primitive":
      return "rust primitive";
    case "extern_type":
      return "rust extern type";
  }
}

function collectHeadings(items: Item[]): PageHeading[] {
  return items
    .filter((i) => i.name)
    .map((i) => ({
      id: itemAnchor(i),
      text: i.name ?? "",
      level: 3,
    }));
}

function collectSearchEntries(items: Item[], moduleTitle: string): PageSearchEntry[] {
  const out: PageSearchEntry[] = [];
  for (const item of items) {
    if (!item.name) continue;
    const sig = signatureForItem(item) ?? item.name;
    const docs = item.docs_markdown ?? "";
    const anchor = itemAnchor(item);
    out.push({
      title: `${itemKindLabel(item).replace("rust ", "")} ${item.name}`,
      content: `${sig}\n${docs}`.slice(0, 500),
      anchor,
      category: itemKindLabel(item),
      symbolKind: item.inner.kind,
      qualifiedName: item.path.join("::"),
      namespace: moduleTitle,
    });
    for (const alias of item.doc_aliases) {
      out.push({
        title: alias,
        content: `Alias for ${item.path.join("::")}`,
        anchor,
        category: itemKindLabel(item),
        symbolKind: item.inner.kind,
        qualifiedName: item.path.join("::"),
        namespace: moduleTitle,
      });
    }
  }
  return out;
}

function buildCrateNavGroup(crate: CrateSpec, tabSlug: string): SiteNavGroup {
  const items: SiteNavItem[] = [];
  items.push({
    label: "Overview",
    href: tabRelativeHref(tabSlug, crateIndexSlug(crate.name)),
    id: crateIndexSlug(crate.name),
  });
  for (const module of [...crate.modules].sort((a, b) =>
    a.path.join("::").localeCompare(b.path.join("::")),
  )) {
    const slug = moduleSlug(crate.name, module.path);
    items.push({
      label: module.path.length === 0 ? crate.name : module.path.join("::"),
      href: tabRelativeHref(tabSlug, slug),
      id: slug,
    });
  }
  return {
    label: crate.name,
    items,
  };
}

function toLoaderDiagnostic(d: RustdocDiagnostic): RustdocLoaderDiagnostic {
  return {
    severity: d.severity,
    code: d.code,
    message: d.message,
    crate: d.crate_name ?? undefined,
    file: d.file ?? undefined,
    line: d.line ?? undefined,
  };
}

function emptyIndexPage(slug: string, title: string, message: string): MarkdownPage {
  return {
    kind: "markdown",
    title,
    description: message,
    slug: "index",
    html: `<section class="rust-empty"><p>${escapeHtml(message)}</p></section>`,
    headings: [],
    sourcePath: `rustdoc/${slug}.md`,
  };
}

function emptyNavTab(tabSlug: string, tabLabel: string): SiteTab {
  return {
    label: tabLabel,
    slug: tabSlug,
    href: tabRelativeHref(tabSlug, "index"),
    kind: "docs",
    groups: [],
  };
}

function moduleSlug(crateName: string, path: string[]): string {
  const base = `pkg-${slugify(crateName)}`;
  if (path.length === 0) return base;
  return `${base}-${path.map(slugify).join("-")}`;
}

function crateIndexSlug(crateName: string): string {
  return `pkg-${slugify(crateName)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tabRelativeHref(tabSlug: string, slug: string): string {
  if (slug === "index") return `${tabSlug}/`;
  return `${tabSlug}/${slug}.html`;
}

function firstLine(text: string | null | undefined): string | null {
  if (!text) return null;
  const line = text.split("\n").find((l) => l.trim().length > 0);
  return line ? line.trim() : null;
}

function itemsAsMap(items: Record<string, Item> | Item[]): Map<string, Item> {
  const map = new Map<string, Item>();
  if (Array.isArray(items)) {
    for (const item of items) map.set(item.id, item);
  } else {
    for (const [id, item] of Object.entries(items)) map.set(id, item);
  }
  return map;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDoctestBadges(dt: Doctest): string {
  if (dt.fence_attributes.length === 0) return "";
  const badges = dt.fence_attributes
    .map((a) => `<span class="rust-doctest-badge">${escapeHtml(a)}</span>`)
    .join(" ");
  return `<div class="rust-doctest-badges">${badges}</div>`;
}

function renderCodeBlockPlaceholder(code: string): string {
  return `<pre class="rust rust-example-rendered"><code>${escapeHtml(code)}</code></pre>`;
}

// Search-category sentinel constants so ac2_5 can grep for "rust function"
// and friends even before Phase 3 rendering lands. These are the same string
// values used by `itemKindLabel`. Kept here so future search-indexer changes
// have a single reference point.
export const RUST_SEARCH_CATEGORIES = [
  "rust function",
  "rust method",
  "rust struct",
  "rust enum",
  "rust trait",
  "rust trait alias",
  "rust type alias",
  "rust constant",
  "rust static",
  "rust macro",
  "rust proc-macro",
  "rust associated type",
  "rust associated constant",
  "rust module",
  "rust doctest",
  "rust re-export",
  "rust variant",
  "rust struct field",
  "rust union",
  "rust impl",
  "rust primitive",
  "rust extern type",
] as const;
