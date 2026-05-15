import { readFileSync } from "node:fs";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { load as parseYaml } from "js-yaml";
import type { ResolvedGroup, ResolvedPage } from "../config.js";
import type { MarkdownPreprocessor } from "../core/markdown-loader.js";
import type { MkDocsSourceOptions, SourceAdapter } from "./types.js";
import { assertLocalPath, collectStaticAssets } from "./shared.js";

interface MkDocsConfigFile {
  docs_dir?: unknown;
  nav?: unknown;
  pages?: unknown;
}

interface MkDocsNavPage {
  path: string;
  label?: string;
}

export function mkdocs(options: MkDocsSourceOptions): SourceAdapter {
  return {
    name: "mkdocs",
    async resolve(ctx) {
      const configPath = assertLocalPath(ctx, options.config, "MkDocs config");
      await ctx.assertExists(
        configPath,
        `MkDocs config "${options.config}" in tab "${ctx.tabName}"`,
      );
      const { docsDir, groups } = await resolveMkDocsGroups(configPath);
      return {
        kind: "markdown",
        adapter: "mkdocs",
        configPath,
        groups,
        assets: await collectStaticAssets(docsDir),
        watchPaths: [configPath, docsDir],
      };
    },
  };
}

async function resolveMkDocsGroups(
  configPath: string,
): Promise<{ docsDir: string; groups: ResolvedGroup[] }> {
  const raw = await readFile(configPath, "utf-8");
  const parsed = parseYaml(sanitizeMkDocsYaml(raw)) as MkDocsConfigFile | null;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`MkDocs config must be a YAML object: ${configPath}`);
  }

  const configDir = dirname(configPath);
  const docsDirName =
    typeof parsed.docs_dir === "string" && parsed.docs_dir.trim() ? parsed.docs_dir.trim() : "docs";
  const docsDir = resolve(configDir, docsDirName);

  const nav = parsed.nav ?? parsed.pages;
  const groups = Array.isArray(nav)
    ? mkDocsGroupsFromNav(nav, docsDir)
    : [{ label: "Pages", pages: await discoverMkDocsPages(docsDir) }];

  const nonEmptyGroups = groups.filter((group) => group.pages.length > 0);
  if (nonEmptyGroups.length === 0) {
    throw new Error(`MkDocs config did not resolve any markdown pages: ${configPath}`);
  }

  for (const group of nonEmptyGroups) {
    for (const page of group.pages) {
      await access(page.file).catch(() => {
        throw new Error(
          `MkDocs nav page "${relative(docsDir, page.file).replace(/\\/g, "/")}" not found`,
        );
      });
    }
  }
  return { docsDir, groups: nonEmptyGroups };
}

function sanitizeMkDocsYaml(raw: string): string {
  return raw.replace(/!!python\/name:[^\s\]]+/g, "").replace(/!ENV\b/g, "");
}

function mkDocsGroupsFromNav(nav: unknown[], docsDir: string): ResolvedGroup[] {
  const groups: ResolvedGroup[] = [];
  const loosePages: ResolvedPage[] = [];
  const seenPaths = new Set<string>();

  for (const entry of nav) {
    if (typeof entry === "string") {
      const page = resolveMkDocsNavPage({ path: entry }, docsDir, seenPaths);
      if (page) loosePages.push(page);
      continue;
    }

    if (!isPlainRecord(entry)) continue;

    for (const [label, value] of Object.entries(entry)) {
      if (typeof value === "string") {
        const page = resolveMkDocsNavPage({ path: value, label }, docsDir, seenPaths);
        if (page) loosePages.push(page);
        continue;
      }

      const pages = collectMkDocsNavPages(value, [])
        .map((page) => resolveMkDocsNavPage(page, docsDir, seenPaths))
        .filter((page): page is ResolvedPage => Boolean(page));
      if (pages.length > 0) {
        groups.push({ label, pages });
      }
    }
  }

  return loosePages.length > 0 ? [{ label: "Pages", pages: loosePages }, ...groups] : groups;
}

function collectMkDocsNavPages(value: unknown, labelParts: string[]): MkDocsNavPage[] {
  if (typeof value === "string") {
    return [
      {
        path: value,
        label: isMkDocsIndexPage(value) ? labelParts.join(" / ") || undefined : undefined,
      },
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectMkDocsNavPages(entry, labelParts));
  }

  if (!isPlainRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([label, nested]) => {
    if (typeof nested === "string") {
      return [
        {
          path: nested,
          label: [...labelParts, label].join(" / "),
        },
      ];
    }
    return collectMkDocsNavPages(nested, [...labelParts, label]);
  });
}

function resolveMkDocsNavPage(
  page: MkDocsNavPage,
  docsDir: string,
  seenPaths: Set<string>,
): ResolvedPage | undefined {
  const navPath = normalizeMkDocsPagePath(page.path);
  if (!navPath || seenPaths.has(navPath)) {
    return undefined;
  }
  const file = resolveWithinRoot(docsDir, navPath);
  if (!file) {
    throw new Error(`MkDocs nav page "${page.path}" escapes docs_dir: ${docsDir}`);
  }
  seenPaths.add(navPath);

  return {
    slug: slugFromMkDocsPath(navPath),
    file,
    label: page.label,
    sourceRoot: docsDir,
    preprocess: [preprocessMkDocsMarkdown],
  };
}

