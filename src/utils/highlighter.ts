import {
  createHighlighterCoreSync,
  createJavaScriptRegexEngine,
} from "shiki";
import js from "shiki/langs/javascript.mjs";
import bash from "shiki/langs/bash.mjs";
import python from "shiki/langs/python.mjs";
import json from "shiki/langs/json.mjs";
import monokai from "shiki/themes/monokai.mjs";

const highlighter = createHighlighterCoreSync({
  themes: [monokai],
  langs: [js, bash, python, json],
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
