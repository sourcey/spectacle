import { readFile } from "node:fs/promises";
import { extname, posix, resolve } from "node:path";
import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { normalizeMcpSpec } from "./core/mcp-normalizer.js";
import { loadDocsPage, slugFromPath } from "./core/markdown-loader.js";
import { loadDoxygenTab } from "./core/doxygen-loader.js";
import { buildNavFromSpec, buildNavFromPages } from "./core/navigation.js";
import { generateChangelogFeeds } from "./renderer/changelog-feed.js";
import { tabPath } from "./config.js";
import type { ResolvedConfig, ResolvedTab } from "./config.js";
import type { ChangelogPage, DocsPage, MarkdownPage } from "./core/markdown-loader.js";
import type { SiteTab } from "./core/navigation.js";
import type { ChangelogDiagnostic, NormalizedChangelogVersion, NormalizedSpec } from "./core/types.js";
import type { SitePage } from "./renderer/html-builder.js";
import type { SiteConfig } from "./renderer/context.js";
import { toPublicUrl } from "./site-url.js";

export interface SiteAssembly {
  siteTabs: SiteTab[];
  primarySpec: NormalizedSpec;
  specsBySlug: Map<string, NormalizedSpec>;
  pageMap: Map<string, SitePage>;
  changelogDiagnostics: ChangelogDiagnostic[];
  extraFiles: Map<string, string | Buffer>;
}

export async function assembleSite(config: ResolvedConfig): Promise<SiteAssembly> {
  const specsBySlug = await loadSpecs(config.tabs);
  const primarySpec = specsBySlug.values().next().value ?? createMinimalSpec();
  const pageMap = new Map<string, SitePage>();
  const siteTabs: SiteTab[] = [];
  const changelogDiagnostics: ChangelogDiagnostic[] = [];

  for (const tab of config.tabs) {
    if (tab.openapi || tab.mcp) {
      const spec = specsBySlug.get(tab.slug)!;
      const navTab = buildNavFromSpec(spec, tab.slug);
      navTab.label = tab.label;
      siteTabs.push(navTab);

      pageMap.set(tabPath(tab.slug, "index.html"), {
        outputPath: tabPath(tab.slug, "index.html"),
        currentPage: { kind: "spec", spec },
        spec,
        tabSlug: tab.slug,
        pageSlug: "introduction",
      });
      continue;
    }

    if (tab.doxygen) {
      const { pages, navTab } = await loadDoxygenTab(tab.doxygen, tab.slug, tab.label);

      for (const [slug, page] of pages) {
        pageMap.set(tabPath(tab.slug, `${slug}.html`), {
          outputPath: tabPath(tab.slug, `${slug}.html`),
          currentPage: { kind: "markdown", markdown: page },
          spec: primarySpec,
          tabSlug: tab.slug,
          pageSlug: slug,
        });
      }

      siteTabs.push(navTab);
      continue;
    }

    if (!tab.groups) continue;

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
          pageMap.set(tabPath(tab.slug, `${slug}.html`), {
            outputPath: tabPath(tab.slug, `${slug}.html`),
            currentPage: { kind: "changelog", changelog: page },
            spec: primarySpec,
            tabSlug: tab.slug,
            pageSlug: slug,
          });
          continue;
        }

        pageMap.set(tabPath(tab.slug, `${slug}.html`), {
          outputPath: tabPath(tab.slug, `${slug}.html`),
          currentPage: { kind: "markdown", markdown: page },
          spec: primarySpec,
          tabSlug: tab.slug,
          pageSlug: slug,
        });
      }
    }

    siteTabs.push(buildNavFromPages(tab, pagesByPath));
  }

  if (config.changelog.permalinks) {
    addPermalinkPages(pageMap);
  }

  const sitePages = Array.from(pageMap.values());
  resolveInternalLinks(sitePages, config);
  const extraFiles = attachChangelogFeeds(sitePages, config);

  return {
    siteTabs,
    primarySpec,
    specsBySlug,
    pageMap,
    changelogDiagnostics,
    extraFiles,
  };
}

export function collectDocsPagesByTab(
  pageMap: Map<string, SitePage>,
  tabs: ResolvedTab[],
): Map<string, DocsPage[]> {
  const docsPagesByTab = new Map<string, DocsPage[]>();

  for (const tab of tabs) {
    if (!tab.groups && !tab.doxygen) continue;

    const tabPages: DocsPage[] = [];
    for (const [, page] of pageMap) {
      if (page.tabSlug !== tab.slug || !isSearchableDocsSitePage(page)) continue;
      tabPages.push(page.currentPage.kind === "markdown" ? page.currentPage.markdown : page.currentPage.changelog);
    }

    docsPagesByTab.set(tab.slug, tabPages);
  }

  return docsPagesByTab;
}

