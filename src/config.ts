import { access, readdir } from "node:fs/promises";
import { resolve, dirname, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";

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

export interface SourceyConfig {
  name?: string;
  theme?: ThemeConfig;
  logo?: string | {
    light: string;
    dark?: string;
    href?: string;
  };
  favicon?: string;
  /** GitHub repo URL (e.g. "https://github.com/user/repo"). Enables "Edit this page" links. */
  repo?: string;
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
}

export interface DoxygenConfig {
  /** Path to Doxygen XML output directory */
  xml: string;
  /** Programming language (default: "cpp") */
  language?: string;
  /** Use Doxygen groups for navigation grouping */
  groups?: boolean;
}

export interface TabConfig {
  tab: string;
  openapi?: string;
  groups?: GroupConfig[];
  doxygen?: DoxygenConfig;
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
  fonts: { sans: string; mono: string };
  layout: { sidebar: string; toc: string; content: string };
  css: string[];
}

export interface ResolvedConfig {
  name: string;
  theme: ResolvedTheme;
  logo?: { light?: string; dark?: string; href?: string };
  favicon?: string;
  repo?: string;
  codeSamples: string[];
  tabs: ResolvedTab[];
  navbar: { links: NavbarLink[]; primary?: { type: "button"; label: string; href: string } };
  footer: { links: NavbarLink[] };
}

export interface ResolvedDoxygenConfig {
  xml: string;
  language: string;
  groups: boolean;
}

export interface ResolvedTab {
  label: string;
  slug: string;
  openapi?: string;
  groups?: ResolvedGroup[];
  doxygen?: ResolvedDoxygenConfig;
}

export interface ResolvedGroup {
  label: string;
  pages: string[];
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = {
  primary: "99 102 241",
  light: "129 140 248",
  dark: "79 70 229",
};

const DEFAULT_FONTS = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
};

const DEFAULT_LAYOUT = {
  sidebar: "18rem",
  toc: "19rem",
  content: "44rem",
};

export async function loadConfig(cwd?: string): Promise<ResolvedConfig> {
  const dir = cwd ?? process.cwd();
  const configPath = resolve(dir, "sourcey.config.ts");

  try {
    await access(configPath);
  } catch {
    throw new Error(
      `No sourcey.config.ts found in ${dir}.\n` +
      `Create one with:\n\n` +
      `  import { defineConfig } from "sourcey";\n` +
      `  export default defineConfig({ navigation: { tabs: [...] } });\n`,
    );
  }

  const mod = await import(pathToFileURL(configPath).href);
  const raw: SourceyConfig = mod.default;

  if (!raw?.navigation?.tabs) {
    throw new Error("sourcey.config.ts must export default defineConfig({ navigation: { tabs: [...] } })");
  }

  return resolveConfig(raw, dirname(configPath));
}

/**
 * Build a ResolvedConfig for a standalone spec file (no config file needed).
 */
export function configFromSpec(specPath: string): ResolvedConfig {
  const absSpec = resolve(specPath);
  return {
    name: "API Reference",
    theme: {
      preset: "default",
      colors: { ...DEFAULT_COLORS },
      fonts: { ...DEFAULT_FONTS },
      layout: { ...DEFAULT_LAYOUT },
      css: [],
    },
    codeSamples: ["curl", "javascript", "python"],
    tabs: [{ label: "API Reference", slug: "api", openapi: absSpec }],
    navbar: { links: [] },
    footer: { links: [] },
  };
}

// ---------------------------------------------------------------------------
// Resolution + validation
// ---------------------------------------------------------------------------

async function resolveConfig(raw: SourceyConfig, configDir: string): Promise<ResolvedConfig> {
  const theme = resolveTheme(raw, configDir);
  const logo = resolveLogo(raw.logo);
  const tabs = await resolveTabs(raw.navigation.tabs, configDir);

  return {
    name: raw.name ?? "",
    theme,
    logo,
    favicon: raw.favicon,
    repo: raw.repo,
    codeSamples: raw.codeSamples ?? ["curl", "javascript", "python"],
    tabs,
    navbar: {
      links: raw.navbar?.links ?? [],
      primary: raw.navbar?.primary,
    },
    footer: {
      links: raw.footer?.links ?? [],
    },
  };
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

  const userSans = raw.theme?.fonts?.sans;
  const userMono = raw.theme?.fonts?.mono;
  const fonts = {
    sans: userSans
      ? `'${userSans}', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
      : DEFAULT_FONTS.sans,
    mono: userMono
      ? `'${userMono}', 'SF Mono', 'Fira Code', Consolas, monospace`
      : DEFAULT_FONTS.mono,
  };

  const layout = {
    sidebar: raw.theme?.layout?.sidebar ?? DEFAULT_LAYOUT.sidebar,
    toc: raw.theme?.layout?.toc ?? DEFAULT_LAYOUT.toc,
    content: raw.theme?.layout?.content ?? DEFAULT_LAYOUT.content,
  };

  const css = (raw.theme?.css ?? []).map(p => resolve(configDir, p));

  return { preset, colors, fonts, layout, css };
}

function resolveLogo(logo?: SourceyConfig["logo"]): ResolvedConfig["logo"] {
  if (!logo) return undefined;
  if (typeof logo === "string") return { light: logo };
  return { light: logo.light, dark: logo.dark, href: logo.href };
}

async function resolveTabs(tabs: TabConfig[], configDir: string): Promise<ResolvedTab[]> {
  const slugs = new Set<string>();
  const resolved: ResolvedTab[] = [];

  for (const tab of tabs) {
    if (!tab.tab) throw new Error("Tab missing \"tab\" name");

    const slug = slugify(tab.tab);
    if (slugs.has(slug)) throw new Error(`Duplicate tab slug "${slug}" (from "${tab.tab}")`);
    slugs.add(slug);

    const sources = [tab.openapi, tab.groups, tab.doxygen].filter(Boolean).length;
    if (sources > 1) {
      throw new Error(`Tab "${tab.tab}" has multiple sources; use only one of "openapi", "groups", or "doxygen"`);
    }
    if (sources === 0) {
      throw new Error(`Tab "${tab.tab}" needs one of "openapi", "groups", or "doxygen"`);
    }

    if (tab.openapi) {
      const absPath = resolve(configDir, tab.openapi);
      await assertExists(absPath, `OpenAPI spec "${tab.openapi}" in tab "${tab.tab}"`);
      resolved.push({ label: tab.tab, slug, openapi: absPath });
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

    const pages: string[] = [];
    for (const pageSlug of group.pages) {
      if (pageSlug.includes("*")) {
        const expanded = await expandGlob(pageSlug, configDir);
        pages.push(...expanded);
      } else {
        const absPath = await resolvePagePath(pageSlug, configDir);
        pages.push(absPath);
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
