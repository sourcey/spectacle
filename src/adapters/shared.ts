import { access, readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import type { ResolvedGroup, ResolvedPage } from "../config.js";
import { slugFromPath } from "../core/markdown-loader.js";
import type { PageMarkdownOptions, ResolvedSourceAsset, SourceAdapterContext } from "./types.js";

export const STATIC_ASSET_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".bmp",
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".mjs",
  ".mp4",
  ".pdf",
  ".png",
  ".svg",
  ".txt",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

export async function resolveMarkdownGroups(
  groups: { group: string; pages: string[] }[],
  tabName: string,
  configDir: string,
  markdown?: PageMarkdownOptions,
): Promise<ResolvedGroup[]> {
  const resolved: ResolvedGroup[] = [];

  for (const group of groups) {
    if (!group.group) throw new Error(`Group missing "group" name in tab "${tabName}"`);
    if (!group.pages?.length)
      throw new Error(`Group "${group.group}" in tab "${tabName}" has no pages`);

    const pages: ResolvedPage[] = [];
    for (const pageSlug of group.pages) {
      if (pageSlug.includes("*")) {
        const expanded = await expandGlob(pageSlug, configDir);
        for (const file of expanded) {
          const rel = relative(configDir, file).replace(/\.[^.]+$/, "");
          pages.push({ slug: rel, file, ...markdown });
        }
      } else {
        const absPath = await resolvePagePath(pageSlug, configDir);
        pages.push({ slug: pageSlug, file: absPath, ...markdown });
      }
    }

    resolved.push({ label: group.group, pages });
  }

  return resolved;
}

export async function collectStaticAssets(sourceRoot: string): Promise<ResolvedSourceAsset[]> {
  const assets: ResolvedSourceAsset[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.name.startsWith(".")) continue;
      const absolutePath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!STATIC_ASSET_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
      assets.push({
        file: absolutePath,
        outputPath: relative(sourceRoot, absolutePath).replace(/\\/g, "/"),
      });
    }
  }

  await walk(sourceRoot);
  return assets;
}

export function toWatchPaths(paths: Array<string | undefined>): string[] {
  return paths.filter((path): path is string => Boolean(path));
}

export function assertLocalPath(ctx: SourceAdapterContext, source: string, label: string): string {
  if (ctx.isUrl(source)) {
    throw new Error(`${label} "${source}" in tab "${ctx.tabName}" must be a local file path`);
  }
  return ctx.resolvePath(source);
}

/**
 * Expand a simple glob pattern like "doc/api-*" into matching .md/.mdx files.
 * Supports trailing * only (e.g. "doc/api-*", "guides/*").
 */
async function expandGlob(pattern: string, configDir: string): Promise<string[]> {
  const absPattern = resolve(configDir, pattern);
  const dir = dirname(absPattern);
  const prefix = basename(absPattern).replace("*", "");
  let entries: Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Glob directory not found: ${dir}`);
    }
    throw err;
  }

  const matches = entries
    .filter(
      (entry) => entry.isFile() && entry.name.startsWith(prefix) && /\.(md|mdx)$/i.test(entry.name),
    )
    .map((entry) => join(dir, entry.name))
    .sort();

  if (matches.length === 0) {
    throw new Error(`Glob "${pattern}" matched no files in ${dir}`);
  }

  return matches;
}

async function resolvePagePath(pageSlug: string, configDir: string): Promise<string> {
  const direct = resolve(configDir, pageSlug);
  const candidates = extname(direct)
    ? [direct]
    : [`${direct}.md`, `${direct}.mdx`, join(direct, "index.md"), join(direct, "index.mdx")];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // keep trying candidates
    }
  }

  throw new Error(
    `Page "${pageSlug}" not found. Tried:\n` +
      candidates.map((candidate) => `  - ${candidate}`).join("\n") +
      `\n\nPages are referenced relative to sourcey.config.ts. ` +
      `Use slugs like "getting-started" for getting-started.md or "run/index" for run/index.md.`,
  );
}

export function outputSlugForPage(page: ResolvedPage): string {
  return slugFromPath(page.slug);
}
