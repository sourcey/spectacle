import { readFile } from "node:fs/promises";
import { resolve, extname, posix } from "node:path";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { normalizeMcpSpec } from "./core/mcp-normalizer.js";
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
import { generateLlmsTxt, generateLlmsFullTxt } from "./renderer/llms.js";

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

  // Load all specs (OpenAPI and MCP)
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

  // Primary spec for SpecContext on markdown pages
  const primarySpec: NormalizedSpec = specsBySlug.values().next().value ?? createMinimalSpec();

  // Build SiteConfig from ResolvedConfig
  const site = await buildSiteConfig(config);

  // Process all tabs
  for (const tab of tabs) {
    if (tab.openapi || tab.mcp) {
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
        for (const rp of group.pages) {
          const slug = slugFromPath(rp.slug);
          const page = await loadMarkdownPage(rp.file, slug);
          pagesByPath.set(rp.slug, page);

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

  // Resolve internal links in markdown pages.
  // Builds a map from every plausible href to the correct output path,
  // then rewrites matching href attributes in each page's HTML.
  resolveInternalLinks(sitePages, config);

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
  const searchIndex = buildSearchIndex(specsBySlug, markdownPagesByTab, navigation, "/", config.search.featured);
  const llmsTxt = generateLlmsTxt(sitePages, navigation, site);
  const llmsFullTxt = generateLlmsFullTxt(sitePages, navigation, site);

  if (!options.skipWrite) {
    await buildSiteHtml(sitePages, navigation, outputDir, site, {
      searchIndex,
      llmsTxt,
      llmsFullTxt,
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

// ---------------------------------------------------------------------------
// Internal link resolution
// ---------------------------------------------------------------------------

/**
 * Rewrite internal links in markdown page HTML to correct relative .html paths.
 *
 * Authors write links like [Page](/slug) or [Page](/tab/slug). This pass
 * rewrites matching href values so they resolve on static file servers
 * that don't support extensionless URLs.
 */
export function resolveInternalLinks(pages: SitePage[], config: ResolvedConfig): void {
  // Build a map from every plausible clean path to the output path.
  // e.g. "components" -> "components.html", "config/ref-theme-tokens" -> "config/ref-theme-tokens.html"
  const pathMap = new Map<string, string>();
  for (const page of pages) {
    const out = page.outputPath; // e.g. "components.html" or "config/ref-theme-tokens.html"
    const clean = out.replace(/\.html$/, ""); // "components" or "config/ref-theme-tokens"
    pathMap.set(clean, out);

    if (page.currentPage.kind === "markdown" && page.currentPage.markdown?.sourcePath) {
      const sourceClean = page.currentPage.markdown.sourcePath
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\.(md|mdx)$/, "");
      pathMap.set(sourceClean, out);
    }
  }

  // Repo source link base: e.g. "https://github.com/user/repo/tree/main"
  const repoBase = config.repo?.replace(/\/$/, "");
  const branch = config.editBranch;
  const sourceBase = repoBase && branch ? `${repoBase}/tree/${branch}` : undefined;

  for (const page of pages) {
    if (page.currentPage.kind !== "markdown" || !page.currentPage.markdown) continue;
    const md = page.currentPage.markdown;
    const pageDir = page.outputPath.includes("/")
      ? page.outputPath.substring(0, page.outputPath.lastIndexOf("/"))
      : "";
    const depth = pageDir ? pageDir.split("/").length : 0;
    const toRoot = depth > 0 ? "../".repeat(depth) : "";

    md.html = md.html.replace(/href="([^"]+)"/g, (_match, href: string) => {
      // Only rewrite internal non-anchor, non-protocol links
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#") || href.startsWith("mailto:")) {
        return _match;
      }

      // Split off hash fragment
      const [path, hash] = href.split("#", 2);
      const hashSuffix = hash ? `#${hash}` : "";

      // Normalize: strip leading slash, trailing slash, and markdown extension
      const sourcePath = path.replace(/\\/g, "/");
      const clean = sourcePath.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.(md|mdx)$/, "");

      // Skip if already has .html extension
      if (clean.endsWith(".html")) return _match;

      const candidates = new Set<string>();

      // Relative markdown links should resolve against the current page's
      // source path, not just the built output path.
      if (!sourcePath.startsWith("/") && md.sourcePath) {
        const sourceDir = posix.dirname(md.sourcePath.replace(/\\/g, "/"));
        candidates.add(posix.normalize(posix.join(sourceDir, clean)));
      }

      candidates.add(clean);

      // Look up in path map — try the resolved path first, then
      // progressively strip leading segments to handle deployment prefixes
      // (e.g. "docs/components" → "components").
      let target: string | undefined;
      for (const initialCandidate of candidates) {
        let candidate = initialCandidate;
        while (!target && candidate && candidate !== ".") {
          target = pathMap.get(candidate);
          if (target) break;
          const slash = candidate.indexOf("/");
          if (slash === -1) break;
          candidate = candidate.substring(slash + 1);
        }
        if (target) break;
      }

      if (target) {
        // Build relative path from this page to the target
        const relativePath = toRoot + target;
        return `href="${relativePath}${hashSuffix}"`;
      }

      // If the link contains ../ and we have a repo URL configured,
      // resolve it relative to the markdown source file. Links to docs
      // pages are already handled above (pathMap lookup catches them after
      // .md stripping and prefix stripping). What remains are links to
      // repo source code outside the docs directory.
      if (sourceBase && href.includes("../") && md.sourcePath) {
        const sourceDir = posix.dirname(md.sourcePath);
        const resolved = posix.normalize(posix.join(sourceDir, path));
        // Only rewrite if the path stays inside the repo root
        if (!resolved.startsWith("..")) {
          return `href="${sourceBase}/${resolved}${hashSuffix}"`;
        }
      }

      return _match;
    });
  }
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
