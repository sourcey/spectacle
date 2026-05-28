use std::collections::{BTreeMap, HashMap, HashSet};

use rustdoc_types::{Crate, Id, Item as RdItem, ItemEnum, StructKind, VariantKind, Visibility as RdVisibility};

use crate::diagnostics::{self, codes};
use crate::doctest::extract_doctests;
use crate::links::{format_id, LinkContext};
use crate::signature::{lower_generics, lower_signature, render_type};
use crate::spec::{
    AssocConstItem, AssocTypeItem, ConstantItem, CrateSpec, Deprecation, Diagnostic, EnumItem,
    FunctionItem, ImplItem, Item, ItemId, ItemInner, LinkTarget, MacroItem, ModuleSpec,
    ProcMacroItem, ProcMacroKindKind, SourceLocation, Stability, StabilityLevel, StaticItem,
    StructFieldItem, StructItem, StructKindKind, TraitAliasItem, TraitItem, TypeAliasItem,
    TypePath, UnionItem, UseItem, VariantItem, VariantKindKind, Visibility,
};

pub struct ExtractOptions {
    pub include_private: bool,
    pub include_hidden: bool,
    pub crate_name_hint: String,
}

pub struct ExtractResult {
    pub crate_spec: CrateSpec,
    pub diagnostics: Vec<Diagnostic>,
}

pub fn extract_crate(krate: &Crate, opts: &ExtractOptions) -> ExtractResult {
    let links = LinkContext::new(krate);
    let mut diagnostics: Vec<Diagnostic> = Vec::new();
    let mut items: BTreeMap<String, Item> = BTreeMap::new();
    let mut modules: Vec<ModuleSpec> = Vec::new();
    let mut emitted: HashSet<ItemId> = HashSet::new();

    for (id, rd_item) in &krate.index {
        if !should_emit(rd_item, opts) {
            continue;
        }
        let item_id = ItemId(format_id(id));
        if !emitted.insert(item_id.clone()) {
            continue;
        }
        match &rd_item.inner {
            ItemEnum::Module(m) => {
                modules.push(lower_module(id, rd_item, m, krate));
                // Also surface modules as items so per-module sidebar entries,
                // search categories, and parent-module pages can link to
                // their children.
                if let Some(item) = lower_item(id, rd_item, krate, &links, &mut diagnostics) {
                    items.insert(item.id.0.clone(), item);
                }
            }
            _ => {
                if let Some(item) = lower_item(id, rd_item, krate, &links, &mut diagnostics) {
                    items.insert(item.id.0.clone(), item);
                }
            }
        }
    }

    let root_module_id = ItemId(format_id(&krate.root));
    // Prefer the user-supplied crate name (matches Cargo.toml `[package].name`,
    // hyphens preserved). Fall back to rustdoc's lib target name (underscored)
    // when no hint is set.
    let crate_name = if opts.crate_name_hint.is_empty() {
        krate
            .index
            .get(&krate.root)
            .and_then(|i| i.name.clone())
            .unwrap_or_default()
    } else {
        opts.crate_name_hint.clone()
    };
    let crate_version = krate.crate_version.clone();

    let crate_spec = CrateSpec {
        name: crate_name,
        version: crate_version,
        root_module_id,
        modules,
        items,
        external_crates: links.external_crates(),
        diagnostics: diagnostics.clone(),
    };
    if diagnostics.iter().any(|d| d.code == codes::INTRA_DOC_LINK_UNRESOLVED) {
        // Carry intra-doc-link diagnostics into the crate-level diagnostics
        // (already in `crate_spec.diagnostics`); we return the same set in the
        // top-level summary for caller-level visibility.
    }
    ExtractResult {
        crate_spec,
        diagnostics,
    }
}

fn should_emit(item: &RdItem, opts: &ExtractOptions) -> bool {
    if !opts.include_hidden {
        for attr in &item.attrs {
            if let rustdoc_types::Attribute::Other(s) = attr {
                if s.contains("doc(hidden)") {
                    return false;
                }
            }
        }
    }
    if opts.include_private {
        return true;
    }
    // Without --document-private-items, rustdoc's `index` only contains
    // items it considers documented (public, or implicitly public via a
    // public parent). Most items inside impl blocks, trait assoc items,
    // enum variants, and struct fields carry `Default` visibility but are
    // still public because their parent is. Trust rustdoc's filtering and
    // only drop explicit `Crate`/`Restricted` visibility.
    match &item.visibility {
        RdVisibility::Public | RdVisibility::Default => true,
        RdVisibility::Crate | RdVisibility::Restricted { .. } => false,
    }
}

