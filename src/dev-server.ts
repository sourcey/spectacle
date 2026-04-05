import { createServer as createViteServer, type InlineConfig, type ViteDevServer } from "vite";
import { resolve, dirname, extname, basename, relative } from "node:path";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig, resolveConfigFromRaw, tabPath } from "./config.js";
import type { ResolvedConfig, ResolvedTab } from "./config.js";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { normalizeMcpSpec } from "./core/mcp-normalizer.js";
import { buildNavFromSpec, buildNavFromPages, buildSiteNavigation, withActivePage } from "./core/navigation.js";
import type { SiteTab } from "./core/navigation.js";
import type { NormalizedSpec } from "./core/types.js";
import type { CurrentPage, RenderOptions, SiteConfig } from "./renderer/context.js";
import { loadMarkdownPage, slugFromPath } from "./core/markdown-loader.js";
import type { MarkdownPage } from "./core/markdown-loader.js";
import { loadDoxygenTab } from "./core/doxygen-loader.js";
import { buildSearchIndex } from "./core/search-indexer.js";
import { sourceyPlugin } from "./vite-plugin.js";
import tailwindcss from "@tailwindcss/vite";
import preact from "@preact/preset-vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

function log(msg: string): void {
  const t = new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`  \x1b[2m${t}\x1b[0m ${msg}`);
}

function shortPath(p: string): string {
  return relative(process.cwd(), p) || basename(p);
}

export interface DevServerOptions {
  port: number;
}

