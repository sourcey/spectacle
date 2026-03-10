import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSpec } from "./static-renderer.js";
import type { NormalizedSpec } from "../core/types.js";
import type { RenderOptions } from "./context.js";

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
  const cssPath = resolve(__dirname, "../themes/default/spectacle.css");
  let css = await readFile(cssPath, "utf-8");

  if (options?.themeOverrides && Object.keys(options.themeOverrides).length > 0) {
    const overrides = Object.entries(options.themeOverrides)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join("\n");
    css += `\n/* Theme overrides */\n:root {\n${overrides}\n}\n`;
  }

  await writeFile(resolve(resolvedDir, "spectacle.css"), css, "utf-8");

  // Write client JS
  const js = await bundleClientJS();
  await writeFile(resolve(resolvedDir, "spectacle.js"), js, "utf-8");

  return { htmlPath, outputDir: resolvedDir };
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
