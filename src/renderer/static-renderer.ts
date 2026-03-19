import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { App } from "../components/App.js";
import type { AppProps } from "../components/App.js";
import type { NormalizedSpec } from "../core/types.js";
import type { SiteNavigation } from "../core/navigation.js";
import type { RenderOptions, CurrentPage } from "./context.js";

/**
 * Render a NormalizedSpec to a complete HTML string using Preact SSG.
 * Legacy single-spec mode. Unchanged.
 */
export function renderSpec(
  spec: NormalizedSpec,
  options: RenderOptions,
): string {
  const vnode = h(App, { spec, options });
  const html = renderToString(vnode);

  if (options.embeddable) {
    return html;
  }

  return `<!DOCTYPE html>\n${html}`;
}

/**
 * Render a page in a multi-page site.
 * Includes all context providers (spec, options, navigation, current page).
 */
export function renderPage(
  spec: NormalizedSpec,
  options: RenderOptions,
  navigation: SiteNavigation,
  currentPage: CurrentPage,
): string {
  const props: AppProps = { spec, options, navigation, currentPage };
  const vnode = h(App, props);
  const html = renderToString(vnode);
  return `<!DOCTYPE html>\n${html}`;
}
