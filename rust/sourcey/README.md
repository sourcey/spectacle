# sourcey

[![crates.io](https://img.shields.io/crates/v/sourcey.svg)](https://crates.io/crates/sourcey)
[![docs.rs](https://docs.rs/sourcey/badge.svg)](https://docs.rs/sourcey)

Native documentation tooling for Rust APIs. Companion crate to the
[sourcey](https://sourcey.com) static documentation generator.

This crate is the Rust-side entrypoint to sourcey's `rustdoc()` source
adapter pipeline. It re-exports
[`sourcey-rustdoc`](https://crates.io/crates/sourcey-rustdoc), the helper
that converts nightly rustdoc JSON into a stable `RustdocSpec` snapshot.

```rust
use sourcey::{RustdocSpec, SPEC_VERSION};

let bytes = std::fs::read("snapshots/rustdoc.json")?;
let spec: RustdocSpec = serde_json::from_slice(&bytes)?;
assert_eq!(spec.version, SPEC_VERSION, "schema version mismatch");

for krate in &spec.crates {
    println!("{} has {} items", krate.name, krate.items.len());
}
```

## What is sourcey?

[sourcey](https://sourcey.com) is a static documentation generator that
ships on npm as `sourcey`. It turns OpenAPI specs, MCP servers, Doxygen
XML, godoc output, rustdoc JSON, and rich markdown into a single owned
static site.

The Rust side is opt-in: most users install sourcey via npm and run
`npx sourcey init`. This crate exists so Rust projects that want to
drive snapshot generation from Rust (CI tools, custom build scripts,
alternative renderers) can use the same pipeline as a library.

## Documentation

- Homepage: [sourcey.com](https://sourcey.com)
- Docs: [sourcey.com/docs](https://sourcey.com/docs)
- rustdoc adapter guide: [sourcey.com/docs/adapters/rustdoc](https://sourcey.com/docs/adapters/rustdoc)
- API docs: [docs.rs/sourcey](https://docs.rs/sourcey)
- Repository: [github.com/sourcey/sourcey](https://github.com/sourcey/sourcey)

## License

AGPL-3.0-only. Same license as the main sourcey npm package.
