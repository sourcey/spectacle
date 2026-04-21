import { readFile } from "node:fs/promises";
import { resolve, extname, posix } from "node:path";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { normalizeMcpSpec } from "./core/mcp-normalizer.js";
import { buildSite as buildSiteHtml } from "./renderer/html-builder.js";
import type { SitePage } from "./renderer/html-builder.js";
import type { ChangelogDiagnostic, NormalizedSpec, NormalizedChangelogVersion } from "./core/types.js";
import { tabPath } from "./config.js";
import type { ResolvedConfig, ResolvedTab } from "./config.js";
import { loadConfig, configFromSpec } from "./config.js";
import { loadDocsPage, slugFromPath } from "./core/markdown-loader.js";
import { loadDoxygenTab } from "./core/doxygen-loader.js";
import type { ChangelogPage, DocsPage, MarkdownPage } from "./core/markdown-loader.js";
import { buildNavFromSpec, buildNavFromPages, buildSiteNavigation } from "./core/navigation.js";
import type { SiteTab } from "./core/navigation.js";
import { buildSearchIndex } from "./core/search-indexer.js";
import type { SiteConfig } from "./renderer/context.js";
import { generateLlmsTxt, generateLlmsFullTxt } from "./renderer/llms.js";
import { generateChangelogFeeds } from "./renderer/changelog-feed.js";

// ---------------------------------------------------------------------------
// Build options
// ---------------------------------------------------------------------------

export interface BuildOptions {
  specSource: string;
  outputDir?: string;
  embeddable?: boolean;
  skipWrite?: boolean;
  strictChangelog?: boolean;
}

export interface BuildResult {
  spec: NormalizedSpec;
  outputDir: string;
  pageCount: number;
  changelogDiagnostics: ChangelogDiagnostic[];
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
    strictChangelog: options.strictChangelog,
  });

  const spec = result._specs?.values().next().value ?? createMinimalSpec();
  return {
    spec,
    outputDir: result.outputDir,
    pageCount: result.pageCount,
    changelogDiagnostics: result.changelogDiagnostics,
  };
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
  strictChangelog?: boolean;
}

export interface SiteBuildResult {
  outputDir: string;
  pageCount: number;
  changelogDiagnostics: ChangelogDiagnostic[];
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
  const changelogDiagnostics: ChangelogDiagnostic[] = [];

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
      const pagesByPath = new Map<string, DocsPage>();

