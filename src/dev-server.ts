import { createServer as createViteServer, type InlineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, isMultiPageConfig } from "./config.js";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { renderSpec, renderPage } from "./renderer/static-renderer.js";
import { buildNavFromSpec, buildNavFromPages, buildSiteNavigation, withActivePage } from "./core/navigation.js";
import type { SiteTab } from "./core/navigation.js";
import type { NormalizedSpec } from "./core/types.js";
import type { CurrentPage, RenderOptions } from "./renderer/context.js";
import { loadMarkdownPage, slugFromPath } from "./core/markdown-loader.js";
import type { MarkdownPage } from "./core/markdown-loader.js";
import { buildSearchIndex } from "./core/search-indexer.js";
import { spectaclePlugin } from "./vite/watcher-plugin.js";
import type { SpectacleConfig, NavigationTab } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DevServerOptions {
  specSource?: string;
  outputDir: string;
  port: number;
  logo?: string;
  favicon?: string;
  themeOverrides?: Record<string, string>;
}

/**
 * Start a Vite-powered dev server for Spectacle.
 *
 * In multi-page mode: renders each page on-the-fly via SSR.
 * In legacy mode: renders the single spec page.
 * CSS is served by Vite with native HMR (no page reload for CSS changes).
 * Client JS is served by Vite with module imports.
 * Spec/markdown changes trigger full page reload.
 */
export async function startDevServer(options: DevServerOptions): Promise<void> {
  const { specSource, port, logo, favicon } = options;

  const config = await loadConfig();
  const multiPage = !specSource && isMultiPageConfig(config);

  // Collect watch paths for the plugin
  const watchPaths: string[] = [];
  if (multiPage) {
    for (const tab of config.navigation!) {
      if (tab.spec) watchPaths.push(resolve(tab.spec));
      if (tab.groups) {
        for (const group of tab.groups) {
          for (const pagePath of group.pages) {
            watchPaths.push(resolve(pagePath));
          }
        }
      }
    }
  } else if (specSource) {
    watchPaths.push(resolve(specSource));
  }

  // Resolve paths relative to project root (not dist/) for Vite dev serving
  // __dirname at runtime is dist/, but Vite needs the source files
  const projectRoot = resolve(__dirname, "..");
  const cssPath = resolve(projectRoot, "src/themes/default/spectacle.css");
  const clientEntry = resolve(projectRoot, "src/client/index.ts");

  // SSR render function: given a URL, return full HTML
  async function render(url: string): Promise<string | null> {
    let html: string | null = null;

    if (multiPage) {
      html = await renderMultiPage(url, config, { logo, favicon });
    } else if (specSource) {
      html = await renderLegacy(specSource, { logo, favicon });
    }

    if (!html) return null;

    // Rewrite asset paths: CSS via Vite (HMR), JS as ES module
    html = html.replace(
      /<link rel="stylesheet" href="[^"]*spectacle\.css"[^>]*\/>/,
      `<link rel="stylesheet" href="/@fs${cssPath}" />`
    );
    html = html.replace(
      /<script src="[^"]*spectacle\.js"[^>]*><\/script>/,
      `<script type="module" src="/@fs${clientEntry}"></script>`
    );
    html = html.replace(
      /<script src="[^"]*spectacle\.js"[^>]*\/>/,
      `<script type="module" src="/@fs${clientEntry}"></script>`
    );

    return html;
  }

  const viteConfig: InlineConfig = {
    root: process.cwd(),
    server: {
      port,
      strictPort: true,
      hmr: true,
    },
    plugins: [
      spectaclePlugin({
        watchPaths,
        render,
        searchIndex: multiPage
          ? () => buildSearchIndexForDev(config, { logo, favicon })
          : undefined,
      }),
    ],
    clearScreen: false,
    logLevel: "warn",
    optimizeDeps: {
      exclude: ["spectacle"],
    },
  };

  const vite = await createViteServer(viteConfig);
  await vite.listen();

  console.log(`\n  Spectacle dev server running at http://localhost:${port}`);
  console.log(`  Watching: ${watchPaths.length} content file${watchPaths.length === 1 ? "" : "s"} + CSS (HMR)`);
  console.log(`  Press Ctrl+C to stop\n`);
}

// ---------------------------------------------------------------------------
// Legacy single-spec rendering
// ---------------------------------------------------------------------------

async function renderLegacy(
  specSource: string,
  branding: { logo?: string; favicon?: string },
): Promise<string> {
  const loaded = await loadSpec(resolve(specSource));
  const parsed = await parseSpec(loaded);
  const openapi3 = await convertToOpenApi3(parsed);
  const spec = normalizeSpec(openapi3);

  if (branding.logo) spec.info.logo = branding.logo;
  if (branding.favicon) spec.info.favicon = branding.favicon;

  const options: RenderOptions = { embeddable: false, singleFile: false, assetBase: "" };
  return `<!DOCTYPE html>\n${renderSpec(spec, options)}`;
}

