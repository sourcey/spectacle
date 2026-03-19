import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { loadMarkdownPage, slugFromPath } from "../../src/core/markdown-loader.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures");

describe("loadMarkdownPage", () => {
  it("parses frontmatter title and description", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "test-page.md"),
      "test-page",
    );
    expect(page.title).toBe("Getting Started");
    expect(page.description).toBe("How to install and use LibSourcey");
    expect(page.slug).toBe("test-page");
  });

  it("renders markdown body to HTML", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "test-page.md"),
      "test-page",
    );
    expect(page.html).toContain("<p>");
    expect(page.html).toContain("C++20 networking toolkit");
  });

  it("syntax highlights fenced code blocks", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "test-page.md"),
      "test-page",
    );
    // Shiki wraps highlighted code in <pre class="shiki ...">
    expect(page.html).toContain('class="shiki');
    // cmake block should be highlighted (FetchContent appears in spans)
    expect(page.html).toContain("FetchContent");
    // cpp block should contain the server code (split across spans by Shiki)
    expect(page.html).toContain("ServerConnection");
  });

  it("extracts h2 and h3 headings with IDs", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "test-page.md"),
      "test-page",
    );
    expect(page.headings).toEqual([
      { level: 2, text: "Installation", id: "installation" },
      { level: 2, text: "Quick Start", id: "quick-start" },
      { level: 3, text: "Building", id: "building" },
    ]);
  });

  it("generates id attributes on heading elements", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "test-page.md"),
      "test-page",
    );
    expect(page.html).toContain('id="installation"');
    expect(page.html).toContain('id="quick-start"');
    expect(page.html).toContain('id="building"');
  });

  it("preserves source path", async () => {
    const filePath = resolve(FIXTURE_DIR, "test-page.md");
    const page = await loadMarkdownPage(filePath, "test-page");
    expect(page.sourcePath).toBe(filePath);
  });
});

describe("slugFromPath", () => {
  it("derives slug from filename", () => {
    expect(slugFromPath("docs/getting-started.md")).toBe("getting-started");
    expect(slugFromPath("api/PacketStream.md")).toBe("packetstream");
    expect(slugFromPath("intro.md")).toBe("intro");
  });
});
