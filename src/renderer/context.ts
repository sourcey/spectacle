import { createContext } from "preact";
import type { NormalizedSpec } from "../core/types.js";
import type { SiteNavigation } from "../core/navigation.js";
import type { MarkdownPage } from "../core/markdown-loader.js";

/**
 * Options that control rendering behavior.
 */
export interface RenderOptions {
  /** Whether to generate embeddable output (no html/body wrapper) */
  embeddable: boolean;
  /** Whether to inline all assets into a single file */
  singleFile: boolean;
  /** Base URL for assets (CSS, JS) */
  assetBase: string;
}

/**
 * Full context available to all components during rendering.
 */
export interface RenderContext {
  spec: NormalizedSpec;
  options: RenderOptions;
}

/**
 * What the current page is rendering.
 */
export interface CurrentPage {
  kind: "spec" | "markdown";
  spec?: NormalizedSpec;
  markdown?: MarkdownPage;
}

/**
 * Preact context for passing spec data to deeply nested components.
 */
export const SpecContext = createContext<NormalizedSpec>(null as never);

/**
 * Preact context for render options.
 */
export const OptionsContext = createContext<RenderOptions>({
  embeddable: false,
  singleFile: false,
  assetBase: "",
});

/**
 * Preact context for site-wide navigation (multi-page mode).
 * Null in legacy single-spec mode.
 */
export const NavigationContext = createContext<SiteNavigation | null>(null);

/**
 * Preact context for the current page being rendered (multi-page mode).
 * Null in legacy single-spec mode.
 */
export const PageContext = createContext<CurrentPage | null>(null);
