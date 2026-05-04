import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveConfigFromRaw } from "../src/config.js";
import type { SourceyConfig } from "../src/config.js";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "sourcey-config-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function baseConfig(extra: Partial<SourceyConfig> = {}): SourceyConfig {
  return {
    name: "Test",
    navigation: { tabs: [] },
    ...extra,
  };
}

describe("resolveConfigFromRaw – godoc tabs", () => {
  it("resolves godoc tab from object form with explicit packages and module", async () => {
    await withTempDir(async (dir) => {
      const moduleDir = join(dir, "go-module");
      await writeFile(join(dir, "go-module-marker"), "");
      await writeFile(join(dir, "snapshot.json"), "{}");
      // assertExists only requires the path to be accessible; the module
      // directory pointer is the temp dir itself for this test.

      const raw = baseConfig({
        navigation: {
          tabs: [
            {
              tab: "Go API",
              godoc: {
                module: ".",
                packages: ["./internal/core/...", "./cmd/..."],
                snapshot: "snapshot.json",
                mode: "live",
                includeTests: false,
                includeUnexported: true,
                exclude: ["./vendor/..."],
                goEnv: { GOOS: "linux", GOARCH: "amd64", tags: ["integration"] },
              },
            },
          ],
        },
      });

      const resolved = await resolveConfigFromRaw(raw, dir);
      expect(resolved.tabs).toHaveLength(1);
      const tab = resolved.tabs[0];
      expect(tab.label).toBe("Go API");
      expect(tab.slug).toBe("go-api");
      expect(tab.godoc).toBeDefined();
      expect(tab.godoc!.module).toBe(dir);
      expect(tab.godoc!.packages).toEqual(["./internal/core/...", "./cmd/..."]);
      expect(tab.godoc!.snapshot).toBe(join(dir, "snapshot.json"));
      expect(tab.godoc!.mode).toBe("live");
      expect(tab.godoc!.includeTests).toBe(false);
      expect(tab.godoc!.includeUnexported).toBe(true);
      expect(tab.godoc!.hideUndocumented).toBe(false);
      expect(tab.godoc!.exclude).toEqual(["./vendor/..."]);
      expect(tab.godoc!.goEnv).toEqual({ GOOS: "linux", GOARCH: "amd64", tags: ["integration"] });
      // Suppress unused-binding warning.
      void moduleDir;
    });
  });

  it("expands the string shorthand into module + default packages and includeTests=true", async () => {
    await withTempDir(async (dir) => {
      const raw = baseConfig({
        navigation: {
          tabs: [{ tab: "Go API", godoc: "." }],
        },
      });

      const resolved = await resolveConfigFromRaw(raw, dir);
      const tab = resolved.tabs[0];
      expect(tab.godoc).toBeDefined();
      expect(tab.godoc!.module).toBe(dir);
      expect(tab.godoc!.packages).toEqual(["./..."]);
      expect(tab.godoc!.mode).toBe("auto");
      expect(tab.godoc!.includeTests).toBe(true);
      expect(tab.godoc!.includeUnexported).toBe(false);
      expect(tab.godoc!.snapshot).toBeUndefined();
    });
  });

  it("defaults module to the config directory when omitted", async () => {
    await withTempDir(async (dir) => {
      const raw = baseConfig({
        navigation: {
          tabs: [{ tab: "Go API", godoc: {} }],
        },
      });

      const resolved = await resolveConfigFromRaw(raw, dir);
      expect(resolved.tabs[0].godoc!.module).toBe(dir);
      expect(resolved.tabs[0].godoc!.packages).toEqual(["./..."]);
      expect(resolved.tabs[0].godoc!.mode).toBe("auto");
    });
  });

  it("rejects a tab with both godoc and another source", async () => {
    await withTempDir(async (dir) => {
      const raw = baseConfig({
        navigation: {
          tabs: [
            {
              tab: "Mixed",
              godoc: ".",
              mcp: "https://example.com/mcp.json",
            },
          ],
        },
      });

      await expect(resolveConfigFromRaw(raw, dir)).rejects.toThrow(/multiple sources/);
    });
  });

  it("includes godoc in the no-source error message", async () => {
    await withTempDir(async (dir) => {
      const raw = baseConfig({
        navigation: {
          tabs: [{ tab: "Empty" }],
        },
      });

      await expect(resolveConfigFromRaw(raw, dir)).rejects.toThrow(/godoc/);
    });
  });

  it("throws when the configured module directory does not exist", async () => {
    await withTempDir(async (dir) => {
      const raw = baseConfig({
        navigation: {
          tabs: [{ tab: "Go API", godoc: "./does-not-exist" }],
        },
      });

      await expect(resolveConfigFromRaw(raw, dir)).rejects.toThrow(/Go module directory/);
    });
  });
});
