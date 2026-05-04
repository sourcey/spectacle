import { describe, it, expect, afterAll } from "vitest";
import { rm, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { resolveConfigFromRaw } from "../../src/config.js";
import { buildSiteDocs } from "../../src/index.js";

const FIXTURE_MODULE = resolve(import.meta.dirname, "../fixtures/godoc/basic");
const OUTPUT_DIR = resolve(import.meta.dirname, "../../.test-output-godoc-build");

const goAvailable = (() => {
  try {
    const result = spawnSync("go", ["version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
})();

const skipWithoutGo = goAvailable ? describe : describe.skip;

// keep output for inspection during dev; cleanup in CI is fine, but for
// debugging we leave it on disk if KEEP_GODOC_BUILD=1 is set.
afterAll(async () => {
  if (!process.env.KEEP_GODOC_BUILD) {
    await rm(OUTPUT_DIR, { recursive: true, force: true });
  }
});

skipWithoutGo("buildSiteDocs (integration) – godoc tab", () => {
  it("emits package pages, search entries, llms entries, and sitemap urls", async () => {
    const config = await resolveConfigFromRaw(
      {
        name: "Go Docs",
        siteUrl: "https://docs.example.com",
        navigation: {
          tabs: [
            {
              tab: "Go API",
              godoc: {
                module: FIXTURE_MODULE,
                packages: ["./..."],
                mode: "live",
                includeTests: true,
              },
            },
          ],
        },
      },
      FIXTURE_MODULE,
    );

    const result = await buildSiteDocs({
      config,
      outputDir: OUTPUT_DIR,
    });

    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.godocDiagnostics.filter((d) => d.severity === "error")).toHaveLength(0);

    // Package page exists
    const packagePage = await readFile(resolve(OUTPUT_DIR, "go-api/package-root.html"), "utf-8");
    expect(packagePage).toContain("example.com/basic");
    expect(packagePage).toContain("Widget");
    expect(packagePage).toContain('id="func-New"');

    // Index page lists the package
    const indexPage = await readFile(resolve(OUTPUT_DIR, "go-api/index.html"), "utf-8");
    expect(indexPage).toContain("example.com/basic");

    // Sitemap contains both pages (index renders as a tab-root URL)
    const sitemap = await readFile(resolve(OUTPUT_DIR, "sitemap.xml"), "utf-8");
    expect(sitemap).toContain("go-api/package-root.html");
    expect(sitemap).toMatch(/go-api\/(index\.html)?</);

    // llms.txt links the package page
    const llms = await readFile(resolve(OUTPUT_DIR, "llms.txt"), "utf-8");
    expect(llms).toContain("# Go Docs");
    expect(llms).toContain("go-api/package-root.html");

    // llms-full.txt has the package content
    const llmsFull = await readFile(resolve(OUTPUT_DIR, "llms-full.txt"), "utf-8");
    expect(llmsFull).toContain("example.com/basic");
    expect(llmsFull).toContain("Widget");

    // Search index includes the package symbols
    const searchIndex = JSON.parse(
      await readFile(resolve(OUTPUT_DIR, "search-index.json"), "utf-8"),
    ) as Array<{ title: string; content: string }>;
    const titles = searchIndex.map((entry) => entry.title);
    expect(titles.some((t) => t.includes("example.com/basic"))).toBe(true);
  });
});
