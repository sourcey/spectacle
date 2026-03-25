import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";
import tailwindcss from "@tailwindcss/vite";
import preact from "@preact/preset-vite";
import { renderPage } from "./static-renderer.js";
import type { NormalizedSpec } from "../core/types.js";
import type { RenderOptions, CurrentPage, SiteConfig } from "./context.js";
import type { SiteNavigation } from "../core/navigation.js";
import { withActivePage } from "../core/navigation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

/**
 * Resolve client entry and CSS paths. Works from both source tree (dev) and
 * published npm package (dist-only) by checking which paths exist.
 */
async function resolveAssetPaths(): Promise<{ clientEntry: string; sourceyCssPath: string }> {
  const srcClient = resolve(projectRoot, "src/client/index.ts");
  const distClient = resolve(projectRoot, "dist/client/index.js");
  const srcCss = resolve(projectRoot, "src/themes/default/sourcey.css");
  const distCss = resolve(projectRoot, "dist/themes/default/sourcey.css");

  const clientEntry = await exists(srcClient) ? srcClient : distClient;
  const sourceyCssPath = await exists(srcCss) ? srcCss : distCss;

  return { clientEntry, sourceyCssPath };
}

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

  if (pages.length > 0 && pages[0].outputPath !== "index.html") {
    const first = pages[0];
    const activeNav = withActivePage(navigation, first.tabSlug, first.pageSlug);
    const renderOptions: RenderOptions = { embeddable: options?.embeddable ?? false, assetBase: "" };
    const html = renderPage(first.spec, renderOptions, activeNav, first.currentPage, site);
    await writeFile(resolve(resolvedDir, "index.html"), html, "utf-8");
  }

  await buildAssets(resolvedDir);

  if (options?.searchIndex) {
    await writeFile(resolve(resolvedDir, "search-index.json"), options.searchIndex, "utf-8");
  }

  return { htmlPath: resolve(resolvedDir, "index.html"), outputDir: resolvedDir };
}

/**
 * Build client JS + Tailwind CSS via Vite.
 * Same plugins as the dev server — preact() + tailwindcss().
 */
async function buildAssets(outputDir: string): Promise<void> {
  const { clientEntry, sourceyCssPath } = await resolveAssetPaths();

  await viteBuild({
    root: projectRoot,
    logLevel: "silent",
    plugins: [preact(), tailwindcss()],
    build: {
      outDir: outputDir,
      emptyOutDir: false,
      cssMinify: true,
      minify: true,
      lib: {
        entry: clientEntry,
        formats: ["iife"],
        name: "Sourcey",
        fileName: () => "sourcey.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "sourcey.js",
          assetFileNames: "sourcey.[ext]",
        },
      },
    },
  });

  // Append component CSS
  const componentCSS = await readFile(sourceyCssPath, "utf-8");
  const builtCSS = await readFile(resolve(outputDir, "sourcey.css"), "utf-8").catch(() => "");
  await writeFile(resolve(outputDir, "sourcey.css"), builtCSS + "\n" + componentCSS, "utf-8");
}
