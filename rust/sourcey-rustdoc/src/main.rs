use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use anyhow::{anyhow, Context, Result};
use clap::Parser;
use flate2::write::GzEncoder;
use flate2::Compression;
use rustdoc_json::Builder;
use rustdoc_types::Crate;
use time::OffsetDateTime;

use sourcey_rustdoc::diagnostics::{self, codes};
use sourcey_rustdoc::extract::{extract_crate, ExtractOptions};
use sourcey_rustdoc::spec::{Diagnostic, RustdocSpec, SOURCEY_RUSTDOC_VERSION, SPEC_VERSION};

const EXPECTED_FORMAT_VERSION: u32 = rustdoc_types::FORMAT_VERSION;

#[derive(Parser, Debug)]
#[command(version, about = "Convert nightly rustdoc JSON into a sourcey RustdocSpec snapshot.", long_about = None)]
struct Args {
    /// Path to a Cargo manifest (Cargo.toml) or a workspace directory.
    #[arg(long)]
    manifest: PathBuf,

    /// Crate names to include. Repeat to include multiple. If omitted, the
    /// manifest's own package is used.
    #[arg(long = "crate", value_name = "NAME")]
    crates: Vec<String>,

    /// Enable a feature. Repeat for multiple.
    #[arg(long = "features", value_name = "NAME")]
    features: Vec<String>,

    /// Enable all features.
    #[arg(long)]
    all_features: bool,

    /// Disable default features.
    #[arg(long)]
    no_default_features: bool,

    /// Include `pub(crate)` and private items.
    #[arg(long)]
    include_private: bool,

    /// Include items marked `#[doc(hidden)]`.
    #[arg(long)]
    include_hidden: bool,

    /// Target triple to build docs for.
    #[arg(long)]
    target: Option<String>,

    /// rustup toolchain name (default: nightly).
    #[arg(long, default_value = "nightly")]
    toolchain: String,

    /// rustc cap-lints level (default: warn).
    #[arg(long, default_value = "warn")]
    cap_lints: String,

    /// Output path; "-" for stdout.
    #[arg(long, default_value = "-")]
    output: String,

    /// Fail (exit code 2) on any blocking diagnostic.
    #[arg(long)]
    strict: bool,
}

fn main() -> ExitCode {
    let args = Args::parse();
    match run(args) {
        Ok(exit) => exit,
        Err(err) => {
            eprintln!("sourcey-rustdoc: {err:#}");
            ExitCode::from(2)
        }
    }
}

fn run(args: Args) -> Result<ExitCode> {
    let crate_names = resolve_crate_names(&args)?;
    let mut crates = Vec::new();
    let mut diagnostics: Vec<Diagnostic> = Vec::new();

    for crate_name in &crate_names {
        let json_path = build_rustdoc_json(&args, crate_name)
            .with_context(|| format!("building rustdoc JSON for {crate_name}"))?;
        let krate = load_rustdoc_json(&json_path)
            .with_context(|| format!("loading rustdoc JSON for {crate_name}"))?;
        if krate.format_version != EXPECTED_FORMAT_VERSION {
            let msg = format!(
                "rustdoc JSON format v{} produced by toolchain `{}`; this helper was built against v{}. Install `rustup toolchain install nightly-YYYY-MM-DD` to match.",
                krate.format_version, args.toolchain, EXPECTED_FORMAT_VERSION
            );
            diagnostics.push(diagnostics::error(codes::FORMAT_VERSION_MISMATCH, msg));
            if args.strict {
                return Ok(ExitCode::from(2));
            }
            continue;
        }
        let opts = ExtractOptions {
            include_private: args.include_private,
            include_hidden: args.include_hidden,
            crate_name_hint: crate_name.clone(),
        };
        let result = extract_crate(&krate, &opts);
        diagnostics.extend(result.diagnostics);
        crates.push(result.crate_spec);
    }

    let has_error_diagnostic = diagnostics
        .iter()
        .any(|d| matches!(d.severity, sourcey_rustdoc::spec::DiagnosticSeverity::Error));
    let snapshot = RustdocSpec {
        version: SPEC_VERSION,
        sourcey_rustdoc_version: SOURCEY_RUSTDOC_VERSION.to_string(),
        rustdoc_format_version: EXPECTED_FORMAT_VERSION,
        rust_toolchain: args.toolchain.clone(),
        generated_at: now_rfc3339(),
        crates,
        diagnostics,
    };

    // Compact JSON: large snapshots (multi-crate workspaces) benefit from
    // dropping pretty-print whitespace. Gzip is layered on top when the
    // output path ends in `.gz`.
    let serialized =
        serde_json::to_vec(&snapshot).context("serializing RustdocSpec to JSON")?;
    write_output(&args.output, &serialized)?;

    if args.strict && has_error_diagnostic {
        return Ok(ExitCode::from(2));
    }
    Ok(ExitCode::SUCCESS)
}

