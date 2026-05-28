import { spawn, spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import type { ResolvedRustdocConfig } from "../config.js";
import { RUSTDOC_DIAGNOSTIC_CODES, SPEC_VERSION } from "./rustdoc-types.js";
import type { RustdocDiagnostic, RustdocSpec } from "./rustdoc-types.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGED_HELPER_DIR = join(MODULE_DIR, "sourcey-rustdoc");
const DEV_HELPER_DIR = resolve(MODULE_DIR, "../../rust/sourcey-rustdoc");
const HELPER_MANIFEST = "Cargo.toml";
const HELPER_ENTRY = "src/main.rs";

export class RustdocIntrospectorError extends Error {
  readonly code: string;
  readonly cause?: Error | undefined;
  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.name = "RustdocIntrospectorError";
    this.code = code;
    this.cause = cause;
  }
}

export interface IntrospectOptions {
  config: ResolvedRustdocConfig;
  /** Override cargo binary; defaults to "cargo" on PATH. */
  cargoBinary?: string;
  /** Override rustup binary; defaults to "rustup" on PATH. */
  rustupBinary?: string;
}

export interface IntrospectResult {
  spec: RustdocSpec;
  diagnostics: RustdocDiagnostic[];
  /** Mode actually used (after auto resolution). */
  modeUsed: "live" | "snapshot";
}

/**
 * Run the bundled Rust helper or load a committed snapshot, return a
 * parsed RustdocSpec plus any diagnostics. Mode is resolved per the
 * spec's auto fallback policy.
 */
export async function runIntrospector(opts: IntrospectOptions): Promise<IntrospectResult> {
  const cfg = opts.config;
  const mode = await resolveMode(cfg, opts);
  if (mode === "snapshot") {
    return loadSnapshot(cfg);
  }
  return runLive(cfg, opts);
}

async function resolveMode(
  cfg: ResolvedRustdocConfig,
  opts: IntrospectOptions,
): Promise<"live" | "snapshot"> {
  if (cfg.mode === "live") return "live";
  if (cfg.mode === "snapshot") {
    if (!cfg.snapshot) {
      throw new RustdocIntrospectorError(
        RUSTDOC_DIAGNOSTIC_CODES.NO_VIABLE_MODE,
        "Rustdoc adapter mode is 'snapshot' but no snapshot path was configured.",
      );
    }
    return "snapshot";
  }
  // auto
  const nightlyAvailable = await probeNightly(opts.rustupBinary ?? "rustup", cfg.toolchain);
  if (nightlyAvailable) return "live";
  if (cfg.snapshot) return "snapshot";
  throw new RustdocIntrospectorError(
    RUSTDOC_DIAGNOSTIC_CODES.NO_VIABLE_MODE,
    `Rustdoc adapter "auto" mode found neither the "${cfg.toolchain}" toolchain nor a configured snapshot. ` +
      `Either run \`rustup toolchain install ${cfg.toolchain}\` or set { mode: "snapshot", snapshot: "./snapshots/rustdoc.json" }.`,
  );
}

async function probeNightly(rustupBinary: string, toolchain: string): Promise<boolean> {
  try {
    const result = spawnSync(rustupBinary, ["toolchain", "list"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0 || !result.stdout) return false;
    return result.stdout.split("\n").some((line) => line.includes(toolchain));
  } catch {
    return false;
  }
}

async function loadSnapshot(cfg: ResolvedRustdocConfig): Promise<IntrospectResult> {
  const snapshotPath = cfg.snapshot;
  if (!snapshotPath) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.NO_VIABLE_MODE,
      "Snapshot mode requires `snapshot` to point at a committed rustdoc.json.",
    );
  }
  let raw: string;
  try {
    if (/\.gz$/i.test(snapshotPath)) {
      const buf = await readFile(snapshotPath);
      raw = gunzipSync(buf).toString("utf8");
    } else {
      raw = await readFile(snapshotPath, "utf8");
    }
  } catch (err) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.INVALID_SNAPSHOT_SCHEMA,
      `Could not read snapshot at ${snapshotPath}: ${(err as Error).message}`,
      err as Error,
    );
  }
  let spec: RustdocSpec;
  try {
    spec = JSON.parse(raw) as RustdocSpec;
  } catch (err) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.INVALID_SNAPSHOT_SCHEMA,
      `Snapshot at ${snapshotPath} is not valid JSON: ${(err as Error).message}`,
      err as Error,
    );
  }
  validateSpec(spec, snapshotPath);
  return {
    spec,
    diagnostics: collectDiagnostics(spec),
    modeUsed: "snapshot",
  };
}

