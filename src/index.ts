import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { buildSite as buildSiteHtml } from "./renderer/html-builder.js";
import type { SitePage } from "./renderer/html-builder.js";
import type { NormalizedSpec } from "./core/types.js";
import { tabPath } from "./config.js";
import type { ResolvedConfig, ResolvedTab } from "./config.js";
import { loadConfig, configFromSpec } from "./config.js";
import { loadMarkdownPage, slugFromPath } from "./core/markdown-loader.js";
import { loadDoxygenTab } from "./core/doxygen-loader.js";
import type { MarkdownPage } from "./core/markdown-loader.js";
import { buildNavFromSpec, buildNavFromPages, buildSiteNavigation } from "./core/navigation.js";
import type { SiteTab } from "./core/navigation.js";
import { buildSearchIndex } from "./core/search-indexer.js";
import type { SiteConfig } from "./renderer/context.js";

// ---------------------------------------------------------------------------
// Build options
// ---------------------------------------------------------------------------

export interface BuildOptions {
  specSource: string;
  outputDir?: string;
  embeddable?: boolean;
  skipWrite?: boolean;
}

export interface BuildResult {
  spec: NormalizedSpec;
  outputDir: string;
  pageCount: number;
}

/**
 * Build API documentation from a single OpenAPI/Swagger spec.
 * Wraps the spec in a single-tab site and renders through the modern layout.
 */
export async function buildDocs(options: BuildOptions): Promise<BuildResult> {
  const config = configFromSpec(options.specSource);

  const result = await buildSiteDocs({
    config,
    outputDir: options.outputDir,
    skipWrite: options.skipWrite,
    embeddable: options.embeddable,
  });

  const spec = result._specs?.values().next().value ?? createMinimalSpec();
  return { spec, outputDir: result.outputDir, pageCount: result.pageCount };
}

// ---------------------------------------------------------------------------
// Site build (the only rendering path)
// ---------------------------------------------------------------------------

export interface SiteBuildOptions {
  configDir?: string;
  outputDir?: string;
  config?: ResolvedConfig;
  skipWrite?: boolean;
  embeddable?: boolean;
}

export interface SiteBuildResult {
  outputDir: string;
  pageCount: number;
  /** @internal specs by tab slug, for buildDocs compat */
  _specs?: Map<string, NormalizedSpec>;
}

export async function buildSiteDocs(options: SiteBuildOptions = {}): Promise<SiteBuildResult> {
  const outputDir = resolve(options.outputDir ?? "dist");

  const config = options.config ?? await loadConfig(options.configDir);

  const tabs = config.tabs;
  const sitePages: SitePage[] = [];
  const siteTabs: SiteTab[] = [];
  const specsBySlug = new Map<string, NormalizedSpec>();

  // Load all specs
  for (const tab of tabs) {
    if (!tab.openapi) continue;
    const loaded = await loadSpec(tab.openapi);
    const parsed = await parseSpec(loaded);
    const openapi3 = await convertToOpenApi3(parsed);
    const spec = normalizeSpec(openapi3);
    specsBySlug.set(tab.slug, spec);
  }

  // Primary spec for SpecContext on markdown pages
  const primarySpec: NormalizedSpec = specsBySlug.values().next().value ?? createMinimalSpec();

  // Build SiteConfig from ResolvedConfig
  const site = await buildSiteConfig(config);

  // Process all tabs
  for (const tab of tabs) {
    if (tab.openapi) {
      const spec = specsBySlug.get(tab.slug)!;
      const navTab = buildNavFromSpec(spec, tab.slug);
      navTab.label = tab.label;
      siteTabs.push(navTab);

      sitePages.push({
        outputPath: tabPath(tab.slug, "index.html"),
        currentPage: { kind: "spec", spec },
        spec,
        tabSlug: tab.slug,
        pageSlug: "introduction",
      });
    } else if (tab.doxygen) {
      const { pages, navTab } = await loadDoxygenTab(tab.doxygen, tab.slug, tab.label);

      for (const [slug, page] of pages) {
        sitePages.push({
          outputPath: tabPath(tab.slug, `${slug}.html`),
          currentPage: { kind: "markdown", markdown: page },
          spec: primarySpec,
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
          const page = await loadMarkdownPage(pagePath, slug);
          pagesByPath.set(pagePath, page);

          sitePages.push({
            outputPath: tabPath(tab.slug, `${slug}.html`),
            currentPage: { kind: "markdown", markdown: page },
            spec: primarySpec,
            tabSlug: tab.slug,
            pageSlug: slug,
          });
        }
      }

      const navTab = buildNavFromPages(tab, pagesByPath);
      siteTabs.push(navTab);
    }
  }

  const navigation = buildSiteNavigation(siteTabs);

  // Build search index
  const markdownPagesByTab = new Map<string, MarkdownPage[]>();
  for (const tab of tabs) {
    if (tab.groups || tab.doxygen) {
      const tabPages = sitePages
        .filter((p) => p.tabSlug === tab.slug && p.currentPage.kind === "markdown")
        .map((p) => p.currentPage.markdown!);
      markdownPagesByTab.set(tab.slug, tabPages);
    }
  }
  const searchIndex = buildSearchIndex(specsBySlug, markdownPagesByTab, navigation);

  if (!options.skipWrite) {
    await buildSiteHtml(sitePages, navigation, outputDir, site, {
      searchIndex,
      embeddable: options.embeddable,
    });
  }

  return { outputDir, pageCount: sitePages.length, _specs: specsBySlug };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMinimalSpec(): NormalizedSpec {
  return {
    info: { title: "", version: "", description: "" },
    servers: [],
    tags: [],
    operations: [],
    schemas: {},
    securitySchemes: {},
    webhooks: [],
  };
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

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
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

export { defineConfig } from "./config.js";

// Re-export types for consumers
export type {
  NormalizedSpec,
  NormalizedOperation,
  NormalizedTag,
  NormalizedSchema,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
} from "./core/types.js";
