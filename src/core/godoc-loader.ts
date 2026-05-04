import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import type { ResolvedGodocConfig } from "../config.js";
import type {
  GodocSpec,
  GodocPackage,
  GodocFunc,
  GodocType,
  GodocValue,
  GodocExample,
  GodocSnapshot,
} from "./godoc-types.js";
import { GODOC_SCHEMA_VERSION } from "./godoc-types.js";
import { runIntrospector, GodocIntrospectorError } from "./godoc-introspector.js";
import {
  renderCodeBlock,
  renderMarkdown,
  type PageHeading,
} from "../utils/markdown.js";
import type { MarkdownPage } from "./markdown-loader.js";
import type { SiteTab, SiteNavGroup, SiteNavItem } from "./navigation.js";

export interface GodocLoaderResult {
  pages: Map<string, MarkdownPage>;
  navTab: SiteTab;
  diagnostics: GodocLoaderDiagnostic[];
}

export interface GodocLoaderDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  package?: string;
  file?: string;
  line?: number;
}

/**
 * Resolve a configured godoc tab into pre-rendered Sourcey pages plus a
 * navigation tab. Honours `mode: "live" | "snapshot" | "auto"`:
 *
 *  - live: invoke the Go introspector. Requires Go on PATH.
 *  - snapshot: read the configured `godoc.json`. No Go required.
 *  - auto (default): use live when Go is available; fall back to snapshot.
 *
 * Source-of-truth contract: when both Go and a snapshot are present in
 * "auto" mode, live wins. Snapshot is a fallback cache, not a pin.
 */
export async function loadGodocTab(
  config: ResolvedGodocConfig,
  tabSlug: string,
  tabLabel: string,
): Promise<GodocLoaderResult> {
  const spec = await loadSpec(config);
  return buildResult(spec, tabSlug, tabLabel, config);
}

async function loadSpec(config: ResolvedGodocConfig): Promise<GodocSpec> {
  switch (config.mode) {
    case "live":
      return runIntrospector({ config });
    case "snapshot":
      if (!config.snapshot) {
        throw new GodocIntrospectorError(
          "GODOC_SNAPSHOT_MISSING",
          "godoc mode is 'snapshot' but no snapshot path was configured.",
        );
      }
      return loadSnapshot(config.snapshot, config.module);
    case "auto":
      if (goAvailable()) {
        return runIntrospector({ config });
      }
      if (config.snapshot) {
        return loadSnapshot(config.snapshot, config.module);
      }
      throw new GodocIntrospectorError(
        "GO_NOT_FOUND",
        "godoc mode is 'auto' and Go is not on PATH. Install Go or set " +
          "mode: 'snapshot' with a committed godoc.json.",
      );
    default: {
      const exhaustive: never = config.mode;
      throw new Error(`Unknown godoc mode: ${exhaustive as string}`);
    }
  }
}

