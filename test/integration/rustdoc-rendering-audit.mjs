#!/usr/bin/env node
// Rendering audit for the sourcey rustdoc adapter.
//
// Loads the fixture's committed snapshot through the loader, asserts each
// must-have DOM element from the rendering catalog is present in the produced
// HTML, and optionally writes the rendered output to a target directory for
// regression diffing.
//
// Usage:
//   node test/integration/rustdoc-rendering-audit.mjs <output-dir>
//   node test/integration/rustdoc-rendering-audit.mjs --check doctests <output-dir>
//   node test/integration/rustdoc-rendering-audit.mjs --capture <output-dir>
//
// Exit codes: 0 on full audit pass, 1 on any missing element.

import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRustdocTab } from "../../src/core/rustdoc-loader.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_MANIFEST = resolve(HERE, "../fixtures/rustdoc/basic/Cargo.toml");
const FIXTURE_SNAPSHOT = resolve(HERE, "../fixtures/rustdoc/basic/snapshots/rustdoc.json");

const args = process.argv.slice(2);
const flags = new Set();
let check = null;
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--check") {
    check = args[++i];
  } else if (a === "--capture" || a === "--full") {
    flags.add(a.replace(/^--/, ""));
  } else {
    positional.push(a);
  }
}
const outputDir = positional[0] ?? resolve(HERE, "../fixtures/rustdoc/expected-output");

const must = {
  base: [
    { name: "code-header class", pattern: /class="code-header rust-signature"/ },
    { name: "doctest example-wrap", pattern: /class="rust-doctest example-wrap api-doctest"/ },
    { name: "section anchor §", pattern: /class="anchor api-anchor"/ },
    { name: "rust-item section", pattern: /class="rust-item rust-/ },
    { name: "rust-doc docblock", pattern: /class="docblock rust-doc"/ },
    { name: "method-toggle details", pattern: /class="toggle method-toggle api-method-toggle"/ },
    { name: "rightside item-info row", pattern: /class="rightside api-rightside"/ },
  ],
  doctests: [
    { name: "doctest hidden-line toggle", pattern: /rust-doctest-toggle-hidden/ },
    { name: "doctest run button", pattern: /class="test-arrow rust-doctest-run"/ },
    { name: "doctest copy button", pattern: /class="rust-doctest-copy"/ },
    { name: "doctest fence badge container", pattern: /class="rust-doctest-badges"/ },
  ],
};

const config = {
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

const result = await loadRustdocTab(config, "rust-api", "Rust API", {
  repo: "https://github.com/nilstate/sourcey",
  editBranch: "main",
  editBasePath: "",
});

const concatenated = [...result.pages.values()].map((p) => p.html).join("\n");

let failed = 0;
const groups = check ? [must[check]] : [must.base, ...(flags.has("full") ? [must.doctests] : [must.doctests])];

for (const group of groups) {
  for (const { name, pattern } of group) {
    if (!pattern.test(concatenated)) {
      console.error(`MISSING: ${name} (pattern ${pattern})`);
      failed++;
    }
  }
}

if (flags.has("capture")) {
  const tabDir = resolve(outputDir, "rust-api");
  await mkdir(tabDir, { recursive: true });
  for (const [slug, page] of result.pages) {
    const outFile = resolve(tabDir, `${slug}.html`);
    await writeFile(outFile, page.html);
  }
  const searchEntries = [];
  for (const page of result.pages.values()) {
    for (const entry of page.searchEntries ?? []) searchEntries.push(entry);
  }
  await writeFile(
    resolve(outputDir, "search-index.json"),
    JSON.stringify(searchEntries),
  );
  console.log(`captured ${result.pages.size} pages to ${tabDir}`);
  console.log(`captured ${searchEntries.length} search entries to ${outputDir}/search-index.json`);
}

if (failed > 0) {
  console.error(`audit FAILED: ${failed} missing element(s)`);
  process.exit(1);
}
console.log(`audit PASSED: ${concatenated.length} bytes, ${result.pages.size} pages`);
