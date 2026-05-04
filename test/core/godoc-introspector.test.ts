import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  runIntrospector,
  GodocIntrospectorError,
} from "../../src/core/godoc-introspector.js";
import type { ResolvedGodocConfig } from "../../src/config.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures/godoc/basic");

const goAvailable = (() => {
  try {
    const result = spawnSync("go", ["version"], { stdio: "pipe" });
    return result.status === 0;
  } catch {
    return false;
  }
})();

const skipWithoutGo = goAvailable ? describe : describe.skip;

function fixtureConfig(overrides: Partial<ResolvedGodocConfig> = {}): ResolvedGodocConfig {
  return {
    module: FIXTURES,
    packages: ["./..."],
    mode: "live",
    includeTests: true,
    includeUnexported: false,
    hideUndocumented: false,
    exclude: [],
    ...overrides,
  };
}

skipWithoutGo("runIntrospector – live mode against the basic fixture", () => {
  it("returns a parsed GodocSpec with the module path and one package", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });

    expect(spec.modulePath).toBe("example.com/basic");
    expect(spec.packages).toHaveLength(1);
    const pkg = spec.packages[0];
    expect(pkg.importPath).toBe("example.com/basic");
    expect(pkg.name).toBe("basic");
    expect(pkg.synopsis).toMatch(/^Package basic/);
    expect(pkg.dir).toBe(".");
    expect(pkg.files).toContain("widget.go");
  });

  it("captures exported consts including type-grouped iota blocks", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const constNames = spec.packages[0].consts.map((c) => c.name);
    expect(constNames).toContain("DefaultName");
    expect(constNames).toContain("StatusDraft");
    expect(constNames).toContain("StatusPublished");
    expect(constNames).toContain("StatusArchived");

    const draft = spec.packages[0].consts.find((c) => c.name === "StatusDraft")!;
    // The full const-block declaration is preserved so renderers can print
    // the iota group together.
    expect(draft.declaration).toContain("const (");
    expect(draft.declaration).toContain("StatusDraft");
    expect(draft.declaration).toContain("StatusArchived");
  });

  it("captures exported vars", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const varNames = spec.packages[0].vars.map((v) => v.name);
    expect(varNames).toEqual(["ErrNotFound"]);
  });

  it("hoists factory functions to package-level funcs", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const funcNames = spec.packages[0].funcs.map((f) => f.name);
    expect(funcNames).toContain("New");
    const newFn = spec.packages[0].funcs.find((f) => f.name === "New")!;
    expect(newFn.signature).toMatch(/^func New\(name string\) \*Widget$/);
  });

  it("captures struct types with field tags and ignores unexported fields by default", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const widget = spec.packages[0].types.find((t) => t.name === "Widget")!;
    expect(widget.kind).toBe("struct");
    const fieldNames = widget.fields.map((f) => f.name);
    expect(fieldNames).toContain("Name");
    expect(fieldNames).toContain("Status");
    expect(fieldNames).not.toContain("internalID");
    const nameField = widget.fields.find((f) => f.name === "Name")!;
    expect(nameField.tag).toBe('json:"name"');
  });

  it("captures interface types with method members", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const greeter = spec.packages[0].types.find((t) => t.name === "Greeter")!;
    expect(greeter.kind).toBe("interface");
    const memberNames = greeter.fields.map((m) => m.name);
    expect(memberNames).toContain("Greet");
  });

  it("attaches methods to their owning type", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const widget = spec.packages[0].types.find((t) => t.name === "Widget")!;
    const methodNames = widget.methods.map((m) => m.name);
    expect(methodNames).toEqual(expect.arrayContaining(["Publish", "Archive"]));
  });

  it("attaches examples to the right symbol", async () => {
    const spec = await runIntrospector({ config: fixtureConfig() });
    const newFn = spec.packages[0].funcs.find((f) => f.name === "New")!;
    expect(newFn.examples.length).toBeGreaterThan(0);

    const widget = spec.packages[0].types.find((t) => t.name === "Widget")!;
    const publish = widget.methods.find((m) => m.name === "Publish")!;
    expect(publish.examples.length).toBeGreaterThan(0);
  });

  it("respects includeTests=false by dropping examples", async () => {
    const spec = await runIntrospector({ config: fixtureConfig({ includeTests: false }) });
    const newFn = spec.packages[0].funcs.find((f) => f.name === "New")!;
    expect(newFn.examples).toHaveLength(0);
  });

  it("includes unexported fields when includeUnexported is true", async () => {
    const spec = await runIntrospector({ config: fixtureConfig({ includeUnexported: true }) });
    const widget = spec.packages[0].types.find((t) => t.name === "Widget")!;
    const fieldNames = widget.fields.map((f) => f.name);
    expect(fieldNames).toContain("internalID");
  });

  it("emits a GO_NOT_FOUND error when the binary is missing", async () => {
    await expect(
      runIntrospector({
        config: fixtureConfig(),
        goBinary: "/nonexistent/go-binary-for-tests",
      }),
    ).rejects.toThrowError(GodocIntrospectorError);
  });
});
