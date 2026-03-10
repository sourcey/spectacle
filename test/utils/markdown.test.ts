import { describe, it, expect } from "vitest";
import { renderMarkdown, renderMarkdownInline } from "../../src/utils/markdown.js";

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
