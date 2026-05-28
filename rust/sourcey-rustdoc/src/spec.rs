use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SPEC_VERSION: u32 = 1;
pub const SOURCEY_RUSTDOC_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RustdocSpec {
    pub version: u32,
    pub sourcey_rustdoc_version: String,
    pub rustdoc_format_version: u32,
    pub rust_toolchain: String,
    pub generated_at: String,
    pub crates: Vec<CrateSpec>,
    /// Diagnostics that apply to the whole snapshot rather than any single
    /// crate (e.g. `RUSTDOC_FORMAT_VERSION_MISMATCH`).
    #[serde(default)]
    pub diagnostics: Vec<Diagnostic>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrateSpec {
    pub name: String,
    pub version: Option<String>,
    pub root_module_id: ItemId,
    pub modules: Vec<ModuleSpec>,
    /// Item id (string) → Item. Stable lookup keyed by rustdoc's per-snapshot id.
    pub items: BTreeMap<String, Item>,
    pub external_crates: Vec<ExternalCrateRef>,
    pub diagnostics: Vec<Diagnostic>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct ItemId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleSpec {
    pub id: ItemId,
    pub path: Vec<String>,
    pub docs_markdown: Option<String>,
    pub doc_aliases: Vec<String>,
    pub item_ids: Vec<ItemId>,
    pub sub_module_paths: Vec<Vec<String>>,
    pub source: Option<SourceLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceLocation {
    pub file: String,
    pub line_start: u32,
    pub line_end: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: ItemId,
    pub name: Option<String>,
    pub path: Vec<String>,
    pub visibility: Visibility,
    pub source: Option<SourceLocation>,
    pub docs_markdown: Option<String>,
    pub doc_aliases: Vec<String>,
    pub deprecation: Option<Deprecation>,
    pub stability: Option<Stability>,
    pub feature_gates: Vec<String>,
    pub attrs_structured: Vec<String>,
    /// Intra-doc link table: link label as it appears in the docstring,
    /// mapped to a resolved target. Internal targets reference a local
    /// item id; external targets carry enough metadata to render a docs.rs
    /// or std URL without a second snapshot lookup.
    pub links: BTreeMap<String, LinkTarget>,
    pub inner: ItemInner,
    pub doctests: Vec<Doctest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Visibility {
    Public,
    Crate,
    Restricted { path: String },
    Default,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deprecation {
    pub since: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stability {
    pub level: StabilityLevel,
    pub since: Option<String>,
    pub feature: Option<String>,
    pub issue: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StabilityLevel {
    Stable,
    Unstable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ItemInner {
    Function(FunctionItem),
    Struct(StructItem),
    Enum(EnumItem),
    Variant(VariantItem),
    Union(UnionItem),
    Trait(TraitItem),
    TraitAlias(TraitAliasItem),
    Impl(ImplItem),
    TypeAlias(TypeAliasItem),
    Constant(ConstantItem),
    Static(StaticItem),
    Macro(MacroItem),
    ProcMacro(ProcMacroItem),
    AssocType(AssocTypeItem),
    AssocConst(AssocConstItem),
    Use(UseItem),
    StructField(StructFieldItem),
    Module,
    Primitive,
    ExternType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionItem {
    pub signature: Signature,
    pub generics: Generics,
    pub is_const: bool,
    pub is_async: bool,
    pub is_unsafe: bool,
    pub has_body: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructItem {
    pub struct_kind: StructKindKind,
    pub generics: Generics,
    pub fields: Vec<ItemId>,
    pub has_stripped_fields: bool,
    pub impls: Vec<ItemId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StructKindKind {
    Plain,
    Tuple,
    Unit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnumItem {
    pub generics: Generics,
    pub variants: Vec<ItemId>,
    pub has_stripped_variants: bool,
    pub impls: Vec<ItemId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantItem {
    pub variant_kind: VariantKindKind,
    pub discriminant: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VariantKindKind {
    Plain,
    Tuple,
    Struct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnionItem {
    pub generics: Generics,
    pub fields: Vec<ItemId>,
    pub has_stripped_fields: bool,
    pub impls: Vec<ItemId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraitItem {
    pub is_auto: bool,
    pub is_unsafe: bool,
    pub is_dyn_compatible: bool,
    pub generics: Generics,
    pub bounds: Vec<String>,
    pub items: Vec<ItemId>,
    pub implementations: Vec<ItemId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraitAliasItem {
    pub generics: Generics,
    pub bounds: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplItem {
    pub generics: Generics,
    pub trait_path: Option<TypePath>,
    pub for_type: TypePath,
    pub items: Vec<ItemId>,
    pub is_negative: bool,
    pub is_synthetic: bool,
    pub is_blanket: bool,
    pub provided_trait_methods: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeAliasItem {
    pub aliased_type: TypePath,
    pub generics: Generics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstantItem {
    pub type_display: String,
    pub expr: String,
    pub value: Option<String>,
    pub is_literal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaticItem {
    pub type_display: String,
    pub expr: String,
    pub is_mutable: bool,
    pub is_unsafe: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroItem {
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcMacroItem {
    pub macro_kind: ProcMacroKindKind,
    pub helpers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProcMacroKindKind {
    Bang,
    Attr,
    Derive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssocTypeItem {
    pub generics: Generics,
    pub bounds: Vec<String>,
    pub default_display: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssocConstItem {
    pub type_display: String,
    pub default_display: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UseItem {
    pub source: String,
    pub name: String,
    pub target_id: Option<ItemId>,
    pub is_glob: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructFieldItem {
    pub type_display: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub display: String,
    pub tokens: Vec<SigToken>,
    pub inputs: Vec<SigInput>,
    pub output_display: Option<String>,
    pub is_c_variadic: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SigInput {
    pub name: String,
    pub type_display: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SigToken {
    Keyword { text: String },
    Punct { text: String },
    Generic { text: String },
    Lifetime { text: String },
    Type { text: String, target: Option<TypePath> },
    Whitespace,
    Newline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypePath {
    pub crate_id: u32,
    pub path: Vec<String>,
    pub display: String,
    pub external: bool,
    pub html_root_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Generics {
    pub params: Vec<GenericParam>,
    pub where_predicates: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenericParam {
    pub name: String,
    pub kind: GenericParamKind,
    pub default_display: Option<String>,
    pub bounds: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GenericParamKind {
    Lifetime,
    Type,
    Const,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum LinkTarget {
    Internal {
        id: ItemId,
    },
    External {
        crate_name: String,
        path: Vec<String>,
        html_root_url: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Doctest {
    pub lang: String,
    pub fence_attributes: Vec<String>,
    pub display_code: String,
    pub executable_code: String,
    pub implicit_main_wrap: bool,
    pub source: Option<SourceLocation>,
    pub ordinal: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalCrateRef {
    pub crate_id: u32,
    pub name: String,
    pub html_root_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub code: String,
    pub message: String,
    pub crate_name: Option<String>,
    pub file: Option<String>,
    pub line: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
    Info,
}
