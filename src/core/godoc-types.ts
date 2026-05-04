/**
 * Sourcey-owned data model for native Go documentation.
 *
 * The Go introspector helper emits this shape as JSON; the loader, renderer,
 * search indexer, and llms emitter all read it. The same shape doubles as the
 * snapshot artifact (`godoc.json`) so JS-only docs hosts can build without Go.
 */

export const GODOC_SCHEMA_VERSION = 1;

export interface GodocSpec {
  /** Module import path from `go.mod` (e.g. "github.com/acme/project"). */
  modulePath: string;
  /** Absolute filesystem path to the module root (containing go.mod). */
  moduleDir: string;
  /** ISO-8601 timestamp recorded by the introspector. */
  generatedAt?: string;
  packages: GodocPackage[];
  diagnostics: GodocDiagnostic[];
}

export interface GodocPackage {
  /** Full import path (e.g. "github.com/acme/project/internal/core"). */
  importPath: string;
  /** Last segment of the import path; the `package` clause name. */
  name: string;
  /** First-sentence summary derived from the package doc comment. */
  synopsis: string;
  /** Full package doc comment, Markdown-ish. */
  doc: string;
  /** Path to the package directory, relative to the module root. */
  dir: string;
  /** Source files contributing to this package (build-tag filtered by `go list`). */
  files: string[];
  consts: GodocValue[];
  vars: GodocValue[];
  funcs: GodocFunc[];
  types: GodocType[];
  examples: GodocExample[];
}

export interface GodocValue {
  name: string;
  doc: string;
  /** Source-faithful declaration, e.g. `const StatusDraft Status = "draft"`. */
  declaration: string;
  position?: SourcePosition;
}

export interface GodocFunc {
  name: string;
  doc: string;
  /** Full signature, e.g. `func Run(ctx context.Context) error`. */
  signature: string;
  position?: SourcePosition;
  examples: GodocExample[];
}

export interface GodocType {
  name: string;
  doc: string;
  /** Source-faithful declaration, including the `type` keyword. */
  declaration: string;
  kind: GodocTypeKind;
  position?: SourcePosition;
  fields: GodocField[];
  methods: GodocFunc[];
  examples: GodocExample[];
}

export type GodocTypeKind = "struct" | "interface" | "alias" | "defined" | "unknown";

export interface GodocField {
  name: string;
  doc: string;
  type: string;
  tag?: string;
  embedded?: boolean;
}

export interface GodocExample {
  /** Bare example name without the `Example` prefix or function suffix. */
  name: string;
  /** `Suffix` portion of `ExampleFoo_Suffix`; empty for the base example. */
  suffix: string;
  doc: string;
  code: string;
  /** Expected output captured from `// Output:` directives. */
  output?: string;
}

export interface SourcePosition {
  /** Path relative to the module root, slash-separated. */
  file: string;
  line: number;
}

export interface GodocDiagnostic {
  severity: "error" | "warning" | "info";
  /** Stable diagnostic code (e.g. `GODOC_PACKAGE_PARSE_FAILED`). */
  code: string;
  message: string;
  package?: string;
  file?: string;
  line?: number;
}

/**
 * On-disk snapshot envelope. Keeps `schema_version` separate from the spec
 * payload so future versions can add fields or migrate without breaking
 * older readers.
 */
export interface GodocSnapshot {
  schema_version: number;
  source: "sourcey-godoc";
  module_path: string;
  packages: GodocPackage[];
  generated_at?: string;
  diagnostics?: GodocDiagnostic[];
}
