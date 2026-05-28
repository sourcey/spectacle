import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import type { ResolvedRustdocConfig } from "../../src/config.js";
import { loadRustdocTab } from "../../src/core/rustdoc-loader.js";

const FIXTURE_MANIFEST = resolve(import.meta.dirname, "../fixtures/rustdoc/basic/Cargo.toml");
const FIXTURE_SNAPSHOT = resolve(
  import.meta.dirname,
  "../fixtures/rustdoc/basic/snapshots/rustdoc.json",
);

function snapshotConfig(overrides: Partial<ResolvedRustdocConfig> = {}): ResolvedRustdocConfig {
  return {
    manifest: FIXTURE_MANIFEST,
    crates: ["basic"],
    snapshot: FIXTURE_SNAPSHOT,
    mode: "snapshot",
    features: { default: true, list: [], all: false },
    includePrivate: false,
    includeHidden: false,
    toolchain: "nightly",
    sourceBasePath: "",
    doctestsIndex: true,
    ...overrides,
  };
}

describe("loadRustdocTab snapshot mode", () => {
  it("returns a navTab, pages, and no error diagnostics", async () => {
    const result = await loadRustdocTab(snapshotConfig(), "rust-api", "Rust API");
    expect(result.navTab.label).toBe("Rust API");
    expect(result.navTab.slug).toBe("rust-api");
    expect(result.navTab.kind).toBe("docs");
    expect(result.pages.size).toBeGreaterThan(0);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toEqual([]);
  });

  it("emits a crate index page and the doctests aggregation page", async () => {
    const result = await loadRustdocTab(snapshotConfig(), "rust-api", "Rust API");
    expect(result.pages.has("pkg-basic")).toBe(true);
    expect(result.pages.has("doctests")).toBe(true);
  });

  it("populates search entries with rust categories and surfaces doctests", async () => {
    const result = await loadRustdocTab(snapshotConfig(), "rust-api", "Rust API");
    const doctestsPage = result.pages.get("doctests");
    expect(doctestsPage).toBeDefined();
    const categories = new Set<string>();
    for (const page of result.pages.values()) {
      for (const entry of page.searchEntries ?? []) categories.add(entry.category);
    }
    expect(categories.has("rust doctest")).toBe(true);
    expect(
      Array.from(categories).some((c) => c.startsWith("rust ") && c !== "rust doctest"),
    ).toBe(true);
  });

  it("falls back to an error index page when the snapshot is missing", async () => {
    const result = await loadRustdocTab(
      snapshotConfig({ snapshot: "/does/not/exist.json" }),
      "rust-api",
      "Rust API",
    );
    expect(result.pages.has("index")).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === "error")).toBe(true);
  });

  it("renders the workspace doctest count in the doctests page heading", async () => {
    const result = await loadRustdocTab(snapshotConfig(), "rust-api", "Rust API");
    const page = result.pages.get("doctests")!;
    expect(page.html).toContain("Doctests");
    expect(page.html.toLowerCase()).toMatch(/runnable example/);
  });
});
