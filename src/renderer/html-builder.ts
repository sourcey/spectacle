import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSpec, renderPage } from "./static-renderer.js";
import type { NormalizedSpec } from "../core/types.js";
import type { RenderOptions, CurrentPage } from "./context.js";
import type { SiteNavigation } from "../core/navigation.js";
import { withActivePage } from "../core/navigation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Client module load order */
const CLIENT_MODULES = [
  "sidebar.js",
  "scroll-tracker.js",
  "tabs.js",
  "copy.js",
  "theme-toggle.js",
  "search.js",
];

export interface HtmlBuildOptions extends Partial<RenderOptions> {
  /** CSS custom property overrides, e.g. { "--color-accent": "#e11d48" } */
  themeOverrides?: Record<string, string>;
}

export interface BuildOutput {
  /** Path to the generated index.html */
  htmlPath: string;
  /** Output directory */
  outputDir: string;
}

// ---------------------------------------------------------------------------
// Legacy single-spec build (unchanged)
// ---------------------------------------------------------------------------

/**
 * Render a spec and write the output files to disk.
 */
export async function buildHtml(
  spec: NormalizedSpec,
  outputDir: string,
  options?: HtmlBuildOptions,
): Promise<BuildOutput> {
  const resolvedDir = resolve(outputDir);
  await mkdir(resolvedDir, { recursive: true });

  const renderOptions: RenderOptions = {
    embeddable: options?.embeddable ?? false,
    singleFile: options?.singleFile ?? false,
    assetBase: options?.assetBase ?? "",
  };

  const html = renderSpec(spec, renderOptions);
  const htmlPath = resolve(resolvedDir, "index.html");

  await writeFile(htmlPath, html, "utf-8");

  // Copy CSS from theme, appending any custom overrides
  await writeThemeCSS(resolvedDir, options?.themeOverrides);

  // Write client JS
  const js = await bundleClientJS();
  await writeFile(resolve(resolvedDir, "spectacle.js"), js, "utf-8");

  return { htmlPath, outputDir: resolvedDir };
}

// ---------------------------------------------------------------------------
// Multi-page site build (new)
// ---------------------------------------------------------------------------

/**
 * A single page to be rendered in a multi-page site.
 */
export interface SitePage {
  /** Output path relative to site root, e.g. "guides/quickstart.html" */
  outputPath: string;
  /** What this page renders */
  currentPage: CurrentPage;
  /** The spec to provide via SpecContext (can be a stub for markdown-only pages) */
  spec: NormalizedSpec;
  /** Which tab this page belongs to */
  tabSlug: string;
  /** This page's unique slug for active-state matching */
  pageSlug: string;
}

/**
 * Build a multi-page documentation site.
 * Renders each page as a standalone HTML file with shared navigation,
 * plus shared CSS, JS, and search index.
 */
export async function buildSite(
  pages: SitePage[],
  navigation: SiteNavigation,
  outputDir: string,
  options?: HtmlBuildOptions & { searchIndex?: string },
): Promise<BuildOutput> {
  const resolvedDir = resolve(outputDir);
  await mkdir(resolvedDir, { recursive: true });

  // Render each page
  for (const page of pages) {
    const pageDir = dirname(resolve(resolvedDir, page.outputPath));
    await mkdir(pageDir, { recursive: true });

    // Calculate asset base from page depth
    const depth = page.outputPath.split("/").length - 1;
    const assetBase = depth > 0 ? "../".repeat(depth) : "";

    const renderOptions: RenderOptions = {
      embeddable: false,
      singleFile: false,
      assetBase,
    };

    const activeNav = withActivePage(navigation, page.tabSlug, page.pageSlug);
    const html = renderPage(page.spec, renderOptions, activeNav, page.currentPage);
    await writeFile(resolve(resolvedDir, page.outputPath), html, "utf-8");
  }

  // Write redirect index.html → first page
  if (pages.length > 0) {
    const firstPage = pages[0].outputPath;
    const redirectHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${firstPage}"><title>Redirecting…</title></head><body><a href="${firstPage}">Redirecting…</a></body></html>`;
    await writeFile(resolve(resolvedDir, "index.html"), redirectHtml, "utf-8");
  }

  // Write shared assets
  await writeThemeCSS(resolvedDir, options?.themeOverrides);
  const js = await bundleClientJS();
  await writeFile(resolve(resolvedDir, "spectacle.js"), js, "utf-8");

  // Write search index if provided
  if (options?.searchIndex) {
    await writeFile(resolve(resolvedDir, "search-index.json"), options.searchIndex, "utf-8");
  }

  return { htmlPath: resolve(resolvedDir, "index.html"), outputDir: resolvedDir };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function writeThemeCSS(
  outputDir: string,
  themeOverrides?: Record<string, string>,
): Promise<void> {
  const cssPath = resolve(__dirname, "../themes/default/spectacle.css");
  let css = await readFile(cssPath, "utf-8");

  if (themeOverrides && Object.keys(themeOverrides).length > 0) {
    const overrides = Object.entries(themeOverrides)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join("\n");
    css += `\n/* Theme overrides */\n:root {\n${overrides}\n}\n`;
  }

  await writeFile(resolve(outputDir, "spectacle.css"), css, "utf-8");
}

/**
 * Bundle client-side JavaScript from src/client/ modules.
 */
async function bundleClientJS(): Promise<string> {
  const clientDir = resolve(__dirname, "../client");
  const parts = ["// Spectacle 2.0 Client\n'use strict';\n"];

  for (const mod of CLIENT_MODULES) {
    const src = await readFile(join(clientDir, mod), "utf-8");
    parts.push(src);
  }

  return parts.join("\n");
}