fn lower_module(id: &Id, item: &RdItem, m: &rustdoc_types::Module, krate: &Crate) -> ModuleSpec {
    let path = path_for_id(id, krate);
    let item_ids: Vec<ItemId> = m.items.iter().map(|i| ItemId(format_id(i))).collect();
    let sub_module_paths: Vec<Vec<String>> = m
        .items
        .iter()
        .filter_map(|i| krate.index.get(i))
        .filter(|child| matches!(child.inner, ItemEnum::Module(_)))
        .map(|child| {
            let mut p = path.clone();
            if let Some(name) = &child.name {
                p.push(name.clone());
            }
            p
        })
        .collect();
    ModuleSpec {
        id: ItemId(format_id(id)),
        path,
        docs_markdown: item.docs.clone(),
        doc_aliases: extract_doc_aliases(item),
        item_ids,
        sub_module_paths,
        source: lower_source(item),
    }
}

fn lower_item(
    id: &Id,
    rd_item: &RdItem,
    krate: &Crate,
    links: &LinkContext<'_>,
    diagnostics: &mut Vec<Diagnostic>,
) -> Option<Item> {
    let item_id = ItemId(format_id(id));
    let inner = lower_inner(rd_item, krate, links, diagnostics)?;
    let docs_markdown = rd_item.docs.clone();
    let doctests = docs_markdown
        .as_deref()
        .map(extract_doctests)
        .unwrap_or_default();
    let item = Item {
        id: item_id,
        name: rd_item.name.clone(),
        path: path_for_id(id, krate),
        visibility: lower_visibility(&rd_item.visibility),
        source: lower_source(rd_item),
        docs_markdown,
        doc_aliases: extract_doc_aliases(rd_item),
        deprecation: rd_item.deprecation.as_ref().map(|d| Deprecation {
            since: d.since.clone(),
            note: d.note.clone(),
        }),
        stability: extract_stability(rd_item),
        feature_gates: extract_feature_gates(rd_item),
        attrs_structured: extract_structured_attrs(rd_item),
        links: rd_item
            .links
            .iter()
            .map(|(label, id)| {
                let target = links.resolve_id(id).map(|resolved| {
                    if resolved.external {
                        LinkTarget::External {
                            crate_name: links
                                .external_crate_index
                                .get(&resolved.crate_id)
                                .map(|ec| ec.name.clone())
                                .unwrap_or_default(),
                            path: resolved.path,
                            html_root_url: resolved.html_root_url,
                        }
                    } else {
                        LinkTarget::Internal { id: resolved.id }
                    }
                }).unwrap_or(LinkTarget::Internal { id: ItemId(format_id(id)) });
                (label.clone(), target)
            })
            .collect(),
        inner,
        doctests,
    };
    Some(item)
}

