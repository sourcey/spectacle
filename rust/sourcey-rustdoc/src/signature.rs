use rustdoc_types::{
    DynTrait, FunctionSignature, GenericArg, GenericArgs, GenericBound, Generics as RdGenerics,
    Path as RdPath, PreciseCapturingArg, Type, WherePredicate,
};

use crate::links::LinkContext;
use crate::spec::{
    GenericParam, GenericParamKind, Generics, SigInput, SigToken, Signature, TypePath,
};
use rustdoc_types::Type as RdType;

pub fn lower_signature(
    sig: &FunctionSignature,
    name: &str,
    is_const: bool,
    is_async: bool,
    is_unsafe: bool,
    links: &LinkContext<'_>,
) -> Signature {
    let inputs: Vec<SigInput> = sig
        .inputs
        .iter()
        .map(|(name, ty)| SigInput {
            name: name.clone(),
            type_display: render_type(ty),
        })
        .collect();

    let output_display = sig.output.as_ref().map(render_type);

    let mut tokens: Vec<SigToken> = Vec::new();
    let kw = |text: &str| SigToken::Keyword { text: text.to_string() };
    let punct = |text: &str| SigToken::Punct { text: text.to_string() };
    if is_const {
        tokens.push(kw("const"));
        tokens.push(SigToken::Whitespace);
    }
    if is_async {
        tokens.push(kw("async"));
        tokens.push(SigToken::Whitespace);
    }
    if is_unsafe {
        tokens.push(kw("unsafe"));
        tokens.push(SigToken::Whitespace);
    }
    tokens.push(kw("fn"));
    tokens.push(SigToken::Whitespace);
    tokens.push(SigToken::Type {
        text: name.to_string(),
        target: None,
    });
    tokens.push(punct("("));
    for (idx, ((input_name, input_ty), input)) in sig.inputs.iter().zip(inputs.iter()).enumerate() {
        let _ = input_name;
        if idx > 0 {
            tokens.push(punct(","));
            tokens.push(SigToken::Whitespace);
        }
        tokens.push(SigToken::Punct { text: input.name.clone() });
        tokens.push(punct(":"));
        tokens.push(SigToken::Whitespace);
        push_type_tokens(&mut tokens, &resolve_type_path(input_ty, links));
    }
    if sig.is_c_variadic {
        if !inputs.is_empty() {
            tokens.push(punct(","));
            tokens.push(SigToken::Whitespace);
        }
        tokens.push(punct("..."));
    }
    tokens.push(punct(")"));

    if let Some(output_ty) = &sig.output {
        tokens.push(SigToken::Whitespace);
        tokens.push(punct("->"));
        tokens.push(SigToken::Whitespace);
        push_type_tokens(&mut tokens, &resolve_type_path(output_ty, links));
    }
    let _ = output_display;

    let mut display = String::new();
    for token in &tokens {
        match token {
            SigToken::Keyword { text }
            | SigToken::Punct { text }
            | SigToken::Generic { text } => display.push_str(text),
            SigToken::Lifetime { text } => {
                display.push('\'');
                display.push_str(text);
            }
            SigToken::Type { text, .. } => display.push_str(text),
            SigToken::Whitespace => display.push(' '),
            SigToken::Newline => display.push('\n'),
        }
    }

    Signature {
        display,
        tokens,
        inputs,
        output_display,
        is_c_variadic: sig.is_c_variadic,
    }
}

fn push_type_tokens(out: &mut Vec<SigToken>, resolved: &ResolvedTypeDisplay) {
    out.push(SigToken::Type {
        text: resolved.text.clone(),
        target: resolved.target.clone(),
    });
}

struct ResolvedTypeDisplay {
    text: String,
    target: Option<TypePath>,
}

fn resolve_type_path(ty: &RdType, links: &LinkContext<'_>) -> ResolvedTypeDisplay {
    let text = render_type(ty);
    let target = type_path_target(ty, links);
    ResolvedTypeDisplay { text, target }
}

fn type_path_target(ty: &RdType, links: &LinkContext<'_>) -> Option<TypePath> {
    match ty {
        RdType::ResolvedPath(p) => {
            let resolved = links.resolve_id(&p.id);
            let display = p.path.clone();
            match resolved {
                Some(r) => Some(TypePath {
                    crate_id: r.crate_id,
                    path: r.path,
                    display,
                    external: r.external,
                    html_root_url: r.html_root_url,
                }),
                None => Some(TypePath {
                    crate_id: 0,
                    path: vec![p.path.clone()],
                    display,
                    external: false,
                    html_root_url: None,
                }),
            }
        }
        RdType::BorrowedRef { type_, .. } | RdType::RawPointer { type_, .. } => {
            type_path_target(type_, links)
        }
        _ => None,
    }
}

