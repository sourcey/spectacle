import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadGodocTab } from "../../src/core/godoc-loader.js";
import { GodocIntrospectorError } from "../../src/core/godoc-introspector.js";
import type { ResolvedGodocConfig } from "../../src/config.js";
import type { GodocSnapshot } from "../../src/core/godoc-types.js";
import { GODOC_SCHEMA_VERSION } from "../../src/core/godoc-types.js";

const FIXTURE_MODULE = resolve(import.meta.dirname, "../fixtures/godoc/basic");

const goAvailable = (() => {
  try {
    const result = spawnSync("go", ["version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
})();

const skipWithoutGo = goAvailable ? describe : describe.skip;

function liveConfig(overrides: Partial<ResolvedGodocConfig> = {}): ResolvedGodocConfig {
  return {
    module: FIXTURE_MODULE,
    packages: ["./..."],
    mode: "live",
    includeTests: true,
    includeUnexported: false,
    hideUndocumented: false,
    exclude: [],
    sourceBasePath: "",
    ...overrides,
  };
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "godoc-loader-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

skipWithoutGo("loadGodocTab – live mode", () => {
  it("returns a navigation tab and a page per package plus an index", async () => {
    const result = await loadGodocTab(liveConfig(), "go-api", "Go API");
    expect(result.navTab.label).toBe("Go API");
    expect(result.navTab.slug).toBe("go-api");
    expect(result.navTab.kind).toBe("docs");
    expect(result.pages.has("index")).toBe(true);
    // Root package should be present.
    expect([...result.pages.keys()].some((slug) => slug === "package-root")).toBe(true);
  });

  it("renders constants, variables, functions, types, and methods into the package page", async () => {
    const result = await loadGodocTab(liveConfig(), "go-api", "Go API");
    const root = result.pages.get("package-root")!;
    expect(root.html).toContain('id="constants"');
    expect(root.html).toContain('id="variables"');
    expect(root.html).toContain('id="functions"');
    expect(root.html).toContain('id="types"');
    expect(root.html).toContain('id="func-New"');
    expect(root.html).toContain('id="type-Widget"');
    expect(root.html).toContain('id="method-Widget-Publish"');
    expect(root.html).toContain('id="const-StatusDraft"');
    expect(root.html).toContain('id="var-ErrNotFound"');
  });

  it("uses the package import path as the rendered title", async () => {
    const result = await loadGodocTab(liveConfig(), "go-api", "Go API");
    const root = result.pages.get("package-root")!;
    expect(root.html).toContain("example.com/basic");
  });

  it("populates page headings for the table of contents", async () => {
    const result = await loadGodocTab(liveConfig(), "go-api", "Go API");
    const root = result.pages.get("package-root")!;
    const labels = root.headings.map((h) => h.text);
    expect(labels).toContain("Constants");
    expect(labels).toContain("Functions");
    expect(labels).toContain("Types");
    expect(labels).toContain("Widget");
    expect(labels).toContain("New");
  });
});

describe("loadGodocTab – snapshot mode", () => {
  it("loads a committed snapshot without invoking Go", async () => {
    await withTempDir(async (dir) => {
      const snapshot: GodocSnapshot = {
        schema_version: GODOC_SCHEMA_VERSION,
        source: "sourcey-godoc",
        module_path: "example.com/snapshotted",
        generated_at: "2026-05-04T00:00:00Z",
        packages: [
          {
            importPath: "example.com/snapshotted",
            name: "snapshotted",
            synopsis: "Tiny snapshot fixture.",
            doc: "Tiny snapshot fixture.\n\nSecond paragraph with **emphasis**.",
            dir: ".",
            files: ["snap.go"],
            consts: [],
            vars: [],
            funcs: [
              {
                name: "Hello",
                doc: "Hello returns a greeting.",
                signature: "func Hello() string",
                examples: [],
              },
            ],
            types: [],
            examples: [],
          },
        ],
      };
      const snapshotPath = join(dir, "godoc.json");
      await writeFile(snapshotPath, JSON.stringify(snapshot), "utf8");

      const result = await loadGodocTab(
        {
          module: dir,
          packages: ["./..."],
          mode: "snapshot",
          snapshot: snapshotPath,
          includeTests: false,
          includeUnexported: false,
          hideUndocumented: false,
          exclude: [],
          sourceBasePath: "",
        },
        "go-api",
        "Go API",
      );

      expect(result.pages.size).toBeGreaterThanOrEqual(2);
      const pkgPage = result.pages.get("package-root");
      expect(pkgPage).toBeDefined();
      expect(pkgPage!.html).toContain("Hello");
      expect(pkgPage!.html).toContain("<p>Tiny snapshot fixture.</p>");
      expect(pkgPage!.html).toContain("<p>Second paragraph with <strong>emphasis</strong>.</p>");
    });
  });

  it("uses module-relative package files for nested package edit links", async () => {
    await withTempDir(async (dir) => {
      const snapshot: GodocSnapshot = {
        schema_version: GODOC_SCHEMA_VERSION,
        source: "sourcey-godoc",
        module_path: "example.com/snapshotted",
        packages: [
          {
            importPath: "example.com/snapshotted/internal/core",
            name: "core",
            synopsis: "Core package.",
            doc: "Core package.",
            dir: "internal/core",
            files: ["internal/core/core.go"],
            consts: [],
            vars: [],
            funcs: [],
            types: [],
            examples: [],
          },
        ],
      };
      const snapshotPath = join(dir, "godoc.json");
      await writeFile(snapshotPath, JSON.stringify(snapshot), "utf8");

      const result = await loadGodocTab(
        {
          module: dir,
          packages: ["./..."],
          mode: "snapshot",
          snapshot: snapshotPath,
          includeTests: false,
          includeUnexported: false,
          hideUndocumented: false,
          exclude: [],
          sourceBasePath: "",
        },
        "go-api",
        "Go API",
      );

      expect(result.pages.get("pkg-internal-core")?.editPath).toBe("internal/core/core.go");
    });
  });

  it("rejects a snapshot with the wrong schema_version", async () => {
    await withTempDir(async (dir) => {
      const snapshotPath = join(dir, "godoc.json");
      await writeFile(
        snapshotPath,
        JSON.stringify({ schema_version: 999, source: "sourcey-godoc", module_path: "x", packages: [] }),
        "utf8",
      );

      await expect(
        loadGodocTab(
          {
            module: dir,
            packages: ["./..."],
            mode: "snapshot",
            snapshot: snapshotPath,
            includeTests: false,
            includeUnexported: false,
            hideUndocumented: false,
            exclude: [],
          },
          "go-api",
          "Go API",
        ),
      ).rejects.toThrowError(GodocIntrospectorError);
    });
  });

  it("rejects a snapshot with the wrong source field", async () => {
    await withTempDir(async (dir) => {
      const snapshotPath = join(dir, "godoc.json");
      await writeFile(
        snapshotPath,
        JSON.stringify({ schema_version: GODOC_SCHEMA_VERSION, source: "other", module_path: "x", packages: [] }),
        "utf8",
      );

      await expect(
        loadGodocTab(
          {
            module: dir,
            packages: ["./..."],
            mode: "snapshot",
            snapshot: snapshotPath,
            includeTests: false,
            includeUnexported: false,
            hideUndocumented: false,
            exclude: [],
          },
          "go-api",
          "Go API",
        ),
      ).rejects.toThrowError(/sourcey-godoc/);
    });
  });

  it("rejects a snapshot mode with no snapshot path", async () => {
    await withTempDir(async (dir) => {
      await expect(
        loadGodocTab(
          {
            module: dir,
            packages: ["./..."],
            mode: "snapshot",
            includeTests: false,
            includeUnexported: false,
            hideUndocumented: false,
            exclude: [],
          },
          "go-api",
          "Go API",
        ),
      ).rejects.toThrow(/snapshot/);
    });
  });
});
