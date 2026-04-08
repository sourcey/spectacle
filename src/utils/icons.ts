/**
 * Heroicons (outline, 24x24) — MIT License
 * https://heroicons.com
 *
 * Loads ALL 324 outline icons from the heroicons package at build time.
 * Icon names use kebab-case (e.g. "arrow-right", "academic-cap").
 * Render with: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${path}</svg>`
 */

import { readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const outlineDir = join(
  require.resolve("heroicons/package.json"),
  "..",
  "24",
  "outline",
);

/**
 * Extract inner SVG content (everything between the opening <svg> and closing </svg> tags).
 */
function extractInnerSvg(svgContent: string): string {
  return svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();
}

const icons: Record<string, string> = {};

for (const file of readdirSync(outlineDir)) {
  if (!file.endsWith(".svg")) continue;
  const name = basename(file, ".svg");
  const raw = readFileSync(join(outlineDir, file), "utf-8");
  icons[name] = extractInnerSvg(raw);
}

/**
 * Return raw inner SVG content for a named icon, or undefined.
 */
export function iconPath(name: string): string | undefined {
  return icons[name];
}

/**
 * Render a Heroicon as an inline SVG string.
 * Returns empty string if the icon name is not found.
 */
export function renderIcon(name: string): string {
  const path = icons[name];
  if (!path) return "";
  return `<svg class="card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">${path}</svg>`;
}
