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
import ruby from "shiki/langs/ruby.mjs";
import java from "shiki/langs/java.mjs";
import php from "shiki/langs/php.mjs";
import csharp from "shiki/langs/csharp.mjs";
import swift from "shiki/langs/swift.mjs";
import kotlin from "shiki/langs/kotlin.mjs";
import dart from "shiki/langs/dart.mjs";
import cmake from "shiki/langs/cmake.mjs";
import sql from "shiki/langs/sql.mjs";
import xml from "shiki/langs/xml.mjs";
import docker from "shiki/langs/docker.mjs";
import githubLight from "shiki/themes/github-light-default.mjs";
import darkPlus from "shiki/themes/dark-plus.mjs";

// Cache on globalThis so Vite SSR re-evaluation doesn't create new instances.
const CACHE_KEY = "__sourcey_shiki__";
const highlighter = (globalThis as Record<string, unknown>)[CACHE_KEY] as ReturnType<typeof createHighlighterCoreSync>
  ?? ((globalThis as Record<string, unknown>)[CACHE_KEY] = createHighlighterCoreSync({
    themes: [githubLight, darkPlus],
    langs: [js, ts, bash, python, json, cpp, c, yaml, html, css, go, rust, ruby, java, php, csharp, swift, kotlin, dart, cmake, sql, xml, docker],
    engine: createJavaScriptRegexEngine(),
  }));

/**
 * Highlight code with Shiki (synchronous, build-time).
 * Uses dual-theme output: light theme inline + dark theme via CSS vars.
 * Switch themes with `.dark` class on a parent element.
 *
 * The HTML uses `--shiki-dark` CSS custom properties so dark mode
 * works via CSS (no JS theme switching needed at runtime).
 */
export function highlightCode(code: string, lang?: string): string {
  const resolved = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : "text";

  if (resolved === "text") {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const lines = escaped.split("\n").map(l => `<span class="line"><span>${l}</span></span>`).join("\n");
    return `<pre class="shiki" tabindex="0"><code>${lines}</code></pre>`;
  }

  return highlighter.codeToHtml(code, {
    lang: resolved,
    themes: {
      light: "github-light-default",
      dark: "dark-plus",
    },
    defaultColor: false,
  });
}
