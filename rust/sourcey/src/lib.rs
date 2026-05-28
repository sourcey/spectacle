//! Native documentation tooling for Rust APIs.
//!
//! [sourcey] is a static documentation generator: it turns OpenAPI specs,
//! MCP servers, Doxygen XML, godoc output, **rustdoc JSON**, and rich
//! markdown into a single owned static site. The TypeScript build pipeline
//! ships on npm as `sourcey`.
//!
//! This crate is the Rust-side companion. It re-exports
//! [`sourcey_rustdoc`], the helper that converts nightly rustdoc JSON into
//! a stable [`RustdocSpec`] snapshot, and gives Rust projects a
//! library-shaped entrypoint to the same pipeline sourcey uses internally
//! when consumers configure a `rustdoc()` tab.
//!
//! [sourcey]: https://sourcey.com
//!
//! # When to use this crate
//!
//! - You are integrating with sourcey's `rustdoc()` source adapter and
//!   want to drive snapshot generation from Rust (CI tools, custom build
//!   scripts, alternative renderers).
//! - You are writing a Rust-API analyzer (semver checker, public-API
//!   diffing, agent-facing surface dump) and want a stable, versioned
//!   schema over rustdoc's unstable JSON.
//!
//! # Layout
//!
//! - [`rustdoc`] - extract a [`RustdocSpec`] from rustdoc JSON. Mirrors
//!   the shape sourcey ships in its `oss/rust/sourcey-rustdoc/` helper.
//! - [`RustdocSpec`], [`SPEC_VERSION`] - top-level schema entry points.
//!
//! # Example
//!
//! ```no_run
//! use sourcey::{RustdocSpec, SPEC_VERSION};
//!
//! let bytes = std::fs::read("snapshots/rustdoc.json").unwrap();
//! let spec: RustdocSpec = serde_json::from_slice(&bytes).unwrap();
//! assert_eq!(spec.version, SPEC_VERSION, "schema version mismatch");
//!
//! for krate in &spec.crates {
//!     println!("{} has {} items", krate.name, krate.items.len());
//! }
//! ```
//!
//! # Links
//!
//! - <https://sourcey.com> - product homepage
//! - <https://sourcey.com/docs> - full documentation
//! - <https://sourcey.com/docs/adapters/rustdoc> - rustdoc adapter guide
//! - <https://github.com/sourcey/sourcey> - source repository

pub use sourcey_rustdoc as rustdoc;
pub use sourcey_rustdoc::{RustdocSpec, SOURCEY_RUSTDOC_VERSION, SPEC_VERSION};