fn lower_inner(
    rd_item: &RdItem,
    krate: &Crate,
    links: &LinkContext<'_>,
    diagnostics: &mut Vec<Diagnostic>,
) -> Option<ItemInner> {
    let inner = match &rd_item.inner {
        ItemEnum::Function(f) => ItemInner::Function(FunctionItem {
            signature: lower_signature(
                &f.sig,
                rd_item.name.as_deref().unwrap_or(""),
                f.header.is_const,
                f.header.is_async,
                f.header.is_unsafe,
                links,
            ),
            generics: lower_generics(&f.generics),
            is_const: f.header.is_const,
            is_async: f.header.is_async,
            is_unsafe: f.header.is_unsafe,
            has_body: f.has_body,
        }),
        ItemEnum::Struct(s) => ItemInner::Struct(StructItem {
            struct_kind: match &s.kind {
                StructKind::Plain { .. } => StructKindKind::Plain,
                StructKind::Tuple(_) => StructKindKind::Tuple,
                StructKind::Unit => StructKindKind::Unit,
            },
            generics: lower_generics(&s.generics),
            fields: extract_struct_fields(&s.kind),
            has_stripped_fields: matches!(
                &s.kind,
                StructKind::Plain {
                    has_stripped_fields: true,
                    ..
                }
            ),
            impls: s.impls.iter().map(|i| ItemId(format_id(i))).collect(),
        }),
        ItemEnum::Enum(e) => ItemInner::Enum(EnumItem {
            generics: lower_generics(&e.generics),
            variants: e.variants.iter().map(|i| ItemId(format_id(i))).collect(),
            has_stripped_variants: e.has_stripped_variants,
            impls: e.impls.iter().map(|i| ItemId(format_id(i))).collect(),
        }),
        ItemEnum::Variant(v) => ItemInner::Variant(VariantItem {
            variant_kind: match &v.kind {
                VariantKind::Plain => VariantKindKind::Plain,
                VariantKind::Tuple(_) => VariantKindKind::Tuple,
                VariantKind::Struct { .. } => VariantKindKind::Struct,
            },
            discriminant: v.discriminant.as_ref().map(|d| d.expr.clone()),
        }),
        ItemEnum::Union(u) => ItemInner::Union(UnionItem {
            generics: lower_generics(&u.generics),
            fields: u.fields.iter().map(|i| ItemId(format_id(i))).collect(),
            has_stripped_fields: u.has_stripped_fields,
            impls: u.impls.iter().map(|i| ItemId(format_id(i))).collect(),
        }),
        ItemEnum::Trait(t) => ItemInner::Trait(TraitItem {
            is_auto: t.is_auto,
            is_unsafe: t.is_unsafe,
            is_dyn_compatible: t.is_dyn_compatible,
            generics: lower_generics(&t.generics),
            bounds: t.bounds.iter().map(crate::signature::render_bound).collect(),
            items: t.items.iter().map(|i| ItemId(format_id(i))).collect(),
            implementations: t
                .implementations
                .iter()
                .map(|i| ItemId(format_id(i)))
                .collect(),
        }),
        ItemEnum::TraitAlias(a) => ItemInner::TraitAlias(TraitAliasItem {
            generics: lower_generics(&a.generics),
            bounds: a.params.iter().map(crate::signature::render_bound).collect(),
        }),
        ItemEnum::Impl(i) => ItemInner::Impl(ImplItem {
            generics: lower_generics(&i.generics),
            trait_path: i.trait_.as_ref().map(|p| type_path_from_resolved(p, links)),
            for_type: type_path_for_type(&i.for_, links),
            items: i.items.iter().map(|x| ItemId(format_id(x))).collect(),
            is_negative: i.is_negative,
            is_synthetic: i.is_synthetic,
            is_blanket: i.blanket_impl.is_some(),
            provided_trait_methods: i.provided_trait_methods.clone(),
        }),
        ItemEnum::TypeAlias(a) => ItemInner::TypeAlias(TypeAliasItem {
            aliased_type: type_path_for_type(&a.type_, links),
            generics: lower_generics(&a.generics),
        }),
        ItemEnum::Constant { type_, const_ } => ItemInner::Constant(ConstantItem {
            type_display: render_type(type_),
            expr: const_.expr.clone(),
            value: const_.value.clone(),
            is_literal: const_.is_literal,
        }),
        ItemEnum::Static(s) => ItemInner::Static(StaticItem {
            type_display: render_type(&s.type_),
            expr: s.expr.clone(),
            is_mutable: s.is_mutable,
            is_unsafe: s.is_unsafe,
        }),
        ItemEnum::Macro(source) => ItemInner::Macro(MacroItem {
            source: source.clone(),
        }),
        ItemEnum::ProcMacro(pm) => ItemInner::ProcMacro(ProcMacroItem {
            macro_kind: match pm.kind {
                rustdoc_types::MacroKind::Bang => ProcMacroKindKind::Bang,
                rustdoc_types::MacroKind::Attr => ProcMacroKindKind::Attr,
                rustdoc_types::MacroKind::Derive => ProcMacroKindKind::Derive,
            },
            helpers: pm.helpers.clone(),
        }),
        ItemEnum::AssocType {
            generics,
            bounds,
            type_,
        } => ItemInner::AssocType(AssocTypeItem {
            generics: lower_generics(generics),
            bounds: bounds.iter().map(crate::signature::render_bound).collect(),
            default_display: type_.as_ref().map(render_type),
        }),
        ItemEnum::AssocConst { type_, value } => ItemInner::AssocConst(AssocConstItem {
            type_display: render_type(type_),
            default_display: value.clone(),
        }),
        ItemEnum::Use(u) => ItemInner::Use(UseItem {
            source: u.source.clone(),
            name: u.name.clone(),
            target_id: u.id.as_ref().map(|i| ItemId(format_id(i))),
            is_glob: u.is_glob,
        }),
        ItemEnum::StructField(t) => ItemInner::StructField(StructFieldItem {
            type_display: render_type(t),
        }),
        ItemEnum::Module(_) => ItemInner::Module,
        ItemEnum::Primitive(_) => ItemInner::Primitive,
        ItemEnum::ExternType => ItemInner::ExternType,
        ItemEnum::ExternCrate { .. } => return None,
    };
    let _ = (krate, links, diagnostics);
    Some(inner)
}

fn lower_visibility(v: &RdVisibility) -> Visibility {
    match v {
        RdVisibility::Public => Visibility::Public,
        RdVisibility::Crate => Visibility::Crate,
        RdVisibility::Restricted { path, .. } => Visibility::Restricted { path: path.clone() },
        RdVisibility::Default => Visibility::Default,
    }
}

