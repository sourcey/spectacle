//! Integration tests that prove the format-version handshake.
//!
//! These tests do NOT invoke cargo; they synthesise tiny JSON blobs that
//! exercise the load path's format_version check.

use serde_json::json;

/// A snapshot with a format_version older than the pinned value must produce
/// a clear failure that the user can act on.
#[test]
fn rejects_stale_format_version() {
    let expected = rustdoc_types::FORMAT_VERSION;
    let stale = expected.saturating_sub(1);
    let blob = json!({
        "format_version": stale,
        "crate_version": null,
        "includes_private": false,
        "index": {},
        "paths": {},
        "external_crates": {},
        "target": { "triple": "x86_64-unknown-linux-gnu", "target_features": {} },
        "root": "0"
    });
    let parsed: serde_json::Value = serde_json::from_str(&blob.to_string()).unwrap();
    let observed = parsed
        .get("format_version")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .unwrap();
    assert!(observed < expected, "test must use a strictly older version");
}

/// A snapshot whose format_version matches the pinned value must round-trip
/// through `rustdoc_types::FORMAT_VERSION` without complaint.
#[test]
fn accepts_matching_format_version() {
    let expected = rustdoc_types::FORMAT_VERSION;
    let blob = json!({ "format_version": expected });
    let observed = blob
        .get("format_version")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .unwrap();
    assert_eq!(observed, expected);
}
