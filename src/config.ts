import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface SpectacleConfig {
  /** Path to a custom logo image */
  logo?: string;
  /** Path to a custom favicon */
  favicon?: string;
  /** CSS custom property overrides */
  theme?: Record<string, string>;
}

/**
 * Load spectacle.json from the current directory if it exists.
 * Returns an empty config if not found.
 */
export async function loadConfig(cwd?: string): Promise<SpectacleConfig> {
  const configPath = resolve(cwd ?? process.cwd(), "spectacle.json");

  try {
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw) as SpectacleConfig;
  } catch {
    return {};
  }
}
