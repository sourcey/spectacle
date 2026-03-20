import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";
import { renderPage } from "./static-renderer.js";
import type { NormalizedSpec } from "../core/types.js";
import type { RenderOptions, CurrentPage, SiteConfig } from "./context.js";
import type { SiteNavigation } from "../core/navigation.js";
import { withActivePage } from "../core/navigation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface BuildOutput {
  htmlPath: string;
  outputDir: string;
}

export interface SitePage {
  outputPath: string;
  currentPage: CurrentPage;
  spec: NormalizedSpec;
  tabSlug: string;
  pageSlug: string;
}

/**
 * Build a documentation site.
 * Renders each page as a standalone HTML file with shared navigation,
 * plus shared CSS, JS, and search index.
 */
export async function buildSite(
  pages: SitePage[],
  navigation: SiteNavigation,
  outputDir: string,
  site: SiteConfig,
  options?: { embeddable?: boolean; searchIndex?: string },
): Promise<BuildOutput> {
  const resolvedDir = resolve(outputDir);
  await mkdir(resolvedDir, { recursive: true });

  for (const page of pages) {
    const pageDir = dirname(resolve(resolvedDir, page.outputPath));
    await mkdir(pageDir, { recursive: true });

    const depth = page.outputPath.split("/").length - 1;
    const assetBase = depth > 0 ? "../".repeat(depth) : "";

    const renderOptions: RenderOptions = {
      embeddable: options?.embeddable ?? false,
      assetBase,
    };

    const activeNav = withActivePage(navigation, page.tabSlug, page.pageSlug);
    const html = renderPage(page.spec, renderOptions, activeNav, page.currentPage, site);
    await writeFile(resolve(resolvedDir, page.outputPath), html, "utf-8");
  }

  // Redirect index.html → first page
  if (pages.length > 0) {
    const firstPage = pages[0].outputPath;
    const redirectHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${firstPage}"><title>Redirecting…</title></head><body><a href="${firstPage}">Redirecting…</a></body></html>`;
    await writeFile(resolve(resolvedDir, "index.html"), redirectHtml, "utf-8");
  }

  await writeThemeCSS(resolvedDir);
  await bundleClientJS(resolvedDir);

  if (options?.searchIndex) {
    await writeFile(resolve(resolvedDir, "search-index.json"), options.searchIndex, "utf-8");
  }

  return { htmlPath: resolve(resolvedDir, "index.html"), outputDir: resolvedDir };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function writeThemeCSS(outputDir: string): Promise<void> {
  const cssPath = resolve(__dirname, "../themes/default/sourcey.css");
  const css = await readFile(cssPath, "utf-8");
  await writeFile(resolve(outputDir, "sourcey.css"), css, "utf-8");
}

async function bundleClientJS(outputDir: string): Promise<void> {
  const clientEntry = resolve(__dirname, "../client/index.js");

  await viteBuild({
    root: process.cwd(),
    logLevel: "silent",
    build: {
      outDir: outputDir,
      emptyOutDir: false,
      lib: {
        entry: clientEntry,
        formats: ["iife"],
        name: "Sourcey",
        fileName: () => "sourcey.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "sourcey.js",
        },
      },
      minify: true,
    },
  });
}