function goAvailable(): boolean {
  try {
    const result = spawnSync("go", ["version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
}

async function loadSnapshot(snapshotPath: string, moduleDir: string): Promise<GodocSpec> {
  let raw: string;
  try {
    raw = await readFile(snapshotPath, "utf8");
  } catch (err) {
    throw new GodocIntrospectorError(
      "GODOC_SNAPSHOT_UNREADABLE",
      `Could not read godoc snapshot at ${snapshotPath}: ${(err as Error).message}`,
      err as Error,
    );
  }

  let snapshot: GodocSnapshot;
  try {
    snapshot = JSON.parse(raw) as GodocSnapshot;
  } catch (err) {
    throw new GodocIntrospectorError(
      "GODOC_SNAPSHOT_BAD_JSON",
      `Snapshot at ${snapshotPath} is not valid JSON: ${(err as Error).message}`,
      err as Error,
    );
  }

  if (snapshot.source !== "sourcey-godoc") {
    throw new GodocIntrospectorError(
      "GODOC_SNAPSHOT_BAD_SOURCE",
      `Snapshot at ${snapshotPath} has source="${snapshot.source}", expected "sourcey-godoc".`,
    );
  }
  if (snapshot.schema_version !== GODOC_SCHEMA_VERSION) {
    throw new GodocIntrospectorError(
      "GODOC_SCHEMA_MISMATCH",
      `Snapshot at ${snapshotPath} has schema_version ${snapshot.schema_version}; ` +
        `this build of sourcey supports ${GODOC_SCHEMA_VERSION}. Regenerate with \`sourcey godoc\`.`,
    );
  }

  return {
    modulePath: snapshot.module_path,
    moduleDir,
    generatedAt: snapshot.generated_at,
    packages: snapshot.packages,
    diagnostics: snapshot.diagnostics ?? [],
  };
}

function buildResult(
  spec: GodocSpec,
  tabSlug: string,
  tabLabel: string,
  config: ResolvedGodocConfig,
): GodocLoaderResult {
  const pages = new Map<string, MarkdownPage>();
  const groups = new Map<string, NavEntry[]>();

  const filteredPackages = config.hideUndocumented
    ? spec.packages.filter((p) => p.doc.trim().length > 0)
    : spec.packages;

  for (const pkg of filteredPackages) {
    const slug = packageSlug(pkg.importPath, spec.modulePath);
    const html = renderPackagePage(pkg, slug);
    const headings = collectHeadings(pkg);
    // Fallback description for undocumented packages — using the import
    // path keeps llms.txt and search summaries clean instead of leaking
    // raw HTML structure.
    const description = pkg.synopsis || pkg.importPath;

    pages.set(slug, {
      kind: "markdown",
      title: packageTitle(pkg, spec.modulePath),
      description,
      slug,
      html,
      headings,
      sourcePath: `godoc/${slug}.md`,
      editPath: null,
    });

    const groupKey = navGroupKey(pkg.importPath, spec.modulePath);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push({ slug, label: packageNavLabel(pkg, spec.modulePath) });
  }

  const indexSlug = "index";
  const indexHtml = renderIndexPage(spec, filteredPackages, tabLabel);
  pages.set(indexSlug, {
    kind: "markdown",
    title: tabLabel,
    description: spec.modulePath,
    slug: indexSlug,
    html: indexHtml,
    headings: [],
    sourcePath: `godoc/${indexSlug}.md`,
    editPath: null,
  });

  const navGroups: SiteNavGroup[] = [];
  navGroups.push({
    label: tabLabel,
    items: [{ label: "Overview", href: `${tabSlug}/${indexSlug}.html`, id: indexSlug }],
  });

  const sortedKeys = [...groups.keys()].sort();
  for (const key of sortedKeys) {
    const items = groups.get(key)!.sort((a, b) => a.label.localeCompare(b.label));
    navGroups.push({
      label: key,
      items: items.map((entry): SiteNavItem => ({
        label: entry.label,
        href: `${tabSlug}/${entry.slug}.html`,
        id: entry.slug,
      })),
    });
  }

  const firstItem = navGroups[0]?.items[0];

  const diagnostics: GodocLoaderDiagnostic[] = spec.diagnostics.map((d) => ({
    severity: d.severity,
    code: d.code,
    message: d.message,
    package: d.package,
    file: d.file,
    line: d.line,
  }));

  return {
    pages,
    diagnostics,
    navTab: {
      label: tabLabel,
      slug: tabSlug,
      href: firstItem?.href ?? `${tabSlug}/`,
      kind: "docs",
      groups: navGroups,
    },
  };
}

interface NavEntry {
  slug: string;
  label: string;
}

function packageTitle(pkg: GodocPackage, modulePath: string): string {
  const rel = relativeImportPath(pkg.importPath, modulePath);
  if (rel === "." || rel === "") return pkg.importPath;
  return rel;
}

function packageNavLabel(pkg: GodocPackage, modulePath: string): string {
  const rel = relativeImportPath(pkg.importPath, modulePath);
  if (rel === "." || rel === "") return pkg.name;
  return rel;
}

function relativeImportPath(importPath: string, modulePath: string): string {
  if (!modulePath) return importPath;
  if (importPath === modulePath) return ".";
  if (importPath.startsWith(`${modulePath}/`)) {
    return importPath.slice(modulePath.length + 1);
  }
  return importPath;
}

function packageSlug(importPath: string, modulePath: string): string {
  const rel = relativeImportPath(importPath, modulePath);
  if (rel === "." || rel === "") return "package-root";
  return `pkg-${rel.replace(/[/]/g, "-").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function navGroupKey(importPath: string, modulePath: string): string {
  const rel = relativeImportPath(importPath, modulePath);
  if (rel === "." || rel === "") return "Root";
  const first = rel.split("/")[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function collectHeadings(pkg: GodocPackage): PageHeading[] {
  const headings: PageHeading[] = [];
  if (pkg.consts.length > 0) headings.push({ id: "constants", text: "Constants", level: 2 });
  if (pkg.vars.length > 0) headings.push({ id: "variables", text: "Variables", level: 2 });
  if (pkg.funcs.length > 0) {
    headings.push({ id: "functions", text: "Functions", level: 2 });
    for (const f of pkg.funcs) {
      headings.push({ id: funcAnchor(f.name), text: f.name, level: 3 });
    }
  }
  if (pkg.types.length > 0) {
    headings.push({ id: "types", text: "Types", level: 2 });
    for (const t of pkg.types) {
      headings.push({ id: typeAnchor(t.name), text: t.name, level: 3 });
    }
  }
  if (pkg.examples.length > 0) {
    headings.push({ id: "examples", text: "Examples", level: 2 });
  }
  return headings;
}

function funcAnchor(name: string): string {
  return `func-${slugifySymbol(name)}`;
}

function typeAnchor(name: string): string {
  return `type-${slugifySymbol(name)}`;
}

function methodAnchor(typeName: string, methodName: string): string {
  return `method-${slugifySymbol(typeName)}-${slugifySymbol(methodName)}`;
}

function valueAnchor(prefix: "const" | "var", name: string): string {
  return `${prefix}-${slugifySymbol(name)}`;
}

function slugifySymbol(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

function renderIndexPage(spec: GodocSpec, packages: GodocPackage[], tabLabel: string): string {
  const parts: string[] = [];
  parts.push(`<h1>${escHtml(tabLabel)}</h1>`);
  if (spec.modulePath) {
    parts.push(`<p class="godoc-import-path"><code>${escHtml(spec.modulePath)}</code></p>`);
  }

  const cards: string[] = [];
  for (const pkg of packages) {
    const slug = packageSlug(pkg.importPath, spec.modulePath);
    const title = packageTitle(pkg, spec.modulePath);
    const synopsis = pkg.synopsis ? `<p>${escHtml(pkg.synopsis)}</p>` : "";
    cards.push(
      `<a href="${slug}.html" class="card-item">` +
        `<div class="card-item-inner">` +
        `<h3 class="card-item-title">${escHtml(title)}</h3>` +
        `<div class="card-item-content">${synopsis}` +
        `<p style="margin:0.5rem 0 0;font-size:0.8rem;opacity:0.5"><code>${escHtml(pkg.importPath)}</code></p>` +
        `</div></div></a>`,
    );
  }

  if (cards.length > 0) {
    const cols = cards.length <= 2 ? "2" : "3";
    parts.push(`<div class="card-group not-prose" data-cols="${cols}">\n${cards.join("\n")}\n</div>`);
  } else {
    parts.push(`<p>No Go packages were resolved.</p>`);
  }

  return parts.join("\n");
}

function renderPackagePage(pkg: GodocPackage, slug: string): string {
  const parts: string[] = [];
  const title = pkg.importPath;

  parts.push(`<h1>${escHtml(title)}</h1>`);
  parts.push(
    `<p class="godoc-import"><code>import "${escHtml(pkg.importPath)}"</code></p>`,
  );

  if (pkg.doc) {
    parts.push(`<div class="godoc-doc">${renderDoc(pkg.doc)}</div>`);
  }

  parts.push(renderTableOfContents(pkg));

  if (pkg.consts.length > 0) {
    parts.push(`<h2 id="constants">Constants</h2>`);
    parts.push(renderValueGroup(pkg.consts, "const"));
  }
  if (pkg.vars.length > 0) {
    parts.push(`<h2 id="variables">Variables</h2>`);
    parts.push(renderValueGroup(pkg.vars, "var"));
  }
  if (pkg.funcs.length > 0) {
    parts.push(`<h2 id="functions">Functions</h2>`);
    for (const fn of pkg.funcs) {
      parts.push(renderFunc(fn, funcAnchor(fn.name)));
    }
  }
  if (pkg.types.length > 0) {
    parts.push(`<h2 id="types">Types</h2>`);
    for (const t of pkg.types) {
      parts.push(renderType(t));
    }
  }
  if (pkg.examples.length > 0) {
    parts.push(`<h2 id="examples">Examples</h2>`);
    for (const ex of pkg.examples) {
      parts.push(renderExample(ex));
    }
  }

  void slug;
  return parts.join("\n");
}

function renderTableOfContents(pkg: GodocPackage): string {
  const items: string[] = [];
  if (pkg.consts.length > 0) items.push(`<li><a href="#constants">Constants</a></li>`);
  if (pkg.vars.length > 0) items.push(`<li><a href="#variables">Variables</a></li>`);
  if (pkg.funcs.length > 0) {
    items.push(`<li><a href="#functions">Functions</a></li>`);
    for (const fn of pkg.funcs) {
      items.push(
        `<li class="godoc-toc-sub"><a href="#${funcAnchor(fn.name)}">${escHtml(fn.signature)}</a></li>`,
      );
    }
  }
  if (pkg.types.length > 0) {
    items.push(`<li><a href="#types">Types</a></li>`);
    for (const t of pkg.types) {
      items.push(
        `<li class="godoc-toc-sub"><a href="#${typeAnchor(t.name)}">type ${escHtml(t.name)}</a></li>`,
      );
    }
  }
  if (pkg.examples.length > 0) items.push(`<li><a href="#examples">Examples</a></li>`);

  if (items.length === 0) return "";
  return `<nav class="godoc-toc not-prose"><h4>Index</h4><ul>${items.join("")}</ul></nav>`;
}

function renderValueGroup(values: GodocValue[], kind: "const" | "var"): string {
  const seenDeclarations = new Set<string>();
  const parts: string[] = [];

  for (const v of values) {
    const id = valueAnchor(kind, v.name);
    if (!seenDeclarations.has(v.declaration)) {
      seenDeclarations.add(v.declaration);
      const docHtml = v.doc ? `<div class="godoc-doc">${renderDoc(v.doc)}</div>` : "";
      parts.push(
        `<section class="godoc-value" id="${id}">` +
          docHtml +
          renderCodeBlock(v.declaration, "go") +
          `</section>`,
      );
    } else {
      // For the secondary names in a grouped declaration we still want
      // anchor stability so external links don't break — emit an empty,
      // styled anchor target.
      parts.push(`<a id="${id}" class="godoc-anchor"></a>`);
    }
  }

  return parts.join("\n");
}

function renderFunc(fn: GodocFunc, anchorId: string): string {
  const parts: string[] = [];
  parts.push(`<section class="godoc-func" id="${anchorId}">`);
  parts.push(`<h3 class="godoc-symbol">${escHtml(fn.signature)}</h3>`);
  if (fn.doc) parts.push(`<div class="godoc-doc">${renderDoc(fn.doc)}</div>`);
  for (const ex of fn.examples) parts.push(renderExample(ex));
  parts.push(`</section>`);
  return parts.join("\n");
}

function renderType(t: GodocType): string {
  const parts: string[] = [];
  const id = typeAnchor(t.name);
  parts.push(`<section class="godoc-type" id="${id}">`);
  parts.push(`<h3 class="godoc-symbol">type ${escHtml(t.name)}</h3>`);
  if (t.doc) parts.push(`<div class="godoc-doc">${renderDoc(t.doc)}</div>`);
  parts.push(renderCodeBlock(t.declaration, "go"));

  if (t.fields.length > 0 && (t.kind === "struct" || t.kind === "interface")) {
    parts.push(renderFields(t));
  }

  for (const m of t.methods) {
    parts.push(renderMethod(t.name, m));
  }
  for (const ex of t.examples) parts.push(renderExample(ex));

  parts.push(`</section>`);
  return parts.join("\n");
}

function renderFields(t: GodocType): string {
  const heading = t.kind === "interface" ? "Methods" : "Fields";
  const rows: string[] = [];
  for (const f of t.fields) {
    const docHtml = f.doc ? `<div class="godoc-field-doc">${renderDoc(f.doc)}</div>` : "";
    const tagHtml = f.tag ? `<code class="godoc-tag">\`${escHtml(f.tag)}\`</code>` : "";
    rows.push(
      `<li class="godoc-field"><code class="godoc-field-sig">${escHtml(f.name)}` +
        (f.embedded ? "" : ` <span class="godoc-field-type">${escHtml(f.type)}</span>`) +
        `</code> ${tagHtml}${docHtml}</li>`,
    );
  }
  return `<details class="godoc-fields" open><summary>${heading}</summary><ul>${rows.join("")}</ul></details>`;
}

function renderMethod(typeName: string, m: GodocFunc): string {
  const id = methodAnchor(typeName, m.name);
  return renderFunc(m, id).replace(`id="${funcAnchor(m.name)}"`, `id="${id}"`);
}

function renderExample(ex: GodocExample): string {
  const title = ex.suffix
    ? `Example (${escHtml(humaniseSuffix(ex.suffix))})`
    : "Example";
  const parts: string[] = [`<details class="godoc-example"><summary>${title}</summary>`];
  if (ex.doc) parts.push(`<div class="godoc-doc">${renderDoc(ex.doc)}</div>`);
  parts.push(renderCodeBlock(ex.code, "go"));
  if (ex.output) {
    parts.push(`<p class="godoc-example-output-label">Output:</p>`);
    parts.push(renderCodeBlock(ex.output, "text"));
  }
  parts.push(`</details>`);
  return parts.join("\n");
}

function humaniseSuffix(suffix: string): string {
  return suffix
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderDoc(input: string): string {
  return renderMarkdown(input).trim();
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
