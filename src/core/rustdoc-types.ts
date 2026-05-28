/**
 * TypeScript mirror of the v1 RustdocSpec snapshot schema emitted by the
 * bundled `sourcey-rustdoc` helper crate. Keep in lock-step with
 * `oss/rust/sourcey-rustdoc/src/spec.rs`.
 */

export const SPEC_VERSION = 1 as const;

export type ItemId = string;

export type RustdocMode = "auto" | "live" | "snapshot";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface RustdocSpec {
  version: number;
  sourcey_rustdoc_version: string;
  rustdoc_format_version: number;
  rust_toolchain: string;
  generated_at: string;
  crates: CrateSpec[];
  /** Snapshot-level diagnostics (e.g. format_version mismatch). */
  diagnostics?: RustdocDiagnostic[];
}

export interface CrateSpec {
  name: string;
  version: string | null;
  root_module_id: ItemId;
  modules: ModuleSpec[];
  items: Record<ItemId, Item>;
  external_crates: ExternalCrateRef[];
  diagnostics: RustdocDiagnostic[];
}

export interface ModuleSpec {
  id: ItemId;
  path: string[];
  docs_markdown: string | null;
  doc_aliases: string[];
  item_ids: ItemId[];
  sub_module_paths: string[][];
  source: SourceLocation | null;
}

export interface SourceLocation {
  file: string;
  line_start: number;
  line_end: number;
}

export type Visibility =
  | { kind: "public" }
  | { kind: "crate" }
  | { kind: "restricted"; path: string }
  | { kind: "default" };

export interface Deprecation {
  since: string | null;
  note: string | null;
}

export type StabilityLevel = "stable" | "unstable";

export interface Stability {
  level: StabilityLevel;
  since: string | null;
  feature: string | null;
  issue: number | null;
}

export interface Item {
  id: ItemId;
  name: string | null;
  path: string[];
  visibility: Visibility;
  source: SourceLocation | null;
  docs_markdown: string | null;
  doc_aliases: string[];
  deprecation: Deprecation | null;
  stability: Stability | null;
  feature_gates: string[];
  attrs_structured: string[];
  /** Intra-doc link table: link label → resolved target. From rustdoc's `Item.links`. */
  links: Record<string, LinkTarget>;
  inner: ItemInner;
  doctests: Doctest[];
}

export type ItemInner =
  | ({ kind: "function" } & FunctionItem)
  | ({ kind: "struct" } & StructItem)
  | ({ kind: "enum" } & EnumItem)
  | ({ kind: "variant" } & VariantItem)
  | ({ kind: "union" } & UnionItem)
  | ({ kind: "trait" } & TraitItem)
  | ({ kind: "trait_alias" } & TraitAliasItem)
  | ({ kind: "impl" } & ImplItem)
  | ({ kind: "type_alias" } & TypeAliasItem)
  | ({ kind: "constant" } & ConstantItem)
  | ({ kind: "static" } & StaticItem)
  | ({ kind: "macro" } & MacroItem)
  | ({ kind: "proc_macro" } & ProcMacroItem)
  | ({ kind: "assoc_type" } & AssocTypeItem)
  | ({ kind: "assoc_const" } & AssocConstItem)
  | ({ kind: "use" } & UseItem)
  | ({ kind: "struct_field" } & StructFieldItem)
  | { kind: "module" }
  | { kind: "primitive" }
  | { kind: "extern_type" };

export interface FunctionItem {
  signature: Signature;
  generics: Generics;
  is_const: boolean;
  is_async: boolean;
  is_unsafe: boolean;
  has_body: boolean;
}

export type StructKindKind = "plain" | "tuple" | "unit";

export interface StructItem {
  struct_kind: StructKindKind;
  generics: Generics;
  fields: ItemId[];
  has_stripped_fields: boolean;
  impls: ItemId[];
}

export interface EnumItem {
  generics: Generics;
  variants: ItemId[];
  has_stripped_variants: boolean;
  impls: ItemId[];
}

export type VariantKindKind = "plain" | "tuple" | "struct";

export interface VariantItem {
  variant_kind: VariantKindKind;
  discriminant: string | null;
}

export interface UnionItem {
  generics: Generics;
  fields: ItemId[];
  has_stripped_fields: boolean;
  impls: ItemId[];
}

