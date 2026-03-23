import { createServer as createViteServer, type InlineConfig, type ViteDevServer } from "vite";
import { resolve, dirname, extname } from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig, resolveConfigFromRaw } from "./config.js";
import type { ResolvedConfig, ResolvedTab } from "./config.js";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
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
    if (tab.doxygen) watchPaths.push(tab.doxygen.xml);
    if (tab.groups) {
      for (const group of tab.groups) {
        for (const pagePath of group.pages) {
          watchPaths.push(pagePath);
        }
      }
    }
  }

  // Resolve source paths for Vite dev serving
  const projectRoot = resolve(__dirname, "..");
  const tailwindCssPath = resolve(projectRoot, "src/themes/default/main.css");
  const sourceyCssPath = resolve(projectRoot, "src/themes/default/sourcey.css");
  const clientEntry = resolve(projectRoot, "src/client/index.ts");
  const ssrRendererPath = resolve(projectRoot, "src/renderer/static-renderer.ts");

  let vite: ViteDevServer;

  // Reload config through Vite SSR (bypasses Node's module cache)
  async function reloadConfig(): Promise<ResolvedConfig> {
    const configMod = await vite.ssrLoadModule(configPath);
    return resolveConfigFromRaw(configMod.default, process.cwd());
  }

  async function render(url: string): Promise<string | null> {
    // Load render-path modules through Vite's SSR graph so invalidateAll() works.
    // Static imports would survive invalidation and serve stale output.
    const { renderPage } = await vite.ssrLoadModule(ssrRendererPath) as {
      renderPage: typeof import("./renderer/static-renderer.js").renderPage;
    };
    const mdLoader = await vite.ssrLoadModule(
      resolve(projectRoot, "src/core/markdown-loader.ts")
    ) as typeof import("./core/markdown-loader.js");

    const { siteTabs, primarySpec, pageMap } = await loadSiteData(config.tabs, mdLoader.loadMarkdownPage);
    const navigation = buildSiteNavigation(siteTabs);
    const site = await buildSiteConfig(config);

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
    html = html.replace(
      /<link rel="stylesheet" href="[^"]*sourcey\.css"[^>]*\/>/,
      `<link rel="stylesheet" href="/@fs${tailwindCssPath}" />\n<link rel="stylesheet" href="/@fs${sourceyCssPath}?direct" />`
    );
    html = html.replace(
      /<script src="[^"]*sourcey\.js"[^>]*><\/script>/,
      `<script type="module" src="/@fs${clientEntry}"></script>`
    );
    html = html.replace(
      /<script src="[^"]*sourcey\.js"[^>]*\/>/,
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
      preact(),
      tailwindcss(),
      sourceyPlugin({
        watchPaths,
        render,
        searchIndex: () => buildSearchIndexForDev(config),
      }),
    ],
    clearScreen: false,
    logLevel: "warn",
    optimizeDeps: {
      exclude: ["sourcey"],
    },
  };

  vite = await createViteServer(viteConfig);

  // Reload config when sourcey.config.ts changes
  vite.watcher.on("change", async (file) => {
    if (file === configPath) {
      config = await reloadConfig();
    }
  });

  await vite.listen();

  console.log(`\n  Sourcey dev server running at http://localhost:${port}`);
  console.log(`  Watching: ${watchPaths.length} content file${watchPaths.length === 1 ? "" : "s"} + components + CSS (HMR)`);
  console.log(`  Press Ctrl+C to stop\n`);
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

async function loadSiteData(
  tabs: ResolvedTab[],
  loadMarkdownPageFn: typeof loadMarkdownPage = loadMarkdownPage,
) {
  const specsBySlug = new Map<string, NormalizedSpec>();
  const siteTabs: SiteTab[] = [];
  const pageMap = new Map<string, PageMapEntry>();

  for (const tab of tabs) {
    if (!tab.openapi) continue;
    const loaded = await loadSpec(tab.openapi);
    const parsed = await parseSpec(loaded);
    const openapi3 = await convertToOpenApi3(parsed);
    const spec = normalizeSpec(openapi3);
    specsBySlug.set(tab.slug, spec);
  }

  const primarySpec: NormalizedSpec = specsBySlug.values().next().value ?? {
    info: { title: "", version: "", description: "" },
    servers: [], tags: [], operations: [], schemas: {}, securitySchemes: {}, webhooks: [],
  };

  for (const tab of tabs) {
    if (tab.openapi) {
      const spec = specsBySlug.get(tab.slug)!;
      const navTab = buildNavFromSpec(spec, tab.slug);
      navTab.label = tab.label;
      siteTabs.push(navTab);

      pageMap.set(`${tab.slug}/index.html`, {
        spec,
        currentPage: { kind: "spec", spec },
        tabSlug: tab.slug,
        pageSlug: "introduction",
      });
    } else if (tab.doxygen) {
      const { pages, navTab } = await loadDoxygenTab(tab.doxygen, tab.slug, tab.label);

      for (const [slug, page] of pages) {
        pageMap.set(`${tab.slug}/${slug}.html`, {
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
        for (const pagePath of group.pages) {
          const slug = slugFromPath(pagePath);
          const page = await loadMarkdownPageFn(pagePath, slug);
          pagesByPath.set(pagePath, page);

          pageMap.set(`${tab.slug}/${slug}.html`, {
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
    favicon: config.favicon,
    repo: config.repo,
    editBranch: config.editBranch,
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

async function buildSearchIndexForDev(config: ResolvedConfig): Promise<string> {
  const { siteTabs, pageMap, specsBySlug } = await loadSiteData(config.tabs);
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

  return buildSearchIndex(specsBySlug, markdownPagesByTab, navigation);
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
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