fn resolve_crate_names(args: &Args) -> Result<Vec<String>> {
    if !args.crates.is_empty() {
        return Ok(args.crates.clone());
    }
    // Read the package name from the manifest as a fallback.
    let manifest = manifest_toml_path(&args.manifest)?;
    let text = fs::read_to_string(&manifest)
        .with_context(|| format!("reading {}", manifest.display()))?;
    let parsed: toml::Value = toml::from_str(&text).context("parsing Cargo.toml")?;
    if let Some(name) = parsed
        .get("package")
        .and_then(|p| p.get("name"))
        .and_then(|n| n.as_str())
    {
        return Ok(vec![name.to_string()]);
    }
    Err(anyhow!(
        "no --crate provided and no [package].name in {}",
        manifest.display()
    ))
}

fn manifest_toml_path(input: &PathBuf) -> Result<PathBuf> {
    if input.is_file() {
        return Ok(input.clone());
    }
    let joined = input.join("Cargo.toml");
    if joined.is_file() {
        return Ok(joined);
    }
    Err(anyhow!("no Cargo.toml at {}", input.display()))
}

fn build_rustdoc_json(args: &Args, crate_name: &str) -> Result<PathBuf> {
    let manifest = manifest_toml_path(&args.manifest)?;
    let mut builder = Builder::default()
        .toolchain(&args.toolchain)
        .manifest_path(&manifest)
        .package(crate_name)
        .cap_lints(Some(&args.cap_lints))
        .document_private_items(args.include_private)
        .quiet(true);
    if args.all_features {
        builder = builder.all_features(true);
    }
    if args.no_default_features {
        builder = builder.no_default_features(true);
    }
    if !args.features.is_empty() {
        builder = builder.features(args.features.iter().map(String::as_str));
    }
    if let Some(target) = &args.target {
        builder = builder.target(target.clone());
    }
    let path = builder
        .build()
        .map_err(|err| anyhow!("rustdoc-json builder failed: {err}"))?;
    Ok(path)
}

fn load_rustdoc_json(path: &PathBuf) -> Result<Crate> {
    let bytes =
        fs::read(path).with_context(|| format!("reading rustdoc JSON at {}", path.display()))?;
    let krate: Crate = serde_json::from_slice(&bytes).context("parsing rustdoc JSON")?;
    Ok(krate)
}

fn write_output(target: &str, contents: &[u8]) -> Result<()> {
    if target == "-" {
        let stdout = std::io::stdout();
        let mut handle = stdout.lock();
        handle.write_all(contents)?;
        handle.write_all(b"\n")?;
        return Ok(());
    }
    let path = PathBuf::from(target);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).with_context(|| format!("creating {}", parent.display()))?;
        }
    }
    if is_gz_path(&path) {
        let file = fs::File::create(&path)
            .with_context(|| format!("creating {}", path.display()))?;
        let mut encoder = GzEncoder::new(file, Compression::default());
        encoder
            .write_all(contents)
            .with_context(|| format!("writing gzip stream to {}", path.display()))?;
        encoder.finish().with_context(|| format!("finalising {}", path.display()))?;
    } else {
        fs::write(&path, contents).with_context(|| format!("writing {}", path.display()))?;
    }
    Ok(())
}

fn is_gz_path(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("gz"))
}

fn now_rfc3339() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn format_version_constant_present() {
        // Sentinel: confirms the helper's expected format version matches
        // the pinned rustdoc-types dependency at compile time.
        assert_eq!(super::EXPECTED_FORMAT_VERSION, rustdoc_types::FORMAT_VERSION);
    }
}