export async function startDevServer(options: DevServerOptions): Promise<void> {
  const { port } = options;
  const configPath = resolve(process.cwd(), "sourcey.config.ts");
  let config = await loadConfig();

  // Collect watch paths
  const watchPaths: string[] = [configPath];
  for (const tab of config.tabs) {
    if (tab.openapi) watchPaths.push(tab.openapi);
    if (tab.mcp) watchPaths.push(tab.mcp);
    if (tab.doxygen) watchPaths.push(tab.doxygen.xml);
    if (tab.groups) {
      for (const group of tab.groups) {
        for (const rp of group.pages) {
          watchPaths.push(rp.file);
        }
      }
    }
  }

  // Reverse map: resolved file path → content kind. Used by the watcher to
  // route file changes to the correct incremental rebuild. Rebuilt when config
  // changes so newly added pages/specs/doxygen tabs are picked up.
  type ContentKind =
    | { kind: "markdown"; tabSlug: string; pagePath: string; pageSlug: string }
    | { kind: "doxygen"; tabSlug: string; xmlDir: string }
    | { kind: "openapi"; tabSlug: string; specPath: string }
    | { kind: "mcp"; tabSlug: string; specPath: string }
    | { kind: "config" };

  function buildFileToContent(cfg: ResolvedConfig): Map<string, ContentKind> {
    const map = new Map<string, ContentKind>();
    map.set(configPath, { kind: "config" });
    for (const tab of cfg.tabs) {
      if (tab.openapi) {
        map.set(resolve(tab.openapi), { kind: "openapi", tabSlug: tab.slug, specPath: tab.openapi });
      }
      if (tab.mcp) {
        map.set(resolve(tab.mcp), { kind: "mcp", tabSlug: tab.slug, specPath: tab.mcp });
      }
      if (tab.doxygen) {
        map.set(resolve(tab.doxygen.xml), { kind: "doxygen", tabSlug: tab.slug, xmlDir: tab.doxygen.xml });
      }
      if (tab.groups) {
        for (const group of tab.groups) {
          for (const rp of group.pages) {
            map.set(resolve(rp.file), { kind: "markdown", tabSlug: tab.slug, pagePath: rp.file, pageSlug: rp.slug });
          }
        }
      }
    }
    return map;
  }

  let fileToContent = buildFileToContent(config);

  // Resolve source paths for Vite dev serving.
  // Prefer src/ (local dev) but fall back to dist/ (npm install).
  const projectRoot = resolve(__dirname, "..");
  const hasSrc = await exists(resolve(projectRoot, "src/client/index.ts"));
  const tailwindCssPath = resolve(projectRoot, hasSrc ? "src/themes/default/main.css" : "dist/themes/default/main.css");
  const sourceyCssPath = resolve(projectRoot, hasSrc ? "src/themes/default/sourcey.css" : "dist/themes/default/sourcey.css");
  const clientEntry = resolve(projectRoot, hasSrc ? "src/client/index.ts" : "dist/client/index.js");
  const ssrRendererPath = resolve(projectRoot, hasSrc ? "src/renderer/static-renderer.ts" : "dist/renderer/static-renderer.js");

  let vite: ViteDevServer;

  // ---------------------------------------------------------------------------
  // Incremental site data cache.
  //
  // The cache stores the assembled site data + site config. On file change the
  // watcher identifies *what* changed and patches only that piece:
  //   - .md change  → reload that single markdown page, patch into pageMap
  //   - .xml change → re-run moxygen for that doxygen tab only
  //   - spec change → re-parse that single spec
  //   - config      → full rebuild (tab structure may have changed)
  //
  // Navigation is reassembled from cached tab data (cheap, no I/O).
  // ---------------------------------------------------------------------------
  interface CachedSite {
    data: Awaited<ReturnType<typeof loadSiteData>>;
    siteConfig: SiteConfig;
  }
  let cache: CachedSite | null = null;
  let cachePromise: Promise<CachedSite> | null = null;

  function fullRebuild(): Promise<CachedSite> {
    if (!cachePromise) {
      const start = performance.now();
      log("building site data...");
      cachePromise = (async () => {
        const data = await loadSiteData(config.tabs);
        const siteConfig = await buildSiteConfig(config);
        const result: CachedSite = { data, siteConfig };
        cache = result;
        cachePromise = null;
        const ms = Math.round(performance.now() - start);
        log(`ready \x1b[2m(${data.pageMap.size} pages in ${ms}ms)\x1b[0m`);
        return result;
      })().catch((err) => {
        cachePromise = null;
        throw err;
      });
    }
    return cachePromise;
  }

  function getCached(): Promise<CachedSite> {
    if (cache) return Promise.resolve(cache);
    return fullRebuild();
  }

  // Incremental patch: reload only the piece that changed, then reassemble
  // siteTabs + pageMap from the patched data. Falls back to full rebuild if
  // the cache isn't warm yet.
  async function incrementalUpdate(content: ContentKind): Promise<void> {
    // Capture current cache; if a full rebuild replaces it while we await,
    // we abandon this patch (the rebuild already produced fresh data).
    const snapshot = cache;
    if (!snapshot) {
      await fullRebuild();
      return;
    }

    const { data } = snapshot;

    const start = performance.now();

    if (content.kind === "markdown") {
      const slug = slugFromPath(content.pageSlug);
      log(`reloading ${shortPath(content.pagePath)}`);
      const page = await loadMarkdownPage(content.pagePath, slug);
      if (cache !== snapshot) return;

      const pageKey = tabPath(content.tabSlug, `${slug}.html`);
      const existing = data.pageMap.get(pageKey);
      if (existing) {
        existing.currentPage = { kind: "markdown", markdown: page };
      }
      rebuildTabNav(data, config.tabs, content.tabSlug);
    } else if (content.kind === "doxygen") {
      const tab = config.tabs.find((t) => t.slug === content.tabSlug);
      if (!tab?.doxygen) return;

      log(`rebuilding doxygen tab "${tab.label}"`);
      const { pages, navTab } = await loadDoxygenTab(tab.doxygen, tab.slug, tab.label);
      if (cache !== snapshot) return;

      for (const [key, entry] of data.pageMap) {
        if (entry.tabSlug === content.tabSlug) data.pageMap.delete(key);
      }
      for (const [slug, page] of pages) {
        data.pageMap.set(tabPath(tab.slug, `${slug}.html`), {
          spec: data.primarySpec,
          currentPage: { kind: "markdown", markdown: page },
          tabSlug: tab.slug,
          pageSlug: slug,
        });
      }
      const idx = data.siteTabs.findIndex((t) => t.slug === content.tabSlug);
      if (idx !== -1) data.siteTabs[idx] = navTab;
      else data.siteTabs.push(navTab);
    } else if (content.kind === "openapi") {
      log(`reparsing spec ${shortPath(content.specPath)}`);
      const loaded = await loadSpec(content.specPath);
      const parsed = await parseSpec(loaded);
      const openapi3 = await convertToOpenApi3(parsed);
      const spec = normalizeSpec(openapi3);
      if (cache !== snapshot) return;

      data.specsBySlug.set(content.tabSlug, spec);

      const pageKey = tabPath(content.tabSlug, "index.html");
      const existing = data.pageMap.get(pageKey);
      if (existing) {
        existing.currentPage = { kind: "spec", spec };
        existing.spec = spec;
      }
      const tab = config.tabs.find((t) => t.slug === content.tabSlug);
      if (tab) {
        const navTab = buildNavFromSpec(spec, tab.slug);
        navTab.label = tab.label;
        const idx = data.siteTabs.findIndex((t) => t.slug === content.tabSlug);
        if (idx !== -1) data.siteTabs[idx] = navTab;
      }
    } else if (content.kind === "mcp") {
      log(`reparsing mcp spec ${shortPath(content.specPath)}`);
      const { parse } = await import("mcp-parser");
      const mcpSpec = await parse(content.specPath);
      const spec = normalizeMcpSpec(mcpSpec);
      if (cache !== snapshot) return;

      data.specsBySlug.set(content.tabSlug, spec);

      const pageKey = tabPath(content.tabSlug, "index.html");
      const existing = data.pageMap.get(pageKey);
      if (existing) {
        existing.currentPage = { kind: "spec", spec };
        existing.spec = spec;
      }
      const tab = config.tabs.find((t) => t.slug === content.tabSlug);
      if (tab) {
        const navTab = buildNavFromSpec(spec, tab.slug);
        navTab.label = tab.label;
        const idx = data.siteTabs.findIndex((t) => t.slug === content.tabSlug);
        if (idx !== -1) data.siteTabs[idx] = navTab;
      }
    }

    const ms = Math.round(performance.now() - start);
    log(`updated \x1b[2m(${ms}ms)\x1b[0m`);
  }

  // Rebuild navigation for a single markdown tab from cached page data
  function rebuildTabNav(
    data: CachedSite["data"],
    tabs: ResolvedTab[],
    tabSlug: string,
  ): void {
    const tab = tabs.find((t) => t.slug === tabSlug);
    if (!tab?.groups) return;

    const pagesByPath = new Map<string, MarkdownPage>();
    for (const group of tab.groups) {
      for (const rp of group.pages) {
        const slug = slugFromPath(rp.slug);
        const pageKey = tabPath(tab.slug, `${slug}.html`);
        const entry = data.pageMap.get(pageKey);
        if (entry?.currentPage.kind === "markdown") {
          pagesByPath.set(rp.slug, entry.currentPage.markdown!);
        }
      }
    }

    const navTab = buildNavFromPages(tab, pagesByPath);
    const idx = data.siteTabs.findIndex((t) => t.slug === tabSlug);
    if (idx !== -1) data.siteTabs[idx] = navTab;
  }

  // Reload config through Vite SSR (bypasses Node's module cache)
  async function reloadConfig(): Promise<ResolvedConfig> {
    const configMod = await vite.ssrLoadModule(configPath);
    return resolveConfigFromRaw(configMod.default, process.cwd());
  }

  async function render(url: string): Promise<string | null> {
    // Load renderer through Vite's SSR graph so invalidateAll() picks up
    // component changes. Site data uses static imports (file reads only).
    const { renderPage } = await vite.ssrLoadModule(ssrRendererPath) as {
      renderPage: typeof import("./renderer/static-renderer.js").renderPage;
    };

    const { data, siteConfig: site } = await getCached();
    const { siteTabs, pageMap } = data;
    const navigation = buildSiteNavigation(siteTabs);

    let pagePath = url.replace(/^\//, "").replace(/\/$/, "");
    if (!pagePath || pagePath === "index.html") {
      const firstKey = pageMap.keys().next().value;
      if (!firstKey) return null;
      pagePath = firstKey;
    }
    if (!pagePath.endsWith(".html")) {
      pagePath += "/index.html";
    }

    const pageData = pageMap.get(pagePath);
    if (!pageData) return null;

    const activeNav = withActivePage(navigation, pageData.tabSlug, pageData.pageSlug);
    const renderOptions: RenderOptions = { embeddable: false, assetBase: "/" };

    let html = renderPage(pageData.spec, renderOptions, activeNav, pageData.currentPage, site);

    // Rewrite asset paths for Vite HMR
    // Preact outputs <link ... href="/sourcey.css"/> (no space before />)
    html = html.replace(
      /<link rel="stylesheet" href="[^"]*sourcey\.css"\s*\/?>/,
      `<link rel="stylesheet" href="/@fs${tailwindCssPath}" />\n<link rel="stylesheet" href="/@fs${sourceyCssPath}?direct" />`
    );
    html = html.replace(
      /<script src="[^"]*sourcey\.js"[^>]*><\/script>/,
      `<script type="module" src="/@fs${clientEntry}"></script>`
    );
    html = html.replace(
      /<script src="[^"]*sourcey\.js"\s*\/?>/,
      `<script type="module" src="/@fs${clientEntry}"></script>`
    );

    return html;
  }

  async function buildSearchIndexForDev(): Promise<string> {
    const { data: { siteTabs, pageMap, specsBySlug } } = await getCached();
    const navigation = buildSiteNavigation(siteTabs);

    const markdownPagesByTab = new Map<string, MarkdownPage[]>();
    for (const tab of config.tabs) {
      if (tab.groups || tab.doxygen) {
        const tabPages: MarkdownPage[] = [];
        for (const [, entry] of pageMap) {
          if (entry.tabSlug === tab.slug && entry.currentPage.kind === "markdown") {
            tabPages.push(entry.currentPage.markdown!);
          }
        }
        markdownPagesByTab.set(tab.slug, tabPages);
      }
    }

    return buildSearchIndex(specsBySlug, markdownPagesByTab, navigation, "/", config.search.featured);
  }

  const viteConfig: InlineConfig = {
    root: process.cwd(),
    server: {
      port,
      strictPort: true,
      hmr: true,
      fs: {
        allow: [process.cwd(), projectRoot],
      },
    },
    plugins: [
      preact(),
      tailwindcss(),
      sourceyPlugin({
        watchPaths,
        render,
        searchIndex: buildSearchIndexForDev,
      }),
    ],
    clearScreen: false,
    logLevel: "warn",
    optimizeDeps: {
      exclude: ["sourcey"],
    },
  };

  vite = await createViteServer(viteConfig);

  // Incremental rebuild when content files change
  vite.watcher.on("change", async (file) => {
    // Check direct match first (markdown pages, spec files, config)
    let content = fileToContent.get(file);

    // For .xml files inside a doxygen directory, map to the parent tab
    if (!content && extname(file) === ".xml") {
      for (const [, c] of fileToContent) {
        if (c.kind === "doxygen" && file.startsWith(resolve(c.xmlDir))) {
          content = c;
          break;
        }
      }
    }

    if (!content) return;

    if (content.kind === "config") {
      log("config changed, reloading...");
      config = await reloadConfig();
      fileToContent = buildFileToContent(config);
      for (const path of fileToContent.keys()) {
        vite.watcher.add(path);
      }
      cache = null;
      cachePromise = null;
      fullRebuild().catch((err) => {
        console.error("  Site data rebuild failed:", err.message);
      });
    } else {
      incrementalUpdate(content).catch((err) => {
        console.error("  Incremental update failed:", err.message);
      });
    }
  });

  await vite.listen();

  console.log(`\n  Sourcey dev server running at http://localhost:${port}`);
  console.log(`  Watching: ${watchPaths.length} content file${watchPaths.length === 1 ? "" : "s"} + components + CSS (HMR)`);
  console.log(`  Press Ctrl+C to stop\n`);

  // Build in background — server is listening, first request waits for this
  fullRebuild().catch((err) => {
    console.error("  Initial site data build failed:", err.message);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PageMapEntry {
  spec: NormalizedSpec;
  currentPage: CurrentPage;
  tabSlug: string;
  pageSlug: string;
}

async function loadSiteData(tabs: ResolvedTab[]) {
  const specsBySlug = new Map<string, NormalizedSpec>();
  const siteTabs: SiteTab[] = [];
  const pageMap = new Map<string, PageMapEntry>();

  for (const tab of tabs) {
    if (tab.openapi) {
      const loaded = await loadSpec(tab.openapi);
      const parsed = await parseSpec(loaded);
      const openapi3 = await convertToOpenApi3(parsed);
      const spec = normalizeSpec(openapi3);
      specsBySlug.set(tab.slug, spec);
    } else if (tab.mcp) {
      const { parse } = await import("mcp-parser");
      const mcpSpec = await parse(tab.mcp);
      const spec = normalizeMcpSpec(mcpSpec);
      specsBySlug.set(tab.slug, spec);
    }
  }

  const primarySpec: NormalizedSpec = specsBySlug.values().next().value ?? {
    info: { title: "", version: "", description: "" },
    servers: [], tags: [], operations: [], schemas: {}, securitySchemes: {}, webhooks: [],
  };

  for (const tab of tabs) {
    if (tab.openapi || tab.mcp) {
      const spec = specsBySlug.get(tab.slug)!;
      const navTab = buildNavFromSpec(spec, tab.slug);
      navTab.label = tab.label;
      siteTabs.push(navTab);

      pageMap.set(tabPath(tab.slug, "index.html"), {
        spec,
        currentPage: { kind: "spec", spec },
        tabSlug: tab.slug,
        pageSlug: "introduction",
      });
    } else if (tab.doxygen) {
      const { pages, navTab } = await loadDoxygenTab(tab.doxygen, tab.slug, tab.label);

      for (const [slug, page] of pages) {
        pageMap.set(tabPath(tab.slug, `${slug}.html`), {
          spec: primarySpec,
          currentPage: { kind: "markdown", markdown: page },
          tabSlug: tab.slug,
          pageSlug: slug,
        });
      }

      siteTabs.push(navTab);
    } else if (tab.groups) {
      const pagesByPath = new Map<string, MarkdownPage>();

      for (const group of tab.groups) {
        for (const rp of group.pages) {
          const slug = slugFromPath(rp.slug);
          const page = await loadMarkdownPage(rp.file, slug);
          pagesByPath.set(rp.slug, page);

          pageMap.set(tabPath(tab.slug, `${slug}.html`), {
            spec: primarySpec,
            currentPage: { kind: "markdown", markdown: page },
            tabSlug: tab.slug,
            pageSlug: slug,
          });
        }
      }

      const navTab = buildNavFromPages(tab, pagesByPath);
      siteTabs.push(navTab);
    }
  }

  return { siteTabs, primarySpec, pageMap, specsBySlug };
}

async function buildSiteConfig(config: ResolvedConfig): Promise<SiteConfig> {
  const logo = config.logo
    ? {
        light: await resolveAssetUrl(config.logo.light ?? ""),
        dark: config.logo.dark ? await resolveAssetUrl(config.logo.dark) : undefined,
        href: config.logo.href,
      }
    : undefined;

  const customCSS = await loadCustomCSS(config.theme.css);

  return {
    name: config.name,
    theme: config.theme,
    logo: logo?.light ? logo : undefined,
    favicon: config.favicon ? await resolveAssetUrl(config.favicon) : undefined,
    repo: config.repo,
    editBranch: config.editBranch,
    editBasePath: config.editBasePath,
    codeSamples: config.codeSamples,
    navbar: config.navbar,
    footer: config.footer,
    customCSS: customCSS || undefined,
  };
}

async function loadCustomCSS(paths: string[]): Promise<string> {
  const parts: string[] = [];
  for (const p of paths) {
    parts.push(await readFile(p, "utf-8"));
  }
  return parts.join("\n");
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".ico": "image/x-icon",
};

async function resolveAssetUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl || pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  const abs = resolve(pathOrUrl);
  const ext = extname(abs).toLowerCase();
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";
  const data = await readFile(abs);
  return `data:${mime};base64,${data.toString("base64")}`;
}
