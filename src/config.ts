import { access, readdir } from "node:fs/promises";
import { resolve, relative, dirname, basename, extname } from "node:path";
import { createJiti } from "jiti";
import { normalizeBaseUrl, normalizeSiteUrl } from "./site-url.js";

// ---------------------------------------------------------------------------
// User-facing config types (used in sourcey.config.ts)
// ---------------------------------------------------------------------------

export type ThemePreset = "default" | "minimal" | "api-first";

export interface ThemeConfig {
  preset?: ThemePreset;
  colors?: {
    primary: string;
    light?: string;
    dark?: string;
  };
  fonts?: {
    sans?: string;
    mono?: string;
  };
  layout?: {
    sidebar?: string;
    toc?: string;
    content?: string;
  };
  css?: string[];
}

export interface ChangelogConfig {
  /** Disable changelog auto-detection for CHANGELOG.md and layout: changelog pages. */
  enabled?: boolean;
  /** Generate Atom and RSS feeds for changelog pages. */
  feed?: boolean | { title?: string; description?: string };
  /** Generate standalone per-version changelog pages. */
  permalinks?: boolean;
  /** Generate dedicated OG images for per-version changelog pages. */
  ogImages?: boolean;
}

export interface SourceyConfig {
  name?: string;
  /** Public site origin for absolute feeds, OG metadata, and canonical URLs (e.g. "https://docs.example.com"). */
  siteUrl?: string;
  /** Public path prefix when the docs are served from a subpath (e.g. "/reference"). */
  baseUrl?: string;
  theme?: ThemeConfig;
  logo?: string | {
    light: string;
    dark?: string;
    href?: string;
  };
  favicon?: string;
  /** Static OG image URL or local path. When set, skips automatic per-page OG image generation. */
  ogImage?: string;
  /** GitHub repo URL (e.g. "https://github.com/user/repo"). */
  repo?: string;
  /** Branch name for "Edit this page" links (e.g. "main", "master"). When set, enables edit links on markdown pages. */
  editBranch?: string;
  /** Base path prepended to source file paths in "Edit this page" URLs. Use when docs source lives in a subdirectory of the repo (e.g. "docs"). */
  editBasePath?: string;
  /**
   * Which languages to auto-generate code samples for.
   * Available: "curl", "javascript", "typescript", "python", "go", "ruby", "java", "php", "rust", "csharp"
   * @default ["curl", "javascript", "python"]
   */
  codeSamples?: string[];
  navigation: {
    tabs: TabConfig[];
  };
  navbar?: {
    links?: NavbarLink[];
    primary?: { type: "button"; label: string; href: string };
  };
  footer?: {
    links?: NavbarLink[];
  };
  changelog?: false | ChangelogConfig;
  /** Search configuration. */
  search?: {
    /** Page slugs to feature at the top of search results when no query is entered. */
    featured?: string[];
  };
}

export type DoxygenIndexStyle = "auto" | "rich" | "structured" | "flat" | "none";

export interface DoxygenConfig {
  /** Path to Doxygen XML output directory */
  xml: string;
  /** Programming language (default: "cpp") */
  language?: string;
  /** Use Doxygen groups for navigation grouping */
  groups?: boolean;
  /**
   * Index page style for the API reference landing page.
   * - "auto": pick the best format based on available data (default)
   * - "rich": card grid with module descriptions (requires groups with descriptions)
   * - "structured": grouped list of types by module/namespace
   * - "flat": alphabetical list categorized by kind (classes, structs, etc.)
   * - "none" or false: no index page, land on the first API page
   */
  index?: DoxygenIndexStyle | false;
}

export interface TabConfig {
  tab: string;
  /** Custom URL slug for this tab. Defaults to slugified tab name. */
  slug?: string;
  openapi?: string;
  groups?: GroupConfig[];
  doxygen?: DoxygenConfig;
  /** Path to an mcp.json file (MCP server snapshot). */
  mcp?: string;
}

export interface GroupConfig {
  group: string;
  pages: string[];
}

export type LinkType = "github" | "twitter" | "discord" | "linkedin" | "youtube" | "slack" | "mastodon" | "bluesky" | "reddit" | "npm" | "link";

export interface NavbarLink {
  type: LinkType;
  href: string;
  label?: string;
}

export function defineConfig(config: SourceyConfig): SourceyConfig {
  return config;
}

// ---------------------------------------------------------------------------
// Resolved config types (internal, after validation + path resolution)
// ---------------------------------------------------------------------------

