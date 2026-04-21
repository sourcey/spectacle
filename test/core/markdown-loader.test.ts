import { describe, it, expect } from "vitest";
import { resolve, relative } from "node:path";
import { loadDocsPage, loadMarkdownPage, slugFromPath } from "../../src/core/markdown-loader.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../fixtures");

describe("loadMarkdownPage", { timeout: 30_000 }, () => {
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

  it("does not expand directives or JSX components inside fenced code blocks", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "fenced-directive-example.md"),
      "fenced-directive-example",
    );
    expect(page.html).toContain("card-group");
    expect(page.html).toContain("CardGroup");
    expect(page.html).not.toContain('class="card-group not-prose"');
  });

  it("handles nested tabs and code groups without leaking directive markers", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "nested-tabs-code-group.md"),
      "nested-tabs-code-group",
    );

    expect(page.html).toContain("Stream");
    expect(page.html).toContain("Record");
    expect(page.html).toContain("Relay");
    expect(page.html).toContain("File source");
    expect(page.html).toContain("Camera source");
    expect(page.html.match(/class="directive-tab(?: active)?"/g)?.length).toBe(5);
    expect(page.html).not.toContain(":::tabs");
    expect(page.html).not.toContain(":::code-group");
    expect(page.html).not.toContain("::tab{");
  });

  it("keeps supported component tags literal inside inline code and groups accordions once", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "component-inline-accordion.md"),
      "component-inline-accordion",
    );

    expect(page.html).toMatch(/<code>&lt;Tab title=(?:&quot;|")Shell(?:&quot;|")&gt;<\/code>/);
    expect(page.html.match(/class="accordion-group not-prose"/g)?.length).toBe(1);
    expect(page.html.match(/class="accordion-item"/g)?.length).toBe(2);
    expect(page.html.match(/class="directive-tab(?: active)?"/g)?.length).toBe(2);
    expect(page.html).not.toContain("<AccordionGroup>");
    expect(page.html).not.toContain("<Tab title=");
  });

  it("falls back to visible markdown when directive containers are malformed", async () => {
    const page = await loadMarkdownPage(
      resolve(FIXTURE_DIR, "malformed-directive-fallback.md"),
      "malformed-directive-fallback",
    );

    expect(page.html).toContain("This block is missing");
    expect(page.html).toContain("This card group is missing card children too.");
    expect(page.html).toContain("This steps block has no numbered steps.");
    expect(page.html).not.toContain('class="directive-tabs not-prose"');
    expect(page.html).not.toContain('class="card-group not-prose"');
    expect(page.html).not.toContain('class="steps not-prose"');
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
    expect(page.sourcePath).toBe(relative(process.cwd(), filePath));
  });
});

describe("slugFromPath", () => {
  it("preserves directory structure in slug", () => {
    expect(slugFromPath("getting-started")).toBe("getting-started");
    expect(slugFromPath("run/index")).toBe("run/index");
    expect(slugFromPath("run/install")).toBe("run/install");
    expect(slugFromPath("index")).toBe("index");
    expect(slugFromPath("intro.md")).toBe("intro");
    expect(slugFromPath("api/PacketStream.md")).toBe("api/packetstream");
  });
});

describe("loadDocsPage", () => {
  it("detects changelog pages and returns a structured changelog page", async () => {
    const page = await loadDocsPage(
      resolve(FIXTURE_DIR, "changelog.md"),
      "changelog",
      { repoUrl: "https://github.com/example/project" },
    );

    expect(page.kind).toBe("changelog");
    if (page.kind !== "changelog") return;

    expect(page.title).toBe("Changelog");
    expect(page.changelog.versions[0].version).toBeNull();
    expect(page.changelog.versions[1].version).toBe("1.2.0");
    expect(page.headings).toEqual([
      { level: 2, text: "Unreleased", id: "unreleased" },
      { level: 2, text: "1.2.0", id: "1-2-0" },
      { level: 2, text: "1.1.0", id: "1-1-0" },
    ]);
  });
});