function normalizeMkDocsPagePath(value: string): string | undefined {
  const text = value.trim();
  if (!text || isExternalNavTarget(text) || !/\.(?:md|mdx)$/i.test(text)) {
    return undefined;
  }
  return text.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isExternalNavTarget(value: string): boolean {
  return /^(?:https?:|mailto:|tel:|#)/i.test(value);
}

function slugFromMkDocsPath(value: string): string {
  return value.replace(/\.(?:md|mdx)$/i, "");
}

function isMkDocsIndexPage(value: string): boolean {
  return /(^|\/)index\.(?:md|mdx)$/i.test(value.trim());
}

async function discoverMkDocsPages(docsDir: string): Promise<ResolvedPage[]> {
  const pages: ResolvedPage[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.name.startsWith(".")) continue;
      const absolutePath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile() || !/\.(?:md|mdx)$/i.test(entry.name)) continue;
      const relPath = relative(docsDir, absolutePath).replace(/\\/g, "/");
      pages.push({
        slug: slugFromMkDocsPath(relPath),
        file: absolutePath,
        sourceRoot: docsDir,
        preprocess: [preprocessMkDocsMarkdown],
      });
    }
  }

  await walk(docsDir);
  return pages;
}

export const preprocessMkDocsMarkdown: MarkdownPreprocessor = (body, context) => {
  if (!context.sourceRoot) return body;
  return normalizeMkDocsAdmonitions(
    normalizeMkDocsTabs(
      escapeMkDocsCppTemplateAngles(
        stripMkDocsInlineLanguageMarkers(
          expandMkDocsSnippets(body, context.filePath, context.sourceRoot),
        ),
      ),
    ),
  );
};

function expandMkDocsSnippets(body: string, filePath: string, sourceRoot: string): string {
  return body
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)--8<--\s+"([^"]+)"\s*$/);
      if (!match) return line;

      const [, indent, includePath] = match;
      const included = readMkDocsSnippet(includePath, filePath, sourceRoot);
      if (included === undefined) return line;
      return included
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((includedLine) => (includedLine ? `${indent}${includedLine}` : includedLine))
        .join("\n");
    })
    .join("\n");
}

function readMkDocsSnippet(
  includePath: string,
  filePath: string,
  sourceRoot: string,
): string | undefined {
  const candidates = uniquePaths([
    isAbsolute(includePath) ? includePath : resolve(sourceRoot, includePath),
    isAbsolute(includePath) ? includePath : resolve(dirname(filePath), includePath),
  ]);
  const safeCandidates = candidates.filter((candidate) => isWithinRoot(sourceRoot, candidate));
  if (safeCandidates.length === 0) {
    throw new Error(`MkDocs snippet "${includePath}" escapes docs_dir: ${sourceRoot}`);
  }

  for (const candidate of safeCandidates) {
    try {
      return readFileSync(candidate, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return undefined;
}

function stripMkDocsInlineLanguageMarkers(body: string): string {
  return body
    .replace(/`#!([A-Za-z0-9_+.-]+)\s+([^`]+)`/g, "`$2`")
    .replace(/`#!([A-Za-z0-9_+.-]+)\s*`/g, "");
}

function escapeMkDocsCppTemplateAngles(body: string): string {
  return body.replace(/<([A-Za-z_][A-Za-z0-9_:]*)(\\?)>/g, (match, name: string, escaped: string) => {
    if (!escaped && HTML_TAG_NAMES.has(name.toLowerCase())) return match;
    return `&lt;${name}&gt;`;
  });
}

const HTML_TAG_NAMES = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "button",
  "caption",
  "code",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

function normalizeMkDocsTabs(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; ) {
    const tab = lines[i].match(/^(\s*)===\s+"([^"]+)"\s*$/);
    if (!tab) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const [, indent, title] = tab;
    out.push(`${indent}**${title}**`);
    i += 1;

    while (i < lines.length) {
      if (lines[i].match(new RegExp(`^${escapeRegExp(indent)}===\\s+"[^"]+"\\s*$`))) {
        break;
      }
      if (/^\s*$/.test(lines[i])) {
        out.push(lines[i]);
        i += 1;
        continue;
      }
      if (!lines[i].startsWith(`${indent}    `)) {
        break;
      }
      out.push(indent + lines[i].slice(indent.length + 4));
      i += 1;
    }
  }

  return out.join("\n");
}

function normalizeMkDocsAdmonitions(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; ) {
    const admonition = lines[i].match(/^(\s*)(!!!|\?\?\?)\s+([A-Za-z0-9_-]+)(?:\s+"([^"]+)")?\s*$/);
    if (!admonition) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const [, indent, , type, title] = admonition;
    out.push(`${indent}> **${formatMkDocsAdmonitionTitle(type, title)}**`);
    i += 1;

    const content: string[] = [];
    while (i < lines.length) {
      if (/^\s*$/.test(lines[i])) {
        content.push("");
        i += 1;
        continue;
      }
      if (!lines[i].startsWith(`${indent}    `)) {
        break;
      }
      content.push(lines[i].slice(indent.length + 4));
      i += 1;
    }

    for (const line of normalizeMkDocsAdmonitions(content.join("\n")).split("\n")) {
      out.push(line ? `${indent}> ${line}` : `${indent}>`);
    }
  }

  return out.join("\n");
}

function formatMkDocsAdmonitionTitle(type: string, title?: string): string {
  if (title?.trim()) return title.trim();
  return type.slice(0, 1).toUpperCase() + type.slice(1).replace(/-/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveWithinRoot(root: string, path: string): string | undefined {
  const candidate = resolve(root, path);
  return isWithinRoot(root, candidate) ? candidate : undefined;
}

function isWithinRoot(root: string, candidate: string): boolean {
  const rootAbs = resolve(root);
  const candidateAbs = resolve(candidate);
  const rel = relative(rootAbs, candidateAbs);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}
