import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { buildSite as buildSiteHtml } from "./renderer/html-builder.js";
import type { SitePage } from "./renderer/html-builder.js";
import type { ChangelogDiagnostic, NormalizedChangelogVersion, NormalizedSpec } from "./core/types.js";
import type { ResolvedConfig } from "./config.js";
import { loadConfig, configFromSpec } from "./config.js";
import { buildSiteNavigation } from "./core/navigation.js";
import { buildSearchIndex } from "./core/search-indexer.js";
import { generateLlmsTxt, generateLlmsFullTxt } from "./renderer/llms.js";
import {
  assembleSite,
  buildSiteConfig,
  collectDocsPagesByTab,
  createMinimalSpec,
  enforceChangelogDiagnostics,
} from "./site-assembly.js";
import { toPublicPath } from "./site-url.js";

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

  const assembled = await assembleSite(config);
  const site = await buildSiteConfig(config);
  const sitePages = Array.from(assembled.pageMap.values());
  const navigation = buildSiteNavigation(assembled.siteTabs);

  enforceChangelogDiagnostics(assembled.changelogDiagnostics, options.strictChangelog);

  const docsPagesByTab = collectDocsPagesByTab(assembled.pageMap, config.tabs);
  const searchIndex = buildSearchIndex(
    assembled.specsBySlug,
    docsPagesByTab,
    navigation,
    config.baseUrl || "/",
    config.search.featured,
    config.prettyUrls,
  );
  const llmsTxt = generateLlmsTxt(sitePages, navigation, site);
  const llmsFullTxt = generateLlmsFullTxt(sitePages, navigation, site);

  const extraFiles = new Map(assembled.extraFiles);
  const ogImages = new Map<string, Buffer>();

  if (config.prettyUrls === "strip") {
    const rules = buildStripRedirectRules(sitePages, config.baseUrl);
    if (rules) extraFiles.set("_redirects", rules);
  }

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
    const staticOg = config.ogImage;
    if (staticOg.startsWith("http://") || staticOg.startsWith("https://") || staticOg.startsWith("data:")) {
      for (const page of sitePages) {
        page.ogImagePath = staticOg;
      }
    } else {
      const ogPath = `_og/static${extname(staticOg) || ".png"}`;
      extraFiles.set(ogPath, await readFile(staticOg));
      for (const page of sitePages) {
        page.ogImagePath = ogPath;
      }
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
    changelogDiagnostics: assembled.changelogDiagnostics,
    _specs: assembled.specsBySlug,
  };
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

/**
 * Build Netlify/Cloudflare-Pages redirect rules that canonicalise every page onto
 * its extensionless, slash-less URL. Emitted only when `prettyUrls === "strip"`.
 *
 * For each page at `dir/slug/index.html` the user sees `/dir/slug`; redirect
 * `/dir/slug/` and (for backwards compatibility with pre-rename bookmarks)
 * `/dir/slug.html` onto it.
 */
function buildStripRedirectRules(pages: SitePage[], baseUrl: string): string | null {
  const lines: string[] = [
    "# Generated by Sourcey: pretty URL canonicalisation",
  ];
  const seen = new Set<string>();

  for (const page of pages) {
    const canonical = toPublicPath(page.outputPath, baseUrl, "strip");
    if (canonical === "/" || canonical === "") continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    // Trailing-slash variant (what the file system would naturally serve).
    lines.push(`${canonical}/ ${canonical} 301`);
    // Stale `.html` bookmarks from before the migration.
    lines.push(`${canonical}.html ${canonical} 301`);
  }

  return lines.length > 1 ? `${lines.join("\n")}\n` : null;
}

function summarizeVersion(version: NormalizedChangelogVersion): string | undefined {
  if (version.summary) return version.summary;
  const texts = version.sections.flatMap((section) => section.entries.map((entry) => entry.text));
  const summary = texts.slice(0, 3).join(" ");
  return summary || undefined;
}

export { defineConfig } from "./config.js";
export { resolveInternalLinks } from "./site-assembly.js";

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
