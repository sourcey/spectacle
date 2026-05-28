---
title: Rustdoc Adapter
description: Generate Rust API documentation from nightly rustdoc JSON. Doctests as a first-class extracted view. Snapshot mode for CI on stable Rust.
---

# Rustdoc adapter

> Rust crates: [`sourcey`](https://crates.io/crates/sourcey) (library entrypoint) · [`sourcey-rustdoc`](https://crates.io/crates/sourcey-rustdoc) (snapshot pipeline). The snapshot schema is identical to the one this adapter consumes; the crates exist for tools that want to drive the same pipeline from Rust.



`rustdoc()` is sourcey's native source for Rust API documentation. It consumes
nightly rustdoc JSON, ships a bundled Rust helper that converts it into a
stable v1 `RustdocSpec` snapshot, and renders pages that match the conventions
of doc.rust-lang.org so deep-links from a docs.rs URL work against sourcey
output.

Doctests are a first-class feature: every code fence inside a `///` or `//!`
doc comment is extracted with hidden-line stripping, fence-attribute badges,
a Rust Playground deep-link, and a copy button. A dedicated `Doctests` index
page aggregates every runnable example across the workspace.

## Install prerequisites

Live mode requires a nightly Rust toolchain. The adapter pins to
`nightly-2026-05-15` (bumped per sourcey release).

```sh
rustup toolchain install nightly-2026-05-15
```

Snapshot mode requires no Rust toolchain at all. Commit a generated
`rustdoc.json` and CI can build docs on stable Rust or even on hosts that
have no Rust installed.

## Quick start

```ts
import { defineConfig, rustdoc } from "sourcey";

export default defineConfig({
  name: "My Crate",
  navigation: {
    tabs: [
      {
        tab: "Rust API",
        slug: "rust-api",
        source: rustdoc({
          manifest: "../Cargo.toml",
          mode: "auto",
          doctestsIndex: true,
        }),
      },
    ],
  },
});
```

## Modes

Three modes control how the snapshot is produced:

- `auto` (default): probe `rustup toolchain list` for nightly. If present,
  invoke the bundled helper. Otherwise read the snapshot.
- `live`: always invoke the bundled helper. Fails if nightly is missing.
- `snapshot`: always read the committed snapshot. Fails if no snapshot path
  is configured.

When `auto` falls back to snapshot it emits a `RUSTDOC_AUTO_FELL_BACK_TO_SNAPSHOT`
info diagnostic. When neither mode is viable it emits `RUSTDOC_NO_VIABLE_MODE`
with the exact `rustup toolchain install` and snapshot-config commands.

## Snapshot lifecycle

Generate a snapshot from your workspace by running the helper directly. The
runx project ships a working example at
[runx/cloud/docs/scripts/snapshot-rustdoc.mjs](https://github.com/runxhq/runx/blob/main/cloud/docs/scripts/snapshot-rustdoc.mjs).
A minimal script:

```js
// scripts/snapshot-rustdoc.mjs
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "cargo",
  [
    "run",
    "--release",
    "--quiet",
    "--manifest-path",
    "./node_modules/sourcey/dist/core/sourcey-rustdoc/Cargo.toml",
    "--",
    "--manifest",
    "./Cargo.toml",
    "--toolchain",
    "nightly",
    "--output",
    "./snapshots/rustdoc.json",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
```

When you upgrade sourcey, regenerate the snapshot using the same pinned
nightly. The adapter's snapshot validator emits
`RUSTDOC_FORMAT_VERSION_MISMATCH` with a remedy when the rustdoc JSON format
moves.

## Doctest rendering

Every doctest is rendered with:

- Hidden `# `-prefixed source lines stripped from the display copy and kept
  in a "Show hidden lines" toggle, including the executable form.
- Fence-attribute badges for `ignore`, `no_run`, `should_panic`,
  `compile_fail`, and any `editionYYYY` marker, each with a tooltip
  explaining what the attribute does.
- A `Run` button that deep-links to the Rust Playground with the executable
  code and the right edition.
- A `Copy` button.

The dedicated `Doctests` index page lists every doctest across the workspace
grouped by parent item. Each entry links back to its source line.

## Anchor algorithm

Anchor IDs are deterministic so deep-links remain stable. The algorithm:

- Per-item: `<kind>.<name>`, e.g. `fn.greet`, `struct.Widget`,
  `trait.Iterator`, `associatedtype.Item`, `tymethod.next`.
- Parametric impls: `impl-<TraitName>-for-<TypeName>` with rustdoc's
  URL-encoded generic form: `%3C` for `<`, `%3E` for `>`, `,+` between
  generic args. Example:
  `impl-Clone-for-HashMap%3CK,+V,+S,+A%3E`.
- Duplicates within a page get a numeric suffix in source order: `-1`,
  `-2`, ...
- Doctests: `doctest-<parent-anchor>-<n>` where n is the doctest's
  source-order ordinal.

The algorithm is part of the sourcey rustdoc contract. Changes require a
minor version bump.

## Intra-doc links

Intra-doc links of the form `` [`Foo`] `` resolve through rustdoc's
per-item `links` map.

- Items in the current workspace resolve to internal sourcey URLs.
- Items in `std`, `core`, or `alloc` resolve to `doc.rust-lang.org/<channel>/...`.
- Items in other external crates resolve to
  `external_crates[crate_id].html_root_url` when present, or to
  `docs.rs/<crate>/latest/...` as a fallback.
- Unresolvable labels render as plain text with
  `title="unresolved intra-doc link"` and emit a
  `RUSTDOC_INTRA_DOC_LINK_UNRESOLVED` info diagnostic.

## First-run compile cost

The bundled Rust helper compiles on first invocation in live mode. Cold
compile is 30–60 seconds on a fast workstation including `rustdoc-types`,
`rustdoc-json`, `serde`, `clap`, and `pulldown-cmark` dependencies.
Subsequent invocations are near-instant. Snapshot mode skips this entirely.

## Diagnostics

| Code | Severity | Meaning |
|---|---|---|
| `RUSTDOC_FORMAT_VERSION_MISMATCH` | error | Snapshot or live output uses a different rustdoc JSON format version than the pinned `rustdoc-types`. Reinstall the pinned nightly and regenerate. |
| `RUSTDOC_INVALID_SNAPSHOT_SCHEMA` | error | Snapshot is missing the `version` field or fails to parse. |
| `RUSTDOC_NO_VIABLE_MODE` | error | Auto mode found neither nightly nor a configured snapshot. |
| `RUSTDOC_HELPER_MISSING` | error | The bundled `sourcey-rustdoc` source is not in the sourcey install. Run `npm rebuild sourcey`. |
| `RUSTDOC_HELPER_FAILED` | error | The helper exited non-zero. The diagnostic message includes stderr. |
| `RUSTDOC_AUTO_FELL_BACK_TO_SNAPSHOT` | info | Auto mode used the snapshot because nightly was missing. |
| `RUSTDOC_INTRA_DOC_LINK_UNRESOLVED` | info | A `[\`Label\`]` link could not be resolved through rustdoc's link table. |
| `RUSTDOC_MISSING_HTML_ROOT_URL` | info | An external-crate reference lacks an `html_root_url`. Link falls back to docs.rs. |