export interface ResolvedTheme {
  preset: ThemePreset;
  colors: { primary: string; light: string; dark: string };
  fonts: { sans: string; mono: string; googleFont: string };
  layout: { sidebar: string; toc: string; content: string };
  css: string[];
}

export interface ResolvedChangelogConfig {
  enabled: boolean;
  feed: false | { title?: string; description?: string };
  permalinks: boolean;
  ogImages: boolean;
}

export interface ResolvedConfig {
  name: string;
  siteUrl?: string;
  baseUrl: string;
  theme: ResolvedTheme;
  logo?: { light?: string; dark?: string; href?: string };
  favicon?: string;
  ogImage?: string;
  repo?: string;
  editBranch?: string;
  editBasePath?: string;
  codeSamples: string[];
  tabs: ResolvedTab[];
  navbar: { links: NavbarLink[]; primary?: { type: "button"; label: string; href: string } };
  footer: { links: NavbarLink[] };
  changelog: ResolvedChangelogConfig;
  search: { featured: string[] };
}

export interface ResolvedDoxygenConfig {
  xml: string;
  language: string;
  groups: boolean;
  index: DoxygenIndexStyle;
}

export interface ResolvedTab {
  label: string;
  slug: string;
  openapi?: string;
  groups?: ResolvedGroup[];
  doxygen?: ResolvedDoxygenConfig;
  mcp?: string;
}

export interface ResolvedPage {
  /** Original config slug (e.g. "run/index") */
  slug: string;
  /** Absolute filesystem path to the .md/.mdx file */
  file: string;
}

