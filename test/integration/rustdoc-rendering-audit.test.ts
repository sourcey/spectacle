import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import type { ResolvedRustdocConfig } from "../../src/config.js";
import { loadRustdocTab } from "../../src/core/rustdoc-loader.js";

const FIXTURE_MANIFEST = resolve(import.meta.dirname, "../fixtures/rustdoc/basic/Cargo.toml");
const FIXTURE_SNAPSHOT = resolve(
  import.meta.dirname,
  "../fixtures/rustdoc/basic/snapshots/rustdoc.json",
);

function snapshotConfig(): ResolvedRustdocConfig {
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
  };
}

const baseChecks = [
  { name: "code-header class", pattern: /class="code-header rust-signature"/ },
  { name: "doctest example-wrap", pattern: /class="rust-doctest example-wrap api-doctest"/ },
  { name: "section anchor §", pattern: /class="anchor api-anchor"/ },
  { name: "rust-item section", pattern: /class="rust-item rust-/ },
  { name: "rust-doc docblock", pattern: /class="docblock rust-doc"/ },
  { name: "method-toggle details", pattern: /class="toggle method-toggle api-method-toggle"/ },
  { name: "rightside item-info row", pattern: /class="rightside api-rightside"/ },
];

const doctestChecks = [
  { name: "hidden-line toggle", pattern: /rust-doctest-toggle-hidden/ },
  { name: "run button", pattern: /class="test-arrow rust-doctest-run"/ },
  { name: "copy button", pattern: /class="rust-doctest-copy"/ },
  { name: "fence badges container", pattern: /class="rust-doctest-badges"/ },
];

async function loadResult() {
  return loadRustdocTab(snapshotConfig(), "rust-api", "Rust API", {
    repo: "https://github.com/nilstate/sourcey",
    editBranch: "main",
    editBasePath: "",
  });
}

async function concatenatedHtml(): Promise<string> {
  const result = await loadResult();
  const parts: string[] = [];
  for (const page of result.pages.values()) parts.push(page.html);
  return parts.join("\n");
}

describe("rustdoc rendering audit", () => {
  it("hits every must-have DOM element from the rendering catalog", async () => {
    const html = await concatenatedHtml();
    for (const check of baseChecks) {
      expect(html, `missing must-have element: ${check.name}`).toMatch(check.pattern);
    }
  });

  it("renders doctest hidden-line toggle, fence badges, run, and copy controls", async () => {
    const html = await concatenatedHtml();
    for (const check of doctestChecks) {
      expect(html, `missing doctest element: ${check.name}`).toMatch(check.pattern);
    }
  });

  it("emits a real workspace index page (not the empty fallback)", async () => {
    const result = await loadResult();
    const index = result.pages.get("index")!;
    expect(index.html).toContain("rust-workspace-index");
    expect(index.html).not.toContain("No documented crates.");
  });

  it("uses rustdoc-style item anchors (fn.greet) in search entries", async () => {
    const result = await loadResult();
    const anchors = new Set<string>();
    for (const page of result.pages.values()) {
      for (const entry of page.searchEntries ?? []) {
        if (entry.anchor) anchors.add(entry.anchor);
      }
    }
    expect([...anchors].some((a) => /^[a-z]+\./.test(a))).toBe(true);
    expect([...anchors].every((a) => !/^\d+$/.test(a))).toBe(true);
  });

  it("renders impl methods (FINDING-002 regression check)", async () => {
    const html = await concatenatedHtml();
    expect(html).toMatch(/Widget::new|fn\.new/);
    expect(html).toMatch(/publish|fn\.publish/);
  });
});
