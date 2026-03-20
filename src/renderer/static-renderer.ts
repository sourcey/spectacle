import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { App } from "../components/App.js";
import type { NormalizedSpec } from "../core/types.js";
import type { SiteNavigation } from "../core/navigation.js";
import type { RenderOptions, CurrentPage, SiteConfig } from "./context.js";

/**
 * Render a page to a complete HTML string using Preact SSG.
 * All pages (spec or markdown) go through the same layout with full navigation.
 * If options.embeddable is true, returns the inner content without html/body wrapper.
 */
export function renderPage(
  spec: NormalizedSpec,
  options: RenderOptions,
  navigation: SiteNavigation,
  currentPage: CurrentPage,
  site: SiteConfig,
): string {
  const vnode = h(App, { spec, options, navigation, currentPage, site });
  const html = renderToString(vnode);

  if (options.embeddable) {
    return html;
  }

  return `<!DOCTYPE html>\n${html}`;
}
