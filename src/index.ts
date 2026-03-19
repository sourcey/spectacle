import { readFile } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { buildHtml, buildSite as buildSiteHtml } from "./renderer/html-builder.js";
import type { SitePage } from "./renderer/html-builder.js";
import type { NormalizedSpec } from "./core/types.js";
import type { SpectacleConfig, NavigationTab } from "./config.js";
import { loadConfig, isMultiPageConfig } from "./config.js";
import { loadMarkdownPage, slugFromPath } from "./core/markdown-loader.js";
import type { MarkdownPage } from "./core/markdown-loader.js";
import { buildNavFromSpec, buildNavFromPages, buildSiteNavigation } from "./core/navigation.js";
import type { SiteTab } from "./core/navigation.js";
import { buildSearchIndex } from "./core/search-indexer.js";

export interface ThemeOverrides {
  /** CSS custom property overrides, e.g. { "--color-accent": "#e11d48" } */
  [key: string]: string;
}

export interface BuildOptions {
  /** Path or URL to the OpenAPI/Swagger spec file */
  specSource: string;
  /** Output directory (default: "dist") */
  outputDir?: string;
  /** Path to a custom logo file */
  logo?: string;
  /** Path to a custom favicon */
  favicon?: string;
  /** Embed all assets into a single HTML file */
  singleFile?: boolean;
  /** Generate embeddable output (no <html>/<body> tags) */
  embeddable?: boolean;
  /** Skip writing files to disk (useful for programmatic API) */
  skipWrite?: boolean;
  /** CSS custom property overrides for theming */
  themeOverrides?: ThemeOverrides;
}

export interface BuildResult {
  /** The normalized spec that was processed */
  spec: NormalizedSpec;
  /** Output directory where files were written */
  outputDir: string;
  /** Path to the generated index.html (if written) */
  htmlPath?: string;
}

/**
 * Build API documentation from an OpenAPI/Swagger spec.
 *
 * This is the main programmatic API entry point.
 */
export async function buildDocs(options: BuildOptions): Promise<BuildResult> {
  const outputDir = options.outputDir ?? "dist";

  // 1. Load the spec file
  const loaded = await loadSpec(options.specSource);

  // 2. Dereference all $refs (using original file path for relative ref resolution)
  const parsed = await parseSpec(loaded);

  // 3. Convert Swagger 2.0 → OpenAPI 3.x if needed (after dereferencing)
  const openapi3 = await convertToOpenApi3(parsed);

  // 4. Normalize into internal representation
  const spec = normalizeSpec(openapi3);

  // Override branding if provided via options
  if (options.logo) {
    spec.info.logo = await resolveAssetUrl(options.logo);
  }
  if (options.favicon) {
    spec.info.favicon = options.favicon;
  }

  // 5. Render components → HTML and write output files
  if (!options.skipWrite) {
    const output = await buildHtml(spec, outputDir, {
      embeddable: options.embeddable,
      singleFile: options.singleFile,
      themeOverrides: options.themeOverrides,
    });
    return { spec, outputDir, htmlPath: output.htmlPath };
  }

  return { spec, outputDir };
}

// ---------------------------------------------------------------------------
// Multi-page site build (new)
// ---------------------------------------------------------------------------

export interface SiteBuildOptions {
  /** Path to directory containing spectacle.json (default: cwd) */
  configDir?: string;
  /** Output directory (default: "dist") */
  outputDir?: string;
}

export interface SiteBuildResult {
  /** Output directory where files were written */
  outputDir: string;
  /** Number of pages generated */
  pageCount: number;
}

/**
 * Build a multi-page documentation site from a spectacle.json config.
 *
 * This is the new entry point for multi-page mode.
 * The existing buildDocs() is not modified.
 */
