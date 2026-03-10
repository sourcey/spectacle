import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { App } from "../components/App.js";
import type { NormalizedSpec } from "../core/types.js";
import type { RenderOptions } from "./context.js";

/**
 * Render a NormalizedSpec to a complete HTML string using Preact SSG.
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
