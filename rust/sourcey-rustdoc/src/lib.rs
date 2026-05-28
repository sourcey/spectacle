//! Convert nightly rustdoc JSON into a stable `RustdocSpec` snapshot.
//!
//! `sourcey-rustdoc` powers the `rustdoc()` source adapter in [sourcey], the
//! static documentation generator. It is published as a standalone crate so
//! any tool that wants a stable, versioned representation of a Rust crate's
//! API surface can consume the same schema sourcey uses internally.
//!
//! [sourcey]: https://sourcey.com
//!
//! # Pipeline
//!
//! The high-level flow is:
//!
//! 1. Run nightly rustdoc against a Cargo manifest and capture its JSON
//!    output (use the [`rustdoc-json`](https://crates.io/crates/rustdoc-json)
//!    crate for this step).
//! 2. Deserialize into [`rustdoc_types::Crate`] using a matching
//!    `rustdoc-types` version.
//! 3. Walk the crate through [`extract::extract_crate`] to produce a
//!    [`RustdocSpec`] tree: modules, items, signature tokens, intra-doc
//!    link table, extracted doctests, and resolved external-crate
//!    references.
//! 4. Serialize the spec to JSON for downstream consumers (sourcey's
//!    `rustdoc()` adapter, alternative renderers, semver-checkers, etc.).
//!
//! The bundled `sourcey-rustdoc` binary performs all four steps for the
//! common case. Library callers can drive each step directly.
//!
//! # Schema stability
//!
//! [`SPEC_VERSION`] is the schema's major version. Consumers should
//! check `RustdocSpec.version` on load and bail with a clear remedy when
//! it does not match.
//!
//! # Examples
//!
//! ```no_run
//! use sourcey_rustdoc::{
//!     extract::{extract_crate, ExtractOptions},
//!     RustdocSpec, SPEC_VERSION,
//! };
//!
//! fn read_snapshot(path: &str) -> serde_json::Result<RustdocSpec> {
//!     let bytes = std::fs::read(path).expect("snapshot");
//!     let spec: RustdocSpec = serde_json::from_slice(&bytes)?;
//!     assert_eq!(spec.version, SPEC_VERSION, "schema version mismatch");
//!     Ok(spec)
//! }
//! ```

pub mod diagnostics;
pub mod doctest;
pub mod extract;
pub mod links;
pub mod signature;
pub mod spec;

pub use spec::{RustdocSpec, SOURCEY_RUSTDOC_VERSION, SPEC_VERSION};
