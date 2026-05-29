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

  it("strips scriptable raw HTML", () => {
    const html = renderMarkdown(`Hello <script>alert(1)</script><img src="x" onerror="alert(1)">`);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).toContain("Hello");
  });

  it("rejects unsafe link schemes and escapes link attributes", () => {
    const html = renderMarkdown(
      `[bad](javascript:alert(1)) [ok](https://example.com/?q=%22 "quoted")`,
    );

    expect(html).not.toContain("javascript:");
    expect(html).toContain("bad");
    expect(html).toContain('href="https://example.com/?q=%22"');
    expect(html).toContain('title="quoted"');
  });

  it("sanitizes video and iframe directive URLs", () => {
    const html =
      renderMarkdown(`::video[https://cdn.example.com/demo.mp4" onerror="alert(1)]{title="Demo"}

::iframe[javascript:alert(1)]{title="Bad"}`);

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("[video: invalid URL]");
    expect(html).toContain("[iframe: invalid URL]");
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
    expect(stripMarkdownLinks("Uses [Bar](bar.html#bar) and [Baz](baz.html#baz).")).toBe(
      "Uses Bar and Baz.",
    );
  });

  it("handles malformed long link-like text without catastrophic backtracking", () => {
    const input = `${"[".repeat(1000)}${"`label".repeat(1000)}${"](".repeat(1000)}`;

    expect(stripMarkdownLinks(input)).toBe(input);
  });
});
