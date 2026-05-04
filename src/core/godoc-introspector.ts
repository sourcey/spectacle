import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { ResolvedGodocConfig } from "../config.js";
import type { GodocSnapshot, GodocSpec } from "./godoc-types.js";
import { GODOC_SCHEMA_VERSION } from "./godoc-types.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGED_HELPER_DIR = join(MODULE_DIR, "sourcey-godoc");
const DEV_HELPER_DIR = resolve(MODULE_DIR, "../../go/sourcey-godoc");
const HELPER_ENTRY = "cmd/sourcey-godoc/main.go";

export class GodocIntrospectorError extends Error {
  readonly code: string;
  readonly cause?: Error | undefined;
  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.name = "GodocIntrospectorError";
    this.code = code;
    this.cause = cause;
  }
}

export interface IntrospectOptions {
  config: ResolvedGodocConfig;
  /** Override the Go executable; defaults to "go" on PATH. */
  goBinary?: string;
}

/**
 * Run the Go introspector and return a parsed GodocSpec.
 *
 * Live mode invokes `go run` against the bundled helper, with `GOOS`/`GOARCH`
 * and build tags pinned by `goEnv` when configured. Throws a structured
 * `GodocIntrospectorError` on failure so callers can surface the right
 * diagnostic kind.
 */
export async function runIntrospector(opts: IntrospectOptions): Promise<GodocSpec> {
  const helperDir = await resolveHelperDir();
  const goBinary = opts.goBinary ?? "go";
  const args = buildArgs(opts.config);
  const env = buildEnv(opts.config);

  const { stdout, stderr, code } = await runGo(goBinary, args, helperDir, env);

  if (code === 2) {
    throw new GodocIntrospectorError(
      "GODOC_INTROSPECTOR_FAILED",
      `Go introspector exited with code 2:\n${stderr.trim()}`,
    );
  }
  if (code !== 0 && code !== 1) {
    throw new GodocIntrospectorError(
      "GODOC_INTROSPECTOR_FAILED",
      `Go introspector exited with code ${code}:\n${stderr.trim()}`,
    );
  }

  let snapshot: GodocSnapshot;
  try {
    snapshot = JSON.parse(stdout) as GodocSnapshot;
  } catch (err) {
    throw new GodocIntrospectorError(
      "GODOC_INTROSPECTOR_BAD_JSON",
      `Could not parse introspector output as JSON: ${(err as Error).message}\n` +
        `stdout (first 200 chars): ${stdout.slice(0, 200)}`,
      err as Error,
    );
  }

  if (snapshot.schema_version !== GODOC_SCHEMA_VERSION) {
    throw new GodocIntrospectorError(
      "GODOC_SCHEMA_MISMATCH",
      `Introspector emitted schema_version ${snapshot.schema_version}, ` +
        `expected ${GODOC_SCHEMA_VERSION}. Rebuild Sourcey or update the helper.`,
    );
  }

  return {
    modulePath: snapshot.module_path,
    moduleDir: opts.config.module,
    generatedAt: snapshot.generated_at,
    packages: snapshot.packages,
    diagnostics: snapshot.diagnostics ?? [],
  };
}

/** Locate the helper source in either the packaged dist tree or repo checkout. */
async function resolveHelperDir(): Promise<string> {
  const candidates = [PACKAGED_HELPER_DIR, DEV_HELPER_DIR];
  for (const candidate of candidates) {
    try {
      await access(join(candidate, "go.mod"));
      await access(join(candidate, HELPER_ENTRY));
      return candidate;
    } catch {
      // Try the next known layout.
    }
  }
  throw new GodocIntrospectorError(
    "GODOC_HELPER_MISSING",
    "Sourcey's Go documentation extractor is missing. Checked:\n" +
      candidates.map((candidate) => `- ${join(candidate, HELPER_ENTRY)}`).join("\n") +
      "\nReinstall sourcey or run `npm run build`.",
  );
}

function buildArgs(cfg: ResolvedGodocConfig): string[] {
  const args = ["run", "./cmd/sourcey-godoc", "--module", cfg.module];
  for (const pattern of cfg.packages) args.push("--packages", pattern);
  for (const exclude of cfg.exclude) args.push("--exclude", exclude);
  if (cfg.includeTests) args.push("--include-tests=true");
  else args.push("--include-tests=false");
  if (cfg.includeUnexported) args.push("--include-unexported");
  return args;
}

function buildEnv(cfg: ResolvedGodocConfig): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (cfg.goEnv?.GOOS) env.GOOS = cfg.goEnv.GOOS;
  if (cfg.goEnv?.GOARCH) env.GOARCH = cfg.goEnv.GOARCH;
  if (cfg.goEnv?.tags?.length) {
    env.GOFLAGS = [process.env.GOFLAGS, `-tags=${cfg.goEnv.tags.join(",")}`]
      .filter(Boolean)
      .join(" ");
  }
  return env;
}

interface GoRunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runGo(
  binary: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<GoRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    let child;
    try {
      child = spawn(binary, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      rejectPromise(
        new GodocIntrospectorError(
          "GO_NOT_FOUND",
          `Could not launch Go (${binary}). ` +
            "Install Go from https://go.dev/dl, or use mode: \"snapshot\" with a committed godoc.json.",
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
          new GodocIntrospectorError(
            "GO_NOT_FOUND",
            `Could not launch Go (${binary}). ` +
              "Install Go from https://go.dev/dl, or use mode: \"snapshot\" with a committed godoc.json.",
            err,
          ),
        );
        return;
      }
      rejectPromise(
        new GodocIntrospectorError("GODOC_INTROSPECTOR_FAILED", err.message, err),
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

/** Helper entry paths, exported for tests that pin the runtime. */
export const __helperEntryCandidatesForTests = [
  join(PACKAGED_HELPER_DIR, HELPER_ENTRY),
  join(DEV_HELPER_DIR, HELPER_ENTRY),
];

/** Resolve the helper entry path relative to a given module directory.  */
export function resolveHelperPath(fromDir: string): string {
  return resolve(fromDir, "sourcey-godoc", HELPER_ENTRY);
}