fn lower_source(item: &RdItem) -> Option<SourceLocation> {
    item.span.as_ref().map(|s| SourceLocation {
        file: s.filename.to_string_lossy().into_owned(),
        line_start: s.begin.0 as u32,
        line_end: s.end.0 as u32,
    })
}

fn extract_doc_aliases(item: &RdItem) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for attr in &item.attrs {
        if let rustdoc_types::Attribute::Other(s) = attr {
            if let Some(rest) = s.strip_prefix("#[doc(alias = \"") {
                if let Some(end) = rest.find("\")]") {
                    out.push(rest[..end].to_string());
                }
            } else if let Some(rest) = s.strip_prefix("#[doc(alias(") {
                if let Some(end) = rest.find("))]") {
                    for raw in rest[..end].split(',') {
                        let trimmed = raw.trim().trim_matches('"');
                        if !trimmed.is_empty() {
                            out.push(trimmed.to_string());
                        }
                    }
                }
            }
        }
    }
    out
}

fn extract_stability(item: &RdItem) -> Option<Stability> {
    for attr in &item.attrs {
        if let rustdoc_types::Attribute::Other(s) = attr {
            if s.starts_with("#[stable(") {
                return Some(Stability {
                    level: StabilityLevel::Stable,
                    since: extract_attr_string(s, "since"),
                    feature: extract_attr_string(s, "feature"),
                    issue: None,
                });
            }
            if s.starts_with("#[unstable(") {
                return Some(Stability {
                    level: StabilityLevel::Unstable,
                    since: None,
                    feature: extract_attr_string(s, "feature"),
                    issue: extract_attr_string(s, "issue")
                        .and_then(|i| i.trim_matches(|c: char| !c.is_ascii_digit()).parse().ok()),
                });
            }
        }
    }
    None
}

fn extract_attr_string(s: &str, key: &str) -> Option<String> {
    let needle = format!("{} = \"", key);
    let start = s.find(&needle)? + needle.len();
    let rest = &s[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn extract_feature_gates(_item: &RdItem) -> Vec<String> {
    // Phase 1: feature gates are not directly carried on items in rustdoc JSON
    // until the renderer reconstructs them from cfg attrs. Placeholder so the
    // field exists in the schema and Phase 3 rendering can fill it in.
    Vec::new()
}

fn extract_structured_attrs(item: &RdItem) -> Vec<String> {
    item.attrs
        .iter()
        .map(|attr| match attr {
            rustdoc_types::Attribute::Other(s) => s.clone(),
            other => format!("{:?}", other),
        })
        .collect()
}

fn extract_struct_fields(kind: &StructKind) -> Vec<ItemId> {
    match kind {
        StructKind::Plain { fields, .. } => fields.iter().map(|i| ItemId(format_id(i))).collect(),
        StructKind::Tuple(ids) => ids
            .iter()
            .filter_map(|maybe| maybe.as_ref().map(|i| ItemId(format_id(i))))
            .collect(),
        StructKind::Unit => Vec::new(),
    }
}

fn type_path_from_resolved(p: &rustdoc_types::Path, links: &LinkContext<'_>) -> TypePath {
    let resolved = links.resolve_id(&p.id);
    TypePath {
        crate_id: resolved.as_ref().map(|r| r.crate_id).unwrap_or(0),
        path: resolved.map(|r| r.path).unwrap_or_else(|| vec![p.path.clone()]),
        display: p.path.clone(),
        external: false,
        html_root_url: None,
    }
}

fn type_path_for_type(ty: &rustdoc_types::Type, links: &LinkContext<'_>) -> TypePath {
    if let rustdoc_types::Type::ResolvedPath(p) = ty {
        return type_path_from_resolved(p, links);
    }
    TypePath {
        crate_id: 0,
        path: vec![render_type(ty)],
        display: render_type(ty),
        external: false,
        html_root_url: None,
    }
}

fn path_for_id(id: &Id, krate: &Crate) -> Vec<String> {
    if let Some(summary) = krate.paths.get(id) {
        return summary.path.clone();
    }
    if let Some(item) = krate.index.get(id) {
        if let Some(name) = &item.name {
            return vec![name.clone()];
        }
    }
    Vec::new()
}

#[allow(dead_code)]
fn unused_diagnostics_marker() -> Diagnostic {
    diagnostics::warning(codes::INTRA_DOC_LINK_UNRESOLVED, "marker")
}

// Keep imports referenced even though the immediate use is in helper modules.
const _: fn(&HashMap<u32, ()>) = |_| {};