export function rebuildMarkdownTabNavigation(
  pageMap: Map<string, SitePage>,
  siteTabs: SiteTab[],
  tabs: ResolvedTab[],
  tabSlug: string,
): void {
  const tab = tabs.find((candidate) => candidate.slug === tabSlug);
  if (!tab?.groups) return;

  const pagesByPath = new Map<string, DocsPage>();
  for (const group of tab.groups) {
    for (const rp of group.pages) {
      const slug = slugFromPath(rp.slug);
      const entry = pageMap.get(tabPath(tab.slug, `${slug}.html`));
      if (!entry) continue;

      if (entry.currentPage.kind === "markdown") {
        pagesByPath.set(rp.slug, entry.currentPage.markdown);
      } else if (entry.currentPage.kind === "changelog") {
        pagesByPath.set(rp.slug, entry.currentPage.changelog);
      }
    }
  }

  const navTab = buildNavFromPages(tab, pagesByPath);
  const idx = siteTabs.findIndex((candidate) => candidate.slug === tabSlug);
  if (idx !== -1) siteTabs[idx] = navTab;
}

export function enforceChangelogDiagnostics(
  diagnostics: ChangelogDiagnostic[],
  strictChangelog = false,
): void {
  const error = diagnostics.find((diagnostic) => diagnostic.severity === "error");
  if (error) {
    throw new Error(formatChangelogFailure(error));
  }

  if (!strictChangelog) return;

  const warning = diagnostics.find((diagnostic) => diagnostic.severity === "warning");
  if (warning) {
    throw new Error(formatChangelogFailure(warning));
  }
}

export function formatChangelogDiagnostic(diagnostic: ChangelogDiagnostic): string {
  const location = diagnostic.version ? ` (${diagnostic.version})` : "";
  const line = diagnostic.line ? ` line ${diagnostic.line}` : "";
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${location}${line}: ${diagnostic.message}`;
}

export function formatChangelogFailure(diagnostic: ChangelogDiagnostic): string {
  const location = diagnostic.version ? ` (${diagnostic.version})` : "";
  const line = diagnostic.line ? ` line ${diagnostic.line}` : "";
  return `[${diagnostic.code}]${location}${line}: ${diagnostic.message}`;
}

export function formatChangelogDiagnostics(diagnostics: ChangelogDiagnostic[]): string[] {
  return diagnostics.map(formatChangelogDiagnostic);
}

export async function buildSiteConfig(config: ResolvedConfig): Promise<SiteConfig> {
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
    siteUrl: config.siteUrl,
    baseUrl: config.baseUrl,
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

export function createMinimalSpec(): NormalizedSpec {
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

export function resolveInternalLinks(pages: SitePage[], config: ResolvedConfig): void {
  const pathMap = new Map<string, string>();
  for (const page of pages) {
    const out = page.outputPath;
    const clean = out.replace(/\.html$/, "");
    pathMap.set(clean, out);

    const docsSourcePath = getCanonicalSourcePath(page);
    if (!docsSourcePath) continue;

    const sourceClean = docsSourcePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\.(md|mdx)$/, "");
    pathMap.set(sourceClean, out);
  }

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

    if (page.currentPage.kind !== "changelog") continue;

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

function attachChangelogFeeds(
  pages: SitePage[],
  config: ResolvedConfig,
): Map<string, string | Buffer> {
  const extraFiles = new Map<string, string | Buffer>();
  if (!config.changelog.feed) return extraFiles;

  const changelogPages = pages.filter(isMainChangelogSitePage);
  const globalFeedLinks = changelogPages.length === 1
    ? createFeedLinks("feed.xml", "feed.rss", changelogPages[0].currentPage.changelog.title)
    : null;

  for (const page of changelogPages) {
    const changelog = page.currentPage.changelog;
    const versionHref = (version: NormalizedChangelogVersion) => {
      if (config.changelog.permalinks) {
        return toPublicUrl(
          tabPath(page.tabSlug, `${changelog.slug}/${version.id}/index.html`),
          config.siteUrl,
          config.baseUrl,
        );
      }

      return `${toPublicUrl(page.outputPath, config.siteUrl, config.baseUrl)}#${version.id}`;
    };

    const atomPath = globalFeedLinks && changelogPages.length === 1
      ? "feed.xml"
      : tabPath(page.tabSlug, `${changelog.slug}/feed.xml`);
    const rssPath = globalFeedLinks && changelogPages.length === 1
      ? "feed.rss"
      : tabPath(page.tabSlug, `${changelog.slug}/feed.rss`);

    const feedConfig = config.changelog.feed || undefined;
    const feeds = generateChangelogFeeds(changelog, {
      atomPath: toPublicUrl(atomPath, config.siteUrl, config.baseUrl),
      rssPath: toPublicUrl(rssPath, config.siteUrl, config.baseUrl),
      pagePath: toPublicUrl(page.outputPath, config.siteUrl, config.baseUrl),
      siteName: config.name,
      title: feedConfig?.title,
      description: feedConfig?.description,
      versionHref,
    });

    extraFiles.set(atomPath, feeds.atom);
    extraFiles.set(rssPath, feeds.rss);

    const feedLinks = createFeedLinks(atomPath, rssPath, changelog.title);
    page.alternateLinks = feedLinks;

    for (const candidate of pages) {
      if (candidate.currentPage.kind !== "changelog") continue;
      if (candidate.currentPage.changelog.sourcePath !== changelog.sourcePath) continue;
      candidate.alternateLinks = feedLinks;
    }
  }

  if (globalFeedLinks) {
    for (const page of pages) {
      if (!page.alternateLinks?.length) {
        page.alternateLinks = globalFeedLinks;
      }
    }
  }

  return extraFiles;
}