export interface TraitItem {
  is_auto: boolean;
  is_unsafe: boolean;
  is_dyn_compatible: boolean;
  generics: Generics;
  bounds: string[];
  items: ItemId[];
  implementations: ItemId[];
}

export interface TraitAliasItem {
  generics: Generics;
  bounds: string[];
}

export interface ImplItem {
  generics: Generics;
  trait_path: TypePath | null;
  for_type: TypePath;
  items: ItemId[];
  is_negative: boolean;
  is_synthetic: boolean;
  is_blanket: boolean;
  provided_trait_methods: string[];
}

export interface TypeAliasItem {
  aliased_type: TypePath;
  generics: Generics;
}

export interface ConstantItem {
  type_display: string;
  expr: string;
  value: string | null;
  is_literal: boolean;
}

export interface StaticItem {
  type_display: string;
  expr: string;
  is_mutable: boolean;
  is_unsafe: boolean;
}

export interface MacroItem {
  source: string;
}

export type ProcMacroKindKind = "bang" | "attr" | "derive";

export interface ProcMacroItem {
  macro_kind: ProcMacroKindKind;
  helpers: string[];
}

export interface AssocTypeItem {
  generics: Generics;
  bounds: string[];
  default_display: string | null;
}

export interface AssocConstItem {
  type_display: string;
  default_display: string | null;
}

export interface UseItem {
  source: string;
  name: string;
  target_id: ItemId | null;
  is_glob: boolean;
}

export interface StructFieldItem {
  type_display: string;
}

export interface Signature {
  display: string;
  tokens: SigToken[];
  inputs: SigInput[];
  output_display: string | null;
  is_c_variadic: boolean;
}

export interface SigInput {
  name: string;
  type_display: string;
}

export type SigToken =
  | { kind: "keyword"; text: string }
  | { kind: "punct"; text: string }
  | { kind: "generic"; text: string }
  | { kind: "lifetime"; text: string }
  | { kind: "type"; text: string; target: TypePath | null }
  | { kind: "whitespace" }
  | { kind: "newline" };

export interface TypePath {
  crate_id: number;
  path: string[];
  display: string;
  external: boolean;
  html_root_url: string | null;
}

export interface Generics {
  params: GenericParam[];
  where_predicates: string[];
}

export type GenericParamKind = "lifetime" | "type" | "const";

export interface GenericParam {
  name: string;
  kind: GenericParamKind;
  default_display: string | null;
  bounds: string[];
}

export type LinkTarget =
  | { kind: "internal"; id: ItemId }
  | { kind: "external"; crate_name: string; path: string[]; html_root_url: string | null };

export interface Doctest {
  lang: string;
  fence_attributes: string[];
  display_code: string;
  executable_code: string;
  implicit_main_wrap: boolean;
  source: SourceLocation | null;
  ordinal: number;
}

export interface ExternalCrateRef {
  crate_id: number;
  name: string;
  html_root_url: string | null;
}

export interface RustdocDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  crate_name?: string | null;
  file?: string | null;
  line?: number | null;
}

export const RUSTDOC_DIAGNOSTIC_CODES = {
  FORMAT_VERSION_MISMATCH: "RUSTDOC_FORMAT_VERSION_MISMATCH",
  INTRA_DOC_LINK_UNRESOLVED: "RUSTDOC_INTRA_DOC_LINK_UNRESOLVED",
  MISSING_HTML_ROOT_URL: "RUSTDOC_MISSING_HTML_ROOT_URL",
  AUTO_FELL_BACK_TO_SNAPSHOT: "RUSTDOC_AUTO_FELL_BACK_TO_SNAPSHOT",
  NO_VIABLE_MODE: "RUSTDOC_NO_VIABLE_MODE",
  HELPER_MISSING: "RUSTDOC_HELPER_MISSING",
  HELPER_FAILED: "RUSTDOC_HELPER_FAILED",
  INVALID_SNAPSHOT_SCHEMA: "RUSTDOC_INVALID_SNAPSHOT_SCHEMA",
  NIGHTLY_NOT_FOUND: "RUST_NIGHTLY_NOT_FOUND",
  RUSTUP_NOT_FOUND: "RUSTUP_NOT_FOUND",
} as const;

export type RustdocDiagnosticCode =
  (typeof RUSTDOC_DIAGNOSTIC_CODES)[keyof typeof RUSTDOC_DIAGNOSTIC_CODES];