      for (const group of tab.groups) {
        for (const rp of group.pages) {
          const slug = slugFromPath(rp.slug);
          const page = await loadDocsPage(rp.file, slug, {
            changelog: config.changelog.enabled,
            repoUrl: config.repo,
          });
          pagesByPath.set(rp.slug, page);

          if (page.kind === "changelog") {
            changelogDiagnostics.push(...page.changelog.diagnostics);
            sitePages.push({
              outputPath: tabPath(tab.slug, `${slug}.html`),
              currentPage: { kind: "changelog", changelog: page },
              spec: primarySpec,
              tabSlug: tab.slug,
              pageSlug: slug,
            });
          } else {
            sitePages.push({
              outputPath: tabPath(tab.slug, `${slug}.html`),
              currentPage: { kind: "markdown", markdown: page },
              spec: primarySpec,
              tabSlug: tab.slug,
              pageSlug: slug,
            });
          }
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

  enforceChangelogDiagnostics(changelogDiagnostics, options.strictChangelog);

  const changelogPages = sitePages.filter(isMainChangelogSitePage);
  const extraFiles = new Map<string, string | Buffer>();

  if (config.changelog.permalinks) {
    const permalinkPages: SitePage[] = [];
    for (const page of changelogPages) {
      const changelog = page.currentPage.changelog;
      for (const version of changelog.changelog.versions) {
        const permalinkPage: ChangelogPage = {
          ...changelog,
          description: version.summary ?? changelog.description,
          slug: `${changelog.slug}/${version.id}`,
          headings: [],
          permalinkVersionId: version.id,
        };

        permalinkPages.push({
          outputPath: tabPath(page.tabSlug, `${changelog.slug}/${version.id}/index.html`),
          currentPage: { kind: "changelog", changelog: permalinkPage },
          spec: primarySpec,
          tabSlug: page.tabSlug,
          pageSlug: `${page.pageSlug}--${version.id}`,
        });
      }
    }
    sitePages.push(...permalinkPages);
  }

  if (config.changelog.feed) {
    const globalFeedLinks = changelogPages.length === 1
      ? createFeedLinks("feed.xml", "feed.rss", changelogPages[0].currentPage.changelog.title)
      : null;

    for (const page of changelogPages) {
      const changelog = page.currentPage.changelog;
      const versionHref = (version: NormalizedChangelogVersion) => {
        if (config.changelog.permalinks) {
          return publicHref(tabPath(page.tabSlug, `${changelog.slug}/${version.id}/index.html`));
        }
        return `${publicHref(page.outputPath)}#${version.id}`;
      };

      const atomPath = globalFeedLinks && changelogPages.length === 1
        ? "feed.xml"
        : tabPath(page.tabSlug, `${changelog.slug}/feed.xml`);
      const rssPath = globalFeedLinks && changelogPages.length === 1
        ? "feed.rss"
        : tabPath(page.tabSlug, `${changelog.slug}/feed.rss`);

      const feedConfig = config.changelog.feed || undefined;
      const feeds = generateChangelogFeeds(changelog, {
        atomPath: publicHref(atomPath),
        rssPath: publicHref(rssPath),
        pagePath: publicHref(page.outputPath),
        siteName: config.name,
        title: feedConfig?.title,
        description: feedConfig?.description,
        versionHref,
      });

      extraFiles.set(atomPath, feeds.atom);
      extraFiles.set(rssPath, feeds.rss);

      const feedLinks = createFeedLinks(atomPath, rssPath, changelog.title);
      page.alternateLinks = feedLinks;

      for (const candidate of sitePages) {
        if (candidate.currentPage.kind !== "changelog") continue;
        if (candidate.currentPage.changelog.sourcePath !== changelog.sourcePath) continue;
        candidate.alternateLinks = feedLinks;
      }
    }

    if (globalFeedLinks) {
      for (const page of sitePages) {
        if (!page.alternateLinks?.length) {
          page.alternateLinks = globalFeedLinks;
        }
      }
    }
  }

  // Build search index
  const docsPagesByTab = new Map<string, DocsPage[]>();
  for (const tab of tabs) {
    if (tab.groups || tab.doxygen) {
      const tabPages: DocsPage[] = [];
      for (const page of sitePages) {
        if (page.tabSlug !== tab.slug || !isSearchableDocsSitePage(page)) continue;
        tabPages.push(page.currentPage.kind === "markdown" ? page.currentPage.markdown : page.currentPage.changelog);
      }
      docsPagesByTab.set(tab.slug, tabPages);
    }
  }
  const searchIndex = buildSearchIndex(specsBySlug, docsPagesByTab, navigation, "/", config.search.featured);
  const llmsTxt = generateLlmsTxt(sitePages, navigation, site);
  const llmsFullTxt = generateLlmsFullTxt(sitePages, navigation, site);

  // Generate OG images
  const ogImages = new Map<string, Buffer>();
  if (!config.ogImage) {
    const { generateOgImage } = await import("./og/generate-og-image.js");

    const CONCURRENCY = 8;
    for (let i = 0; i < sitePages.length; i += CONCURRENCY) {
      const batch = sitePages.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (page) => {
          const ogMeta = describePageForOg(page, config.name || "API", config.changelog.ogImages);
          if (!ogMeta) return;

          const ogPath = `_og/${page.outputPath.replace(/\.html$/, ".png")}`;

          const png = await generateOgImage({
            title: ogMeta.title,
            description: ogMeta.description,
            siteName: config.name,
            theme: config.theme,
            logo: site.logo?.light,
          });

          page.ogImagePath = ogPath;
          ogImages.set(ogPath, png);
        }),
      );
    }
  } else {
    // Static OG image — set the same path on all pages
    const staticOg = config.ogImage;
    for (const page of sitePages) {
      page.ogImagePath = staticOg;
    }
  }