export interface ResolvedGroup {
  label: string;
  pages: ResolvedPage[];
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = {
  primary: "99 102 241",
  light: "129 140 248",
  dark: "79 70 229",
};

const DEFAULT_FONT_SANS = "Inter";
const SYSTEM_SANS = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const SYSTEM_MONO = "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, 'Liberation Mono', Menlo, monospace";

const DEFAULT_LAYOUT = {
  sidebar: "18rem",
  toc: "19rem",
  content: "44rem",
};

export async function loadConfig(configOrDir?: string): Promise<ResolvedConfig> {
  let configPath: string;

  if (configOrDir && configOrDir.endsWith(".ts")) {
    configPath = resolve(configOrDir);
  } else {
    const dir = configOrDir ?? process.cwd();
    configPath = resolve(dir, "sourcey.config.ts");
  }

  try {
    await access(configPath);
  } catch {
    throw new Error(
      `Config not found: ${configPath}\n` +
      `Create one with:\n\n` +
      `  import { defineConfig } from "sourcey";\n` +
      `  export default defineConfig({ navigation: { tabs: [...] } });\n`,
    );
  }

  const jiti = createJiti(import.meta.url);
  const mod = await jiti.import(configPath) as { default: SourceyConfig };
  const raw = mod.default;

  if (!raw?.navigation?.tabs) {
    throw new Error("sourcey.config.ts must export default defineConfig({ navigation: { tabs: [...] } })");
  }

  return resolveConfigFromRaw(raw, dirname(configPath));
}

/**
 * Build a ResolvedConfig for a standalone spec file (no config file needed).
 */
export function configFromSpec(specPath: string): ResolvedConfig {
  const absSpec = resolve(specPath);
  return {
    name: "API Reference",
    siteUrl: undefined,
    baseUrl: "",
    theme: {
      preset: "default",
      colors: { ...DEFAULT_COLORS },
      fonts: { sans: `'${DEFAULT_FONT_SANS}', ${SYSTEM_SANS}`, mono: SYSTEM_MONO, googleFont: DEFAULT_FONT_SANS },
      layout: { ...DEFAULT_LAYOUT },
      css: [],
    },
    codeSamples: ["curl", "javascript", "python"],
    tabs: [{ label: "API Reference", slug: "api", openapi: absSpec }],
    navbar: { links: [] },
    footer: { links: [] },
    changelog: { enabled: true, feed: false, permalinks: false, ogImages: false },
    search: { featured: [] },
  };
}

// ---------------------------------------------------------------------------
// Resolution + validation
// ---------------------------------------------------------------------------

export async function resolveConfigFromRaw(raw: SourceyConfig, configDir: string): Promise<ResolvedConfig> {
  const theme = resolveTheme(raw, configDir);
  const logo = resolveLogo(raw.logo, configDir);
  const tabs = await resolveTabs(raw.navigation.tabs, configDir);
  const changelog = resolveChangelog(raw.changelog);

  return {
    name: raw.name ?? "",
    siteUrl: normalizeSiteUrl(raw.siteUrl),
    baseUrl: normalizeBaseUrl(raw.baseUrl),
    theme,
    logo,
    favicon: raw.favicon && !raw.favicon.startsWith("http") && !raw.favicon.startsWith("data:") ? resolve(configDir, raw.favicon) : raw.favicon,
    ogImage: raw.ogImage && !raw.ogImage.startsWith("http") && !raw.ogImage.startsWith("data:") ? resolve(configDir, raw.ogImage) : raw.ogImage,
    repo: raw.repo,
    editBranch: raw.editBranch,
    editBasePath: raw.editBasePath,
    codeSamples: raw.codeSamples ?? ["curl", "javascript", "python"],
    tabs,
    navbar: {
      links: raw.navbar?.links ?? [],
      primary: raw.navbar?.primary,
    },
    footer: {
      links: raw.footer?.links ?? [],
    },
    changelog,
    search: {
      featured: raw.search?.featured ?? [],
    },
  };
}

function isUrl(source: string): boolean {
  return source.startsWith("http://") || source.startsWith("https://");
}

const VALID_PRESETS: ThemePreset[] = ["default", "minimal", "api-first"];

function resolveTheme(raw: SourceyConfig, configDir: string): ResolvedTheme {
  const preset = raw.theme?.preset ?? "default";
  if (!VALID_PRESETS.includes(preset)) {
    throw new Error(`Invalid theme preset "${preset}". Must be one of: ${VALID_PRESETS.join(", ")}`);
  }

  const rawColors = raw.theme?.colors;
  const colors = rawColors
    ? {
        primary: hexToRgb(rawColors.primary),
        light: rawColors.light ? hexToRgb(rawColors.light) : hexToRgb(rawColors.primary),
        dark: rawColors.dark ? hexToRgb(rawColors.dark) : hexToRgb(rawColors.primary),
      }
    : { ...DEFAULT_COLORS };

  const sansName = raw.theme?.fonts?.sans ?? DEFAULT_FONT_SANS;
  const monoName = raw.theme?.fonts?.mono;
  const fonts = {
    sans: `'${sansName}', ${SYSTEM_SANS}`,
    mono: monoName ? `'${monoName}', ${SYSTEM_MONO}` : SYSTEM_MONO,
    googleFont: sansName,
  };

  const layout = {
    sidebar: raw.theme?.layout?.sidebar ?? DEFAULT_LAYOUT.sidebar,
    toc: raw.theme?.layout?.toc ?? DEFAULT_LAYOUT.toc,
    content: raw.theme?.layout?.content ?? DEFAULT_LAYOUT.content,
  };

  const css = (raw.theme?.css ?? []).map(p => resolve(configDir, p));

  return { preset, colors, fonts, layout, css };
}

function resolveLogo(logo: SourceyConfig["logo"], configDir: string): ResolvedConfig["logo"] {
  if (!logo) return undefined;
  const resolvePath = (p?: string) => p && !p.startsWith("http") && !p.startsWith("data:") ? resolve(configDir, p) : p;
  if (typeof logo === "string") return { light: resolvePath(logo) };
  return { light: resolvePath(logo.light), dark: resolvePath(logo.dark), href: logo.href };
}

function resolveChangelog(raw: SourceyConfig["changelog"]): ResolvedChangelogConfig {
  if (raw === false) {
    return { enabled: false, feed: false, permalinks: false, ogImages: false };
  }

  return {
    enabled: raw?.enabled ?? true,
    feed: raw?.feed === true ? {} : (raw?.feed ?? false),
    permalinks: raw?.permalinks ?? false,
    ogImages: raw?.ogImages ?? false,
  };
}

async function resolveTabs(tabs: TabConfig[], configDir: string): Promise<ResolvedTab[]> {
  const slugs = new Set<string>();
  const resolved: ResolvedTab[] = [];

  for (const tab of tabs) {
    if (!tab.tab) throw new Error("Tab missing \"tab\" name");

    const slug = tab.slug !== undefined ? tab.slug : slugify(tab.tab);
    if (slugs.has(slug)) throw new Error(`Duplicate tab slug "${slug}" (from "${tab.tab}")`);
    slugs.add(slug);

    const sources = [tab.openapi, tab.groups, tab.doxygen, tab.mcp].filter(Boolean).length;
    if (sources > 1) {
      throw new Error(`Tab "${tab.tab}" has multiple sources; use only one of "openapi", "groups", "doxygen", or "mcp"`);
    }
    if (sources === 0) {
      throw new Error(`Tab "${tab.tab}" needs one of "openapi", "groups", "doxygen", or "mcp"`);
    }

    if (tab.openapi) {
      if (isUrl(tab.openapi)) {
        resolved.push({ label: tab.tab, slug, openapi: tab.openapi });
      } else {
        const absPath = resolve(configDir, tab.openapi);
        await assertExists(absPath, `OpenAPI spec "${tab.openapi}" in tab "${tab.tab}"`);
        resolved.push({ label: tab.tab, slug, openapi: absPath });
      }
    } else if (tab.mcp) {
      if (isUrl(tab.mcp)) {
        resolved.push({ label: tab.tab, slug, mcp: tab.mcp });
      } else {
        const absPath = resolve(configDir, tab.mcp);
        await assertExists(absPath, `MCP spec "${tab.mcp}" in tab "${tab.tab}"`);
        resolved.push({ label: tab.tab, slug, mcp: absPath });
      }
    } else if (tab.doxygen) {
      const absXml = resolve(configDir, tab.doxygen.xml);
      await assertExists(absXml, `Doxygen XML directory "${tab.doxygen.xml}" in tab "${tab.tab}"`);
      resolved.push({
        label: tab.tab,
        slug,
        doxygen: {
          xml: absXml,
          language: tab.doxygen.language ?? "cpp",
          groups: tab.doxygen.groups ?? false,
          index: tab.doxygen.index === false ? "none" : (tab.doxygen.index ?? "auto"),
        },
      });
    } else {
      const groups = await resolveGroups(tab.groups!, tab.tab, configDir);
      resolved.push({ label: tab.tab, slug, groups });
    }
  }

  return resolved;
}

async function resolveGroups(groups: GroupConfig[], tabName: string, configDir: string): Promise<ResolvedGroup[]> {
  const resolved: ResolvedGroup[] = [];

  for (const group of groups) {
    if (!group.group) throw new Error(`Group missing "group" name in tab "${tabName}"`);
    if (!group.pages?.length) throw new Error(`Group "${group.group}" in tab "${tabName}" has no pages`);

    const pages: ResolvedPage[] = [];
    for (const pageSlug of group.pages) {
      if (pageSlug.includes("*")) {
        const expanded = await expandGlob(pageSlug, configDir);
        for (const file of expanded) {
          const rel = relative(configDir, file).replace(/\.[^.]+$/, "");
          pages.push({ slug: rel, file });
        }
      } else {
        const absPath = await resolvePagePath(pageSlug, configDir);
        pages.push({ slug: pageSlug, file: absPath });
      }
    }

    resolved.push({ label: group.group, pages });
  }

  return resolved;
}

/**
 * Expand a simple glob pattern like "doc/api-*" into matching .md/.mdx files.
 * Supports trailing * only (e.g. "doc/api-*", "guides/*").
 */
async function expandGlob(pattern: string, configDir: string): Promise<string[]> {
  const absPattern = resolve(configDir, pattern);
  const dir = dirname(absPattern);
  const prefix = basename(absPattern).replace("*", "");

  try {
    const entries = await readdir(dir);
    const matches = entries
      .filter((f) => {
        const ext = extname(f);
        if (ext !== ".md" && ext !== ".mdx") return false;
        const name = basename(f, ext);
        return prefix ? name.startsWith(prefix) : true;
      })
      .sort()
      .map((f) => resolve(dir, f));

    if (!matches.length) {
      throw new Error(`Glob "${pattern}" matched no files in ${dir}`);
    }

    return matches;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Glob directory not found: ${dir}`);
    }
    throw err;
  }
}

async function resolvePagePath(slug: string, configDir: string): Promise<string> {
  for (const ext of [".md", ".mdx"]) {
    const candidate = resolve(configDir, `${slug}${ext}`);
    try {
      await access(candidate);
      return candidate;
    } catch { /* try next */ }
  }
  throw new Error(`Page "${slug}" not found (tried ${slug}.md, ${slug}.mdx in ${configDir})`);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Build a path under a tab, handling empty slugs (root-level tabs). */
export function tabPath(tabSlug: string, file: string): string {
  if (!tabSlug) return file;
  if (file.startsWith(`${tabSlug}/`)) return file;
  return `${tabSlug}/${file}`;
}

export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) throw new Error(`Invalid hex color: "${hex}"`);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

async function assertExists(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}