pub fn lower_generics(generics: &RdGenerics) -> Generics {
    let params = generics
        .params
        .iter()
        .map(|p| GenericParam {
            name: p.name.clone(),
            kind: match p.kind {
                rustdoc_types::GenericParamDefKind::Lifetime { .. } => GenericParamKind::Lifetime,
                rustdoc_types::GenericParamDefKind::Type { .. } => GenericParamKind::Type,
                rustdoc_types::GenericParamDefKind::Const { .. } => GenericParamKind::Const,
            },
            default_display: generic_param_default(&p.kind),
            bounds: generic_param_bounds(&p.kind),
        })
        .collect();
    let where_predicates = generics
        .where_predicates
        .iter()
        .map(render_where_predicate)
        .collect();
    Generics {
        params,
        where_predicates,
    }
}

fn generic_param_default(kind: &rustdoc_types::GenericParamDefKind) -> Option<String> {
    match kind {
        rustdoc_types::GenericParamDefKind::Type { default, .. } => default.as_ref().map(render_type),
        rustdoc_types::GenericParamDefKind::Const { default, .. } => default.clone(),
        rustdoc_types::GenericParamDefKind::Lifetime { .. } => None,
    }
}

fn generic_param_bounds(kind: &rustdoc_types::GenericParamDefKind) -> Vec<String> {
    match kind {
        rustdoc_types::GenericParamDefKind::Type { bounds, .. } => {
            bounds.iter().map(render_bound).collect()
        }
        rustdoc_types::GenericParamDefKind::Lifetime { outlives, .. } => outlives.clone(),
        rustdoc_types::GenericParamDefKind::Const { .. } => Vec::new(),
    }
}

fn render_where_predicate(pred: &WherePredicate) -> String {
    match pred {
        WherePredicate::BoundPredicate {
            type_, bounds, generic_params, ..
        } => {
            let mut s = String::new();
            if !generic_params.is_empty() {
                s.push_str("for<");
                let parts: Vec<String> = generic_params.iter().map(|p| p.name.clone()).collect();
                s.push_str(&parts.join(", "));
                s.push_str("> ");
            }
            s.push_str(&render_type(type_));
            if !bounds.is_empty() {
                s.push_str(": ");
                let parts: Vec<String> = bounds.iter().map(render_bound).collect();
                s.push_str(&parts.join(" + "));
            }
            s
        }
        WherePredicate::LifetimePredicate { lifetime, outlives } => {
            let mut s = lifetime.clone();
            if !outlives.is_empty() {
                s.push_str(": ");
                s.push_str(&outlives.join(" + "));
            }
            s
        }
        WherePredicate::EqPredicate { lhs, rhs } => {
            format!("{} = {}", render_type(lhs), render_term(rhs))
        }
    }
}

pub fn render_bound(bound: &GenericBound) -> String {
    match bound {
        GenericBound::TraitBound {
            trait_,
            generic_params,
            modifier,
        } => {
            let mut s = String::new();
            if !generic_params.is_empty() {
                s.push_str("for<");
                let parts: Vec<String> = generic_params.iter().map(|p| p.name.clone()).collect();
                s.push_str(&parts.join(", "));
                s.push_str("> ");
            }
            match modifier {
                rustdoc_types::TraitBoundModifier::None => {}
                rustdoc_types::TraitBoundModifier::Maybe => s.push('?'),
                rustdoc_types::TraitBoundModifier::MaybeConst => s.push_str("~const "),
            }
            s.push_str(&render_path(trait_));
            s
        }
        GenericBound::Outlives(lifetime) => lifetime.clone(),
        GenericBound::Use(captures) => {
            let parts: Vec<String> = captures
                .iter()
                .map(|c| match c {
                    PreciseCapturingArg::Lifetime(s) | PreciseCapturingArg::Param(s) => s.clone(),
                })
                .collect();
            format!("use<{}>", parts.join(", "))
        }
    }
}

fn render_term(term: &rustdoc_types::Term) -> String {
    match term {
        rustdoc_types::Term::Type(t) => render_type(t),
        rustdoc_types::Term::Constant(c) => c.expr.clone(),
    }
}