export async function buildSiteDocs(options: SiteBuildOptions = {}): Promise<SiteBuildResult> {
  const configDir = resolve(options.configDir ?? process.cwd());
  const outputDir = resolve(options.outputDir ?? "dist");

  // 1. Load and validate config
  const config = await loadConfig(configDir);
  if (!isMultiPageConfig(config)) {
    throw new Error("spectacle.json has no 'navigation' config. Use buildDocs() for single-spec mode.");
  }

  const tabs = config.navigation!;
  const sitePages: SitePage[] = [];
  const siteTabs: SiteTab[] = [];

  // Two-pass approach: process spec tabs first so markdown pages
  // can reference the primary spec for SpecContext (needed for title, branding).
  const specsBySlug = new Map<string, NormalizedSpec>();

  // Pass 1: load all specs
  for (const tabConfig of tabs) {
    if (!tabConfig.spec) continue;
    const specPath = resolve(configDir, tabConfig.spec);
    const loaded = await loadSpec(specPath);
    const parsed = await parseSpec(loaded);
    const openapi3 = await convertToOpenApi3(parsed);
    const spec = normalizeSpec(openapi3);

    if (config.logo) {
      spec.info.logo = await resolveAssetUrl(config.logo);
    }
    if (config.favicon) {
      spec.info.favicon = config.favicon;
    }

    specsBySlug.set(tabConfig.slug, spec);
  }

  // Primary spec for SpecContext on markdown pages (first spec, or minimal stub)
  const primarySpec: NormalizedSpec = specsBySlug.values().next().value
    ?? createMinimalSpec(config);

  // Pass 2: process all tabs in order, building pages and navigation
  for (const tabConfig of tabs) {
    if (tabConfig.spec) {
      const spec = specsBySlug.get(tabConfig.slug)!;
      const tab = buildNavFromSpec(spec, tabConfig.slug);
      tab.label = tabConfig.label;
      siteTabs.push(tab);

      sitePages.push({
        outputPath: `${tabConfig.slug}/index.html`,
        currentPage: { kind: "spec", spec },
        spec,
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

          sitePages.push({
            outputPath: `${tabConfig.slug}/${slug}.html`,
            currentPage: { kind: "markdown", markdown: page },
            spec: primarySpec,
            tabSlug: tabConfig.slug,
            pageSlug: slug,
          });
        }
      }

      const tab = buildNavFromPages(tabConfig, pagesByPath);
      siteTabs.push(tab);
    }
  }

  // 3. Build navigation
  const navigation = buildSiteNavigation(siteTabs);

  // 4. Build search index
  const markdownPagesByTab = new Map<string, MarkdownPage[]>();
  for (const tabConfig of tabs) {
    if (tabConfig.groups) {
      const tabPages = sitePages
        .filter((p) => p.tabSlug === tabConfig.slug && p.currentPage.kind === "markdown")
        .map((p) => p.currentPage.markdown!);
      markdownPagesByTab.set(tabConfig.slug, tabPages);
    }
  }
  const searchIndex = buildSearchIndex(specsBySlug, markdownPagesByTab, navigation);

  // 5. Render all pages
  await buildSiteHtml(sitePages, navigation, outputDir, {
    themeOverrides: config.theme,
    searchIndex,
  });

  return { outputDir, pageCount: sitePages.length };
}

/**
 * Create a minimal NormalizedSpec for markdown-only sites.
 * Provides enough data for SpecContext without requiring an actual OpenAPI spec.
 */
function createMinimalSpec(config: SpectacleConfig): NormalizedSpec {
  return {
    info: {
      title: "",
      version: "",
      description: "",
      logo: config.logo,
      favicon: config.favicon,
    },
    servers: [],
    tags: [],
    operations: [],
    schemas: {},
    securitySchemes: {},
    webhooks: [],
  };
}

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
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  const abs = resolve(pathOrUrl);
  const ext = extname(abs).toLowerCase();
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";
  const data = await readFile(abs);
  return `data:${mime};base64,${data.toString("base64")}`;
}
