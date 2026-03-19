import {
  createHighlighterCoreSync,
  createJavaScriptRegexEngine,
} from "shiki";
import js from "shiki/langs/javascript.mjs";
import ts from "shiki/langs/typescript.mjs";
import bash from "shiki/langs/bash.mjs";
import python from "shiki/langs/python.mjs";
import json from "shiki/langs/json.mjs";
import cpp from "shiki/langs/cpp.mjs";
import c from "shiki/langs/c.mjs";
import yaml from "shiki/langs/yaml.mjs";
import html from "shiki/langs/html.mjs";
import css from "shiki/langs/css.mjs";
import go from "shiki/langs/go.mjs";
import rust from "shiki/langs/rust.mjs";
import cmake from "shiki/langs/cmake.mjs";
import sql from "shiki/langs/sql.mjs";
import xml from "shiki/langs/xml.mjs";
import docker from "shiki/langs/docker.mjs";
import monokai from "shiki/themes/monokai.mjs";

const highlighter = createHighlighterCoreSync({
  themes: [monokai],
  langs: [js, ts, bash, python, json, cpp, c, yaml, html, css, go, rust, cmake, sql, xml, docker],
  engine: createJavaScriptRegexEngine(),
});

/**
 * Highlight code with Shiki (synchronous, build-time).
 * Returns raw HTML string with inline styles.
 */
export function highlightCode(code: string, lang?: string): string {
  const resolved = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : "text";

  if (resolved === "text") {
    // No highlighting — return escaped HTML in our standard structure
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="shiki"><code>${escaped}</code></pre>`;
  }

  return highlighter.codeToHtml(code, { lang: resolved, theme: "monokai" });
}
