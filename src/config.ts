import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

export interface NavigationTab {
  /** Display name shown in the tab bar */
  label: string;
  /** URL path segment, e.g. "guides" or "api" */
  slug: string;
  /** Path to an OpenAPI spec file (makes this a spec tab) */
  spec?: string;
  /** Markdown page groups (mutually exclusive with spec) */
  groups?: NavigationGroup[];
}

export interface NavigationGroup {
  /** Group heading shown in sidebar */
  label: string;
  /** Ordered list of markdown file paths, relative to spectacle.json */
  pages: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface SpectacleConfig {
  /** Path to a custom logo image */
  logo?: string;
  /** Path to a custom favicon */
  favicon?: string;
  /** CSS custom property overrides */
  theme?: Record<string, string>;
  /** Multi-page navigation. If absent, Spectacle runs in legacy single-spec mode. */
  navigation?: NavigationTab[];
}

/**
 * Returns true when the config defines a multi-page site.
 */
export function isMultiPageConfig(config: SpectacleConfig): boolean {
  return Array.isArray(config.navigation) && config.navigation.length > 0;
}

/**
 * Load spectacle.json from the given directory (or cwd).
 * Returns an empty config if no file is found.
 * Throws on invalid config (parse errors, validation failures).
 */
export async function loadConfig(cwd?: string): Promise<SpectacleConfig> {
  const dir = cwd ?? process.cwd();
  const configPath = resolve(dir, "spectacle.json");

  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    return {};
  }

  const config = JSON.parse(raw) as SpectacleConfig;

  if (isMultiPageConfig(config)) {
    await validateNavigation(config.navigation!, dirname(configPath));
  }

  return config;
}

/**
 * Validate navigation config. Throws descriptive errors on invalid input.
 */
async function validateNavigation(tabs: NavigationTab[], configDir: string): Promise<void> {
  if (tabs.length === 0) return;

  const slugs = new Set<string>();

  for (const tab of tabs) {
    // Required fields
    if (!tab.label) throw new Error(`Navigation tab missing "label"`);
    if (!tab.slug) throw new Error(`Navigation tab "${tab.label}" missing "slug"`);

    // Unique slugs
    if (slugs.has(tab.slug)) {
      throw new Error(`Duplicate navigation tab slug "${tab.slug}"`);
    }
    slugs.add(tab.slug);

    // Mutually exclusive: spec or groups, not both
    if (tab.spec && tab.groups) {
      throw new Error(`Tab "${tab.label}" has both "spec" and "groups"; use one or the other`);
    }
    if (!tab.spec && !tab.groups) {
      throw new Error(`Tab "${tab.label}" needs either "spec" or "groups"`);
    }

    // Validate spec file exists
    if (tab.spec) {
      const specPath = resolve(configDir, tab.spec);
      await assertFileExists(specPath, `Spec file "${tab.spec}" in tab "${tab.label}"`);
    }

    // Validate page files exist
    if (tab.groups) {
      for (const group of tab.groups) {
        if (!group.label) throw new Error(`Navigation group missing "label" in tab "${tab.label}"`);
        if (!Array.isArray(group.pages) || group.pages.length === 0) {
          throw new Error(`Navigation group "${group.label}" in tab "${tab.label}" has no pages`);
        }
        for (const pagePath of group.pages) {
          const fullPath = resolve(configDir, pagePath);
          await assertFileExists(fullPath, `Page "${pagePath}" in group "${group.label}"`);
        }
      }
    }
  }
}

async function assertFileExists(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}
