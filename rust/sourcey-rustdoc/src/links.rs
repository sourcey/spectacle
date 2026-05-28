use rustdoc_types::{Crate, Id, ItemKind};
use std::collections::HashMap;

use crate::spec::{ExternalCrateRef, ItemId};

/// Build a lookup table for intra-doc link resolution.
/// Given an Item.links entry (label -> Id), we want the full path so the
/// renderer can produce a sourcey URL or fall back to an external one.
pub struct LinkContext<'a> {
    pub krate: &'a Crate,
    pub external_crate_index: HashMap<u32, ExternalCrateRef>,
}

impl<'a> LinkContext<'a> {
    pub fn new(krate: &'a Crate) -> Self {
        let external_crate_index = krate
            .external_crates
            .iter()
            .map(|(crate_id, ec)| {
                (
                    *crate_id,
                    ExternalCrateRef {
                        crate_id: *crate_id,
                        name: ec.name.clone(),
                        html_root_url: ec.html_root_url.clone(),
                    },
                )
            })
            .collect();
        Self {
            krate,
            external_crate_index,
        }
    }

    pub fn external_crates(&self) -> Vec<ExternalCrateRef> {
        let mut out: Vec<_> = self.external_crate_index.values().cloned().collect();
        out.sort_by(|a, b| a.crate_id.cmp(&b.crate_id));
        out
    }

    pub fn resolve_id(&self, id: &Id) -> Option<ResolvedLink> {
        if let Some(summary) = self.krate.paths.get(id) {
            let crate_id = summary.crate_id;
            let path = summary.path.clone();
            let kind = summary.kind.clone();
            let external = crate_id != 0;
            let html_root_url = if external {
                self.external_crate_index
                    .get(&crate_id)
                    .and_then(|ec| ec.html_root_url.clone())
            } else {
                None
            };
            return Some(ResolvedLink {
                id: ItemId(format_id(id)),
                crate_id,
                path,
                kind,
                external,
                html_root_url,
            });
        }
        if let Some(item) = self.krate.index.get(id) {
            // Sub-items (struct fields, variants, methods) frequently lack a
            // paths entry. Best effort: surface what we know.
            return Some(ResolvedLink {
                id: ItemId(format_id(id)),
                crate_id: item.crate_id,
                path: item.name.clone().map(|n| vec![n]).unwrap_or_default(),
                kind: classify_inner_kind(item),
                external: item.crate_id != 0,
                html_root_url: self
                    .external_crate_index
                    .get(&item.crate_id)
                    .and_then(|ec| ec.html_root_url.clone()),
            });
        }
        None
    }
}

#[derive(Debug, Clone)]
pub struct ResolvedLink {
    pub id: ItemId,
    pub crate_id: u32,
    pub path: Vec<String>,
    pub kind: ItemKind,
    pub external: bool,
    pub html_root_url: Option<String>,
}

pub fn format_id(id: &Id) -> String {
    format!("{}", id.0)
}

fn classify_inner_kind(item: &rustdoc_types::Item) -> ItemKind {
    use rustdoc_types::ItemEnum;
    match &item.inner {
        ItemEnum::Module(_) => ItemKind::Module,
        ItemEnum::Struct(_) => ItemKind::Struct,
        ItemEnum::StructField(_) => ItemKind::StructField,
        ItemEnum::Union(_) => ItemKind::Union,
        ItemEnum::Enum(_) => ItemKind::Enum,
        ItemEnum::Variant(_) => ItemKind::Variant,
        ItemEnum::Function(_) => ItemKind::Function,
        ItemEnum::Trait(_) => ItemKind::Trait,
        ItemEnum::TraitAlias(_) => ItemKind::TraitAlias,
        ItemEnum::Impl(_) => ItemKind::Impl,
        ItemEnum::TypeAlias(_) => ItemKind::TypeAlias,
        ItemEnum::Constant { .. } => ItemKind::Constant,
        ItemEnum::Static(_) => ItemKind::Static,
        ItemEnum::Macro(_) => ItemKind::Macro,
        ItemEnum::ProcMacro(pm) => match pm.kind {
            rustdoc_types::MacroKind::Bang => ItemKind::Macro,
            rustdoc_types::MacroKind::Attr => ItemKind::ProcAttribute,
            rustdoc_types::MacroKind::Derive => ItemKind::ProcDerive,
        },
        ItemEnum::AssocConst { .. } => ItemKind::AssocConst,
        ItemEnum::AssocType { .. } => ItemKind::AssocType,
        ItemEnum::ExternCrate { .. } => ItemKind::ExternCrate,
        ItemEnum::Use(_) => ItemKind::Use,
        ItemEnum::Primitive(_) => ItemKind::Primitive,
        ItemEnum::ExternType => ItemKind::ExternType,
    }
}