pub fn render_type(ty: &Type) -> String {
    match ty {
        Type::ResolvedPath(p) => render_path(p),
        Type::DynTrait(d) => render_dyn(d),
        Type::Generic(s) => s.clone(),
        Type::Primitive(s) => s.clone(),
        Type::FunctionPointer(f) => format!(
            "fn({}){}",
            f.sig
                .inputs
                .iter()
                .map(|(_, t)| render_type(t))
                .collect::<Vec<_>>()
                .join(", "),
            f.sig
                .output
                .as_ref()
                .map(|t| format!(" -> {}", render_type(t)))
                .unwrap_or_default()
        ),
        Type::Tuple(parts) => {
            let inner: Vec<String> = parts.iter().map(render_type).collect();
            format!("({})", inner.join(", "))
        }
        Type::Slice(inner) => format!("[{}]", render_type(inner)),
        Type::Array { type_, len } => format!("[{}; {}]", render_type(type_), len),
        Type::Pat { type_, .. } => render_type(type_),
        Type::ImplTrait(bounds) => {
            let parts: Vec<String> = bounds.iter().map(render_bound).collect();
            format!("impl {}", parts.join(" + "))
        }
        Type::Infer => "_".to_string(),
        Type::RawPointer { is_mutable, type_ } => {
            let m = if *is_mutable { "*mut " } else { "*const " };
            format!("{}{}", m, render_type(type_))
        }
        Type::BorrowedRef {
            lifetime,
            is_mutable,
            type_,
        } => {
            let lt = lifetime
                .as_ref()
                .map(|l| format!("{} ", l))
                .unwrap_or_default();
            let m = if *is_mutable { "mut " } else { "" };
            format!("&{}{}{}", lt, m, render_type(type_))
        }
        Type::QualifiedPath {
            name,
            args,
            self_type,
            trait_,
            ..
        } => {
            let self_render = render_type(self_type);
            let trait_render = trait_
                .as_ref()
                .map(|p| format!(" as {}", render_path(p)))
                .unwrap_or_default();
            let args_render = match args.as_ref() {
                Some(a) => render_generic_args(a),
                None => String::new(),
            };
            format!("<{}{}>::{}{}", self_render, trait_render, name, args_render)
        }
    }
}

fn render_path(path: &RdPath) -> String {
    let mut s = path.path.clone();
    if let Some(args) = &path.args {
        s.push_str(&render_generic_args(args));
    }
    s
}

fn render_generic_args(args: &GenericArgs) -> String {
    match args {
        GenericArgs::AngleBracketed { args, constraints } => {
            let mut parts: Vec<String> = args
                .iter()
                .map(|a| match a {
                    GenericArg::Lifetime(s) => s.clone(),
                    GenericArg::Type(t) => render_type(t),
                    GenericArg::Const(c) => c.expr.clone(),
                    GenericArg::Infer => "_".to_string(),
                })
                .collect();
            for c in constraints {
                let term = match &c.binding {
                    rustdoc_types::AssocItemConstraintKind::Equality(t) => render_term(t),
                    rustdoc_types::AssocItemConstraintKind::Constraint(bounds) => {
                        let bs: Vec<String> = bounds.iter().map(render_bound).collect();
                        bs.join(" + ")
                    }
                };
                let sep = matches!(
                    c.binding,
                    rustdoc_types::AssocItemConstraintKind::Equality(_)
                )
                .then(|| "=".to_string())
                .unwrap_or_else(|| ":".to_string());
                parts.push(format!("{}{}{}", c.name, sep, term));
            }
            if parts.is_empty() {
                String::new()
            } else {
                format!("<{}>", parts.join(", "))
            }
        }
        GenericArgs::Parenthesized { inputs, output } => {
            let in_render: Vec<String> = inputs.iter().map(render_type).collect();
            let out_render = output
                .as_ref()
                .map(|t| format!(" -> {}", render_type(t)))
                .unwrap_or_default();
            format!("({}){}", in_render.join(", "), out_render)
        }
        GenericArgs::ReturnTypeNotation => "(..)".to_string(),
    }
}

fn render_dyn(d: &DynTrait) -> String {
    let parts: Vec<String> = d
        .traits
        .iter()
        .map(|t| {
            let mut s = render_path(&t.trait_);
            if !t.generic_params.is_empty() {
                let lts: Vec<String> = t.generic_params.iter().map(|p| p.name.clone()).collect();
                s.push_str(&format!(" + for<{}>", lts.join(", ")));
            }
            s
        })
        .collect();
    let lt = d
        .lifetime
        .as_ref()
        .map(|l| format!(" + {}", l))
        .unwrap_or_default();
    format!("dyn {}{}", parts.join(" + "), lt)
}