async function runLive(
  cfg: ResolvedRustdocConfig,
  opts: IntrospectOptions,
): Promise<IntrospectResult> {
  const helperDir = await resolveHelperDir();
  const cargoBinary = opts.cargoBinary ?? "cargo";
  const args = buildArgs(cfg, helperDir);

  const { stdout, stderr, code } = await runCargo(cargoBinary, args, helperDir);
  if (code !== 0) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.HELPER_FAILED,
      `sourcey-rustdoc helper exited with code ${code}:\n${stderr.trim()}`,
    );
  }
  let spec: RustdocSpec;
  try {
    spec = JSON.parse(stdout) as RustdocSpec;
  } catch (err) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.HELPER_FAILED,
      `Could not parse helper output as JSON: ${(err as Error).message}\n` +
        `stdout (first 200 chars): ${stdout.slice(0, 200)}`,
      err as Error,
    );
  }
  validateSpec(spec, "live invocation");
  return {
    spec,
    diagnostics: collectDiagnostics(spec),
    modeUsed: "live",
  };
}

function buildArgs(cfg: ResolvedRustdocConfig, _helperDir: string): string[] {
  const args = [
    "run",
    "--release",
    "--quiet",
    "--",
    "--manifest",
    cfg.manifest,
    "--toolchain",
    cfg.toolchain,
    "--output",
    "-",
  ];
  for (const crateName of cfg.crates) {
    args.push("--crate", crateName);
  }
  if (cfg.features.all) {
    args.push("--all-features");
  } else {
    if (cfg.features.default === false) {
      args.push("--no-default-features");
    }
    for (const feature of cfg.features.list) {
      args.push("--features", feature);
    }
  }
  if (cfg.includePrivate) args.push("--include-private");
  if (cfg.includeHidden) args.push("--include-hidden");
  if (cfg.target) args.push("--target", cfg.target);
  return args;
}

async function resolveHelperDir(): Promise<string> {
  const candidates = [PACKAGED_HELPER_DIR, DEV_HELPER_DIR];
  for (const candidate of candidates) {
    try {
      await access(join(candidate, HELPER_MANIFEST));
      await access(join(candidate, HELPER_ENTRY));
      return candidate;
    } catch {
      // try next
    }
  }
  throw new RustdocIntrospectorError(
    RUSTDOC_DIAGNOSTIC_CODES.HELPER_MISSING,
    "Sourcey's Rust documentation helper is missing. Checked:\n" +
      candidates.map((c) => `- ${join(c, HELPER_ENTRY)}`).join("\n") +
      "\nReinstall sourcey or run `npm run build`.",
  );
}

interface CargoRunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runCargo(binary: string, args: string[], cwd: string): Promise<CargoRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    let child;
    try {
      child = spawn(binary, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      rejectPromise(
        new RustdocIntrospectorError(
          RUSTDOC_DIAGNOSTIC_CODES.HELPER_FAILED,
          `Could not launch cargo (${binary}). Install Rust from https://rustup.rs, or use mode: "snapshot" with a committed rustdoc.json.`,
          err as Error,
        ),
      );
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout!.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr!.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        rejectPromise(
          new RustdocIntrospectorError(
            RUSTDOC_DIAGNOSTIC_CODES.HELPER_FAILED,
            `Could not launch cargo (${binary}). Install Rust from https://rustup.rs, or use mode: "snapshot" with a committed rustdoc.json.`,
            err,
          ),
        );
        return;
      }
      rejectPromise(
        new RustdocIntrospectorError(RUSTDOC_DIAGNOSTIC_CODES.HELPER_FAILED, err.message, err),
      );
    });

    child.on("close", (code: number | null) => {
      resolvePromise({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        code: code ?? -1,
      });
    });
  });
}

function validateSpec(spec: RustdocSpec, source: string): void {
  if (spec.version !== SPEC_VERSION) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.INVALID_SNAPSHOT_SCHEMA,
      `Rustdoc snapshot from ${source} reports version ${spec.version}; this sourcey expects ${SPEC_VERSION}.`,
    );
  }
  if (!Array.isArray(spec.crates)) {
    throw new RustdocIntrospectorError(
      RUSTDOC_DIAGNOSTIC_CODES.INVALID_SNAPSHOT_SCHEMA,
      `Rustdoc snapshot from ${source} is missing the \`crates\` array.`,
    );
  }
}

function collectDiagnostics(spec: RustdocSpec): RustdocDiagnostic[] {
  const out: RustdocDiagnostic[] = [];
  for (const d of spec.diagnostics ?? []) {
    out.push(d);
  }
  for (const c of spec.crates) {
    for (const d of c.diagnostics) {
      out.push({ ...d, crate_name: d.crate_name ?? c.name });
    }
  }
  return out;
}

/** Resolved helper entry paths, exported for tests that pin runtime. */
export const __rustdocHelperCandidatesForTests = [
  join(PACKAGED_HELPER_DIR, HELPER_ENTRY),
  join(DEV_HELPER_DIR, HELPER_ENTRY),
];