  if (!options.skipWrite) {
    await buildSiteHtml(sitePages, navigation, outputDir, site, {
      searchIndex,
      llmsTxt,
      llmsFullTxt,
      embeddable: options.embeddable,
      ogImages,
      extraFiles,
    });
  }

  return {
    outputDir,
    pageCount: sitePages.length,
    changelogDiagnostics,
    _specs: specsBySlug,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMainChangelogSitePage(page: SitePage): page is SitePage & { currentPage: { kind: "changelog"; changelog: ChangelogPage } } {
  return page.currentPage.kind === "changelog" && !page.currentPage.changelog.permalinkVersionId;
}

function isSearchableDocsSitePage(
  page: SitePage,
): page is SitePage & { currentPage: { kind: "markdown"; markdown: MarkdownPage } | { kind: "changelog"; changelog: ChangelogPage } } {
  return page.currentPage.kind === "markdown" || isMainChangelogSitePage(page);
}

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

function enforceChangelogDiagnostics(
  diagnostics: ChangelogDiagnostic[],
  strictChangelog = false,
): void {
  const error = diagnostics.find((diagnostic) => diagnostic.severity === "error");
  if (error) {
    throw new Error(formatChangelogDiagnostic(error));
  }

  if (!strictChangelog) return;

  const warning = diagnostics.find((diagnostic) => diagnostic.severity === "warning");
  if (warning) {
    throw new Error(formatChangelogDiagnostic(warning));
  }
}

function formatChangelogDiagnostic(diagnostic: ChangelogDiagnostic): string {
  const location = diagnostic.version ? ` (${diagnostic.version})` : "";
  const line = diagnostic.line ? ` line ${diagnostic.line}` : "";
  return `[${diagnostic.code}]${location}${line}: ${diagnostic.message}`;
}

function createFeedLinks(atomPath: string, rssPath: string, title: string) {
  return [
    { href: atomPath, type: "application/atom+xml", title: `${title} Atom Feed` },
    { href: rssPath, type: "application/rss+xml", title: `${title} RSS Feed` },
  ];
}

function publicHref(outputPath: string): string {
  if (outputPath.endsWith("/index.html")) {
    return `/${outputPath.slice(0, -("index.html".length))}`;
  }
  return `/${outputPath}`;
}

function describePageForOg(
  page: SitePage,
  defaultSiteName: string,
  changelogPermalinkOg: boolean,
): { title: string; description?: string } | null {
  if (page.currentPage.kind === "markdown") {
    return {
      title: page.currentPage.markdown.title,
      description: page.currentPage.markdown.description || undefined,
    };
  }

  if (page.currentPage.kind === "changelog") {
    const changelog = page.currentPage.changelog;
    if (changelog.permalinkVersionId) {
      if (!changelogPermalinkOg) return null;
      const version = changelog.changelog.versions.find((candidate) => candidate.id === changelog.permalinkVersionId);
      if (!version) return null;

      return {
        title: `${version.version ?? "Unreleased"} — ${changelog.title}`,
        description: version.summary || summarizeVersion(version),
      };
    }

    return {
      title: changelog.title,
      description: changelog.description || changelog.changelog.description,
    };
  }

  return { title: `${defaultSiteName} Reference` };
}

function summarizeVersion(version: NormalizedChangelogVersion): string | undefined {
  if (version.summary) return version.summary;
  const texts = version.sections.flatMap((section) => section.entries.map((entry) => entry.text));
  const summary = texts.slice(0, 3).join(" ");
  return summary || undefined;
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
    changelog: config.changelog,
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

    const docsSourcePath = getCanonicalSourcePath(page);
    if (docsSourcePath) {
      const sourceClean = docsSourcePath
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
    const docsSourcePath = getDocsSourcePath(page);
    if (!docsSourcePath) continue;

    if (page.currentPage.kind === "markdown") {
      page.currentPage.markdown.html = rewriteHtmlLinks(
        page.currentPage.markdown.html,
        page.outputPath,
        docsSourcePath,
        pathMap,
        sourceBase,
      );
      continue;
    }

    if (page.currentPage.kind === "changelog") {
      const changelog = page.currentPage.changelog;
      for (const version of changelog.changelog.versions) {
        if (version.summary) {
          version.summary = rewriteMarkdownLinks(
            version.summary,
            page.outputPath,
            docsSourcePath,
            pathMap,
            sourceBase,
          );
        }
        for (const section of version.sections) {
          for (const entry of section.entries) {
            entry.html = rewriteHtmlLinks(
              entry.html,
              page.outputPath,
              docsSourcePath,
              pathMap,
              sourceBase,
            );
            entry.links = entry.links.map((link) => ({
              ...link,
              href: resolveInternalHref(link.href, page.outputPath, docsSourcePath, pathMap, sourceBase) ?? link.href,
            }));
          }
        }
      }
    }
  }
}

function getCanonicalSourcePath(page: SitePage): string | undefined {
  if (page.currentPage.kind === "markdown") return page.currentPage.markdown.sourcePath;
  if (isMainChangelogSitePage(page)) return page.currentPage.changelog.sourcePath;
  return undefined;
}

function getDocsSourcePath(page: SitePage): string | undefined {
  if (page.currentPage.kind === "markdown") return page.currentPage.markdown.sourcePath;
  if (page.currentPage.kind === "changelog") return page.currentPage.changelog.sourcePath;
  return undefined;
}

function rewriteHtmlLinks(
  html: string,
  outputPath: string,
  docsSourcePath: string,
  pathMap: Map<string, string>,
  sourceBase?: string,
): string {
  return html.replace(/href="([^"]+)"/g, (_match, href: string) => {
    const resolved = resolveInternalHref(href, outputPath, docsSourcePath, pathMap, sourceBase);
    return resolved ? `href="${resolved}"` : _match;
  });
}

