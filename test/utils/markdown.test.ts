import { describe, it, expect } from "vitest";
import {
  extractFirstParagraph,
  renderMarkdown,
  renderMarkdownInline,
  stripMarkdownLinks,
} from "../../src/utils/markdown.js";

describe("renderMarkdown", () => {
  it("renders markdown to HTML", () => {
    const html = renderMarkdown("**bold** text");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<p>");
  });

  it("returns empty string for undefined", () => {
    expect(renderMarkdown(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(renderMarkdown("")).toBe("");
  });
});

describe("renderMarkdownInline", () => {
  it("renders inline markdown without <p> tags", () => {
    const html = renderMarkdownInline("**bold** text");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).not.toContain("<p>");
  });
});

describe("extractFirstParagraph", () => {
  it("finds the first prose paragraph in generated markdown", () => {
    const markdown = `<a id="foo"></a>

## Foo

\`\`\`cpp
int foo();
\`\`\`

> **Inherits:** [Bar](bar.html#bar)

Uses [Bar](bar.html#bar).

### Methods`;

    expect(extractFirstParagraph(markdown)).toBe("Uses [Bar](bar.html#bar).");
  });
});

describe("stripMarkdownLinks", () => {
  it("replaces markdown links with their labels", () => {
    expect(stripMarkdownLinks("Uses [Bar](bar.html#bar) and [Baz](baz.html#baz)."))
      .toBe("Uses Bar and Baz.");
  });
});