function addPermalinkPages(pageMap: Map<string, SitePage>): void {
  const changelogPages = Array.from(pageMap.values()).filter(isMainChangelogSitePage);
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

      const outputPath = tabPath(page.tabSlug, `${changelog.slug}/${version.id}/index.html`);
      pageMap.set(outputPath, {
        outputPath,
        currentPage: { kind: "changelog", changelog: permalinkPage },
        spec: page.spec,
        tabSlug: page.tabSlug,
        pageSlug: `${page.pageSlug}--${version.id}`,
      });
    }
  }
}

async function loadSpecs(tabs: ResolvedTab[]): Promise<Map<string, NormalizedSpec>> {
  const specsBySlug = new Map<string, NormalizedSpec>();

  for (const tab of tabs) {
    if (tab.openapi) {
      const loaded = await loadSpec(tab.openapi);
      const parsed = await parseSpec(loaded);
      const openapi3 = await convertToOpenApi3(parsed);
      specsBySlug.set(tab.slug, normalizeSpec(openapi3));
    } else if (tab.mcp) {
      const { parse } = await import("mcp-parser");
      const mcpSpec = await parse(tab.mcp);
      specsBySlug.set(tab.slug, normalizeMcpSpec(mcpSpec));
    }
  }

  return specsBySlug;
}

async function loadCustomCSS(paths: string[]): Promise<string> {
  const parts: string[] = [];
  for (const path of paths) {
    parts.push(await readFile(path, "utf-8"));
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
  if (!pathOrUrl || pathOrUrl.startsWith("data:") || pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  const abs = resolve(pathOrUrl);
  const mime = MIME_TYPES[extname(abs).toLowerCase()] ?? "application/octet-stream";
  const data = await readFile(abs);
  return `data:${mime};base64,${data.toString("base64")}`;
}

function isMainChangelogSitePage(
  page: SitePage,
): page is SitePage & { currentPage: { kind: "changelog"; changelog: ChangelogPage } } {
  return page.currentPage.kind === "changelog" && !page.currentPage.changelog.permalinkVersionId;
}

function isSearchableDocsSitePage(
  page: SitePage,
): page is SitePage & { currentPage: { kind: "markdown"; markdown: MarkdownPage } | { kind: "changelog"; changelog: ChangelogPage } } {
  return page.currentPage.kind === "markdown" || isMainChangelogSitePage(page);
}

function createFeedLinks(atomPath: string, rssPath: string, title: string) {
  return [
    { href: atomPath, type: "application/atom+xml", title: `${title} Atom Feed` },
    { href: rssPath, type: "application/rss+xml", title: `${title} RSS Feed` },
  ];
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
  return html.replace(/href="([^"]+)"/g, (match, href: string) => {
    const resolved = resolveInternalHref(href, outputPath, docsSourcePath, pathMap, sourceBase);
    return resolved ? `href="${resolved}"` : match;
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