function rewriteMarkdownLinks(
  markdown: string,
  outputPath: string,
  docsSourcePath: string,
  pathMap: Map<string, string>,
  sourceBase?: string,
): string {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string, href: string) => {
    const resolved = resolveInternalHref(href, outputPath, docsSourcePath, pathMap, sourceBase);
    return resolved ? `[${label}](${resolved})` : match;
  });
}

function resolveInternalHref(
  href: string,
  outputPath: string,
  docsSourcePath: string,
  pathMap: Map<string, string>,
  sourceBase?: string,
): string | null {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#") || href.startsWith("mailto:")) {
    return null;
  }

  const [path, hash] = href.split("#", 2);
  const hashSuffix = hash ? `#${hash}` : "";
  const sourcePath = path.replace(/\\/g, "/");
  const clean = sourcePath.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.(md|mdx)$/, "");

  if (clean.endsWith(".html")) return null;

  const pageDir = outputPath.includes("/")
    ? outputPath.substring(0, outputPath.lastIndexOf("/"))
    : "";
  const depth = pageDir ? pageDir.split("/").length : 0;
  const toRoot = depth > 0 ? "../".repeat(depth) : "";
  const candidates = new Set<string>();

  if (!sourcePath.startsWith("/") && docsSourcePath) {
    const sourceDir = posix.dirname(docsSourcePath.replace(/\\/g, "/"));
    candidates.add(posix.normalize(posix.join(sourceDir, clean)));
  }

  candidates.add(clean);

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
    return `${toRoot}${target}${hashSuffix}`;
  }

  if (sourceBase && href.includes("../") && docsSourcePath) {
    const sourceDir = posix.dirname(docsSourcePath);
    const resolved = posix.normalize(posix.join(sourceDir, path));
    if (!resolved.startsWith("..")) {
      return `${sourceBase}/${resolved}${hashSuffix}`;
    }
  }

  return null;
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