// ---------------------------------------------------------------------------
// Multi-page rendering
// ---------------------------------------------------------------------------

async function renderMultiPage(
  url: string,
  config: SpectacleConfig,
  branding: { logo?: string; favicon?: string },
): Promise<string | null> {
  const tabs = config.navigation!;
  const configDir = process.cwd();

  // Build the full site data (specs, pages, navigation)
  const { siteTabs, primarySpec, pageMap } = await loadSiteData(tabs, configDir, config, branding);
  const navigation = buildSiteNavigation(siteTabs);

  // Normalise URL to match page keys
  let pagePath = url.replace(/^\//, "").replace(/\/$/, "");
  if (!pagePath || pagePath === "index.html") {
    // Redirect to first page
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
  const options: RenderOptions = { embeddable: false, singleFile: false, assetBase: "/" };

  const html = renderPage(pageData.spec, options, activeNav, pageData.currentPage);
  return `<!DOCTYPE html>\n${html}`;
}

interface PageMapEntry {
  spec: NormalizedSpec;
  currentPage: CurrentPage;
  tabSlug: string;
  pageSlug: string;
}

async function loadSiteData(
  tabs: NavigationTab[],
  configDir: string,
  config: SpectacleConfig,
  branding: { logo?: string; favicon?: string },
) {
  const specsBySlug = new Map<string, NormalizedSpec>();
  const siteTabs: SiteTab[] = [];
  const pageMap = new Map<string, PageMapEntry>();

  // Load specs
  for (const tabConfig of tabs) {
    if (!tabConfig.spec) continue;
    const specPath = resolve(configDir, tabConfig.spec);
    const loaded = await loadSpec(specPath);
    const parsed = await parseSpec(loaded);
    const openapi3 = await convertToOpenApi3(parsed);
    const spec = normalizeSpec(openapi3);
    if (branding.logo) spec.info.logo = branding.logo;
    if (branding.favicon) spec.info.favicon = branding.favicon;
    if (config.logo) spec.info.logo = config.logo;
    if (config.favicon) spec.info.favicon = config.favicon;
    specsBySlug.set(tabConfig.slug, spec);
  }

  const primarySpec: NormalizedSpec = specsBySlug.values().next().value ?? {
    info: { title: "", version: "", description: "", logo: config.logo, favicon: config.favicon },
    servers: [], tags: [], operations: [], schemas: {}, securitySchemes: {}, webhooks: [],
  };

  // Process all tabs
  for (const tabConfig of tabs) {
    if (tabConfig.spec) {
      const spec = specsBySlug.get(tabConfig.slug)!;
      const tab = buildNavFromSpec(spec, tabConfig.slug);
      tab.label = tabConfig.label;
      siteTabs.push(tab);

      pageMap.set(`${tabConfig.slug}/index.html`, {
        spec,
        currentPage: { kind: "spec", spec },
        tabSlug: tabConfig.slug,
        pageSlug: "introduction",
      });
    } else if (tabConfig.groups) {
      const pagesByPath = new Map<string, MarkdownPage>();

      for (const group of tabConfig.groups) {
        for (const pagePath of group.pages) {
          const fullPath = resolve(configDir, pagePath);
          const slug = slugFromPath(pagePath);
          const page = await loadMarkdownPage(fullPath, slug);
          pagesByPath.set(pagePath, page);

          pageMap.set(`${tabConfig.slug}/${slug}.html`, {
            spec: primarySpec,
            currentPage: { kind: "markdown", markdown: page },
            tabSlug: tabConfig.slug,
            pageSlug: slug,
          });
        }
      }

      const tab = buildNavFromPages(tabConfig, pagesByPath);
      siteTabs.push(tab);
    }
  }

  return { siteTabs, primarySpec, pageMap };
}

async function buildSearchIndexForDev(
  config: SpectacleConfig,
  branding: { logo?: string; favicon?: string },
): Promise<string> {
  const tabs = config.navigation!;
  const configDir = process.cwd();
  const { siteTabs, pageMap } = await loadSiteData(tabs, configDir, config, branding);
  const navigation = buildSiteNavigation(siteTabs);

  const specsBySlug = new Map<string, NormalizedSpec>();
  const markdownPagesByTab = new Map<string, MarkdownPage[]>();

  for (const [, entry] of pageMap) {
    if (entry.currentPage.kind === "spec") {
      specsBySlug.set(entry.tabSlug, entry.spec);
    }
  }

  for (const tabConfig of tabs) {
    if (tabConfig.groups) {
      const tabPages: MarkdownPage[] = [];
      for (const [, entry] of pageMap) {
        if (entry.tabSlug === tabConfig.slug && entry.currentPage.kind === "markdown") {
          tabPages.push(entry.currentPage.markdown!);
        }
      }
      markdownPagesByTab.set(tabConfig.slug, tabPages);
    }
  }

  return buildSearchIndex(specsBySlug, markdownPagesByTab, navigation);
}
