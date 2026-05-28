# sourcey-rustdoc

[![crates.io](https://img.shields.io/crates/v/sourcey-rustdoc.svg)](https://crates.io/crates/sourcey-rustdoc)
[![docs.rs](https://docs.rs/sourcey-rustdoc/badge.svg)](https://docs.rs/sourcey-rustdoc)

Convert nightly rustdoc JSON into a stable `RustdocSpec` snapshot. Powers
the [sourcey](https://sourcey.com) `rustdoc()` source adapter; published
standalone so any tool that wants a stable representation of a Rust crate's
API surface can consume the same schema.

Most users install sourcey via npm (`npx sourcey init`) and never touch
this crate directly. It is published for:

- alternative renderers that want a stable Rust-side schema
- semver checkers and public-API analyzers
- CI tools that drive snapshot generation from Rust

If you just want sourcey for your project, see
[sourcey.com/docs/adapters/rustdoc](https://sourcey.com/docs/adapters/rustdoc).

## CLI

```
sourcey-rustdoc --manifest <path> [options] [--output <file>|-]
```

Key flags:

- `--manifest <path>` Path to the Cargo manifest (file or directory).
- `--crate <name>` Crate name to document; repeat for several. Defaults to
  the manifest's own package.
- `--features <name>` Enable a feature; repeat for several.
- `--all-features` Enable all features.
- `--no-default-features` Disable default features.
- `--include-private` Include `pub(crate)` and private items.
- `--include-hidden` Include `#[doc(hidden)]` items.
- `--target <triple>` Build docs for a specific target triple.
- `--toolchain <name>` rustup toolchain to invoke; default `nightly`.
- `--cap-lints <level>` Pass through to rustdoc; default `warn`.
- `--output <path>|-` Where to write the snapshot. `-` writes to stdout.
- `--strict` Exit non-zero on any error-level diagnostic.

## Snapshot format

See `src/spec.rs`. The schema is versioned by the top-level `version` field
(currently `1`) and pinned to a specific rustdoc JSON `format_version` via
the `rustdoc-types` dependency. The `format_version` carried in the
snapshot lets consumers verify they read a compatible artifact.

## First-run compile cost

The first invocation runs `cargo build --release` for this crate and all of
its dependencies (`rustdoc-types`, `rustdoc-json`, `serde`, `clap`,
`pulldown-cmark`, ...). On a warm cargo cache this is fast; on a cold
machine expect 30–60s. Subsequent invocations are near-instant.

Snapshot mode in the TS adapter sidesteps this entirely by reading a
committed `rustdoc.json`, so projects that build their docs site in CI
without a Rust toolchain are unaffected.
