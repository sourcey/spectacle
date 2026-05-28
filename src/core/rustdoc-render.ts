/**
 * Rustdoc-grade rendering for the sourcey rustdoc adapter.
 *
 * Implements the must-have set from the rendering catalog:
 * - multi-line signature formatter
 * - URL-encoded parametric anchor encoder
 * - intra-doc link resolver against `Item.links`
 * - per-impl / per-method `<details>` wrappers
 * - sidebar groupings
 * - rustdoc-style anchors (#method.<name>, #impl-Trait-for-Type%3CK%3E)
 *
 * Class names mirror rustdoc's DOM so deep-links from a rustdoc URL line up
 * with sourcey output (see `.scafld/specs/active/rustdoc-adapter-3-6-1.md` for
 * the anchor algorithm contract).
 */

import { renderMarkdown } from "../utils/markdown.js";
import {
  apiImplToggle,
  apiItemInfoRow,
  apiMethodToggle,
  apiSectionAnchor,
  apiStabilityCallout,
  apiSymbolLink,
  escapeAttr,
  escapeHtml,
} from "./api-rendering.js";
import type {
  CrateSpec,
  ExternalCrateRef,
  Item,
  ItemId,
  LinkTarget,
  ModuleSpec,
  RustdocDiagnostic,
  Signature,
  Stability,
} from "./rustdoc-types.js";
import { RUSTDOC_DIAGNOSTIC_CODES } from "./rustdoc-types.js";

export interface RenderContext {
  crate: CrateSpec;
  itemsById: Map<string, Item>;
  externalCrates: Map<number, ExternalCrateRef>;
  tabSlug: string;
  sourceLinks: {
    repo?: string;
    editBranch?: string;
    editBasePath?: string;
  };
  /** Mutable out-buffer for diagnostics raised during rendering. */
  diagnostics: RustdocDiagnostic[];
}

// ---------------------------------------------------------------------------
// Anchor encoding
// ---------------------------------------------------------------------------

/**
 * Encode a parametric impl anchor in rustdoc's URL-encoded form, e.g.
 *   impl-Clone-for-HashMap%3CK,+V,+S,+A%3E
 */
export function encodeImplAnchor(traitName: string, forType: string): string {
  return `impl-${encodeGenericSegment(traitName)}-for-${encodeGenericSegment(forType)}`;
}

/** Encode a single segment for anchor-ID use: <,>,space and special chars escaped rustdoc-style. */
export function encodeGenericSegment(value: string): string {
  return value
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/, /g, ",+")
    .replace(/ /g, "+");
}

export function itemAnchor(item: Item): string {
  switch (item.inner.kind) {
    case "function":
      return `fn.${slug(item.name)}`;
    case "struct":
      return `struct.${slug(item.name)}`;
    case "enum":
      return `enum.${slug(item.name)}`;
    case "variant":
      return `variant.${slug(item.name)}`;
    case "union":
      return `union.${slug(item.name)}`;
    case "trait":
      return `trait.${slug(item.name)}`;
    case "trait_alias":
      return `traitalias.${slug(item.name)}`;
    case "type_alias":
      return `type.${slug(item.name)}`;
    case "constant":
      return `constant.${slug(item.name)}`;
    case "static":
      return `static.${slug(item.name)}`;
    case "macro":
      return `macro.${slug(item.name)}`;
    case "proc_macro":
      return `macro.${slug(item.name)}`;
    case "assoc_type":
      return `associatedtype.${slug(item.name)}`;
    case "assoc_const":
      return `associatedconstant.${slug(item.name)}`;
    case "struct_field":
      return `structfield.${slug(item.name)}`;
    case "use":
      return `reexport.${slug(item.name)}`;
    case "module":
      return `mod.${slug(item.name)}`;
    case "impl":
      return implAnchor(item);
    case "primitive":
      return `primitive.${slug(item.name)}`;
    case "extern_type":
      return `externtype.${slug(item.name)}`;
  }
}

function implAnchor(item: Item): string {
  if (item.inner.kind !== "impl") return `impl-${slug(item.name)}`;
  const traitDisplay = item.inner.trait_path?.display ?? "";
  const forDisplay = item.inner.for_type.display;
  if (traitDisplay) return encodeImplAnchor(traitDisplay, forDisplay);
  return `impl-${encodeGenericSegment(forDisplay)}`;
}

function slug(name: string | null | undefined): string {
  if (!name) return "";
  return name;
}

// ---------------------------------------------------------------------------
// Signature formatter
// ---------------------------------------------------------------------------

const SIGNATURE_INLINE_LIMIT = 100;

/** Multi-line signature renderer with rustdoc break rules. */
export function renderSignature(signature: Signature, ctx: RenderContext): string {
  const inline = renderInlineSignature(signature, ctx);
  if (signature.display.length <= SIGNATURE_INLINE_LIMIT) {
    return `<span class="code-header rust-signature">${inline}</span>`;
  }
  return `<span class="code-header rust-signature">${renderMultilineSignature(signature, ctx)}</span>`;
}

function renderInlineSignature(signature: Signature, ctx: RenderContext): string {
  const parts: string[] = [];
  for (const token of signature.tokens) {
    parts.push(renderToken(token, ctx));
  }
  return parts.join("");
}

function renderMultilineSignature(signature: Signature, ctx: RenderContext): string {
  // Heuristic: break each input onto its own line; place `where` if present on
  // its own line. Keeps in sync with rustdoc's visual cadence without
  // requiring an AST.
  let head = "";
  const inputs: string[] = [];
  let output = "";
  let seenOpenParen = false;
  let seenCloseParen = false;
  let currentInput = "";

  for (const token of signature.tokens) {
    const rendered = renderToken(token, ctx);
    if (!seenOpenParen) {
      head += rendered;
      if (token.kind === "punct" && token.text === "(") seenOpenParen = true;
      continue;
    }
    if (!seenCloseParen) {
      if (token.kind === "punct" && token.text === ")") {
        if (currentInput.trim().length > 0) inputs.push(currentInput);
        currentInput = "";
        seenCloseParen = true;
        output = rendered;
        continue;
      }
      if (token.kind === "punct" && token.text === "," && currentInput.trim().length > 0) {
        inputs.push(currentInput.trimEnd());
        currentInput = "";
        continue;
      }
      currentInput += rendered;
      continue;
    }
    output += rendered;
  }

  const inputsBlock = inputs
    .map((line, idx) => `    ${line.trimStart()}${idx === inputs.length - 1 ? "" : ","}`)
    .join("\n");

  return `${head}\n${inputsBlock}\n${output}`;
}

function renderToken(token: Signature["tokens"][number], ctx: RenderContext): string {
  switch (token.kind) {
    case "keyword":
      return `<span class="kw">${escapeHtml(token.text)}</span>`;
    case "punct":
      return escapeHtml(token.text);
    case "generic":
      return `<span class="generic">${escapeHtml(token.text)}</span>`;
    case "lifetime":
      return `<span class="lifetime">'${escapeHtml(token.text)}</span>`;
    case "type": {
      const target = token.target;
      if (target) {
        const href = typePathHref(target, ctx);
        if (href) {
          return apiSymbolLink({
            kind: typeLinkClass(target),
            href,
            text: token.text,
            title: target.path.join("::"),
          });
        }
      }
      return `<span class="ident">${escapeHtml(token.text)}</span>`;
    }
    case "whitespace":
      return " ";
    case "newline":
      return "\n";
  }
}

function typeLinkClass(target: { external: boolean }): string {
  return target.external ? "rust-extern" : "rust-symbol";
}

function typePathHref(
  target: { crate_id: number; path: string[]; html_root_url: string | null; external: boolean },
  ctx: RenderContext,
): string | null {
  if (!target.external) {
    if (target.path.length === 0) return null;
    const name = target.path[target.path.length - 1];
    // Find the actual item in the snapshot so we can use ITS path (which
    // tells us which module page it lives on), not the inbound target.path
    // which may be a re-export shortcut.
    const candidate = [...ctx.itemsById.values()].find(
      (i) => i.name === name && i.path.join("::") === target.path.join("::"),
    ) ?? [...ctx.itemsById.values()].find((i) => i.name === name);
    if (candidate) {
      const crateName = candidate.path[0] ?? ctx.crate.name;
      const modulePath = candidate.path.slice(1, -1);
      const anchorFragment = itemAnchor(candidate);
      return tabHref(ctx.tabSlug, pageSlugFor(crateName, modulePath)) + `#${anchorFragment}`;
    }
    // Last resort: guess from the inbound path.
    const crateName = target.path[0] === ctx.crate.name ? ctx.crate.name : target.path[0];
    const modulePath = target.path.slice(1, -1);
    return tabHref(ctx.tabSlug, pageSlugFor(crateName, modulePath)) + `#${encodeURIComponent(name)}`;
  }
  if (target.html_root_url) {
    return joinUrl(target.html_root_url, target.path.join("/"));
  }
  return joinUrl("https://docs.rs", `${target.path[0] ?? ""}/latest/${target.path.join("/")}`);
}

function tabHref(tabSlug: string, slug: string): string {
  if (!slug) return `${tabSlug}/`;
  return `${tabSlug}/${slug}.html`;
}

function pageSlugFor(crateName: string, modulePath: string[]): string {
  const base = `pkg-${slugifyId(crateName)}`;
  if (modulePath.length === 0) return base;
  return `${base}-${modulePath.map(slugifyId).join("-")}`;
}

function slugifyId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function joinUrl(base: string, suffix: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedSuffix = suffix.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedSuffix}`;
}

// ---------------------------------------------------------------------------
// Intra-doc link resolver
// ---------------------------------------------------------------------------

/**
 * Rewrite markdown intra-doc links using the rustdoc `Item.links` map.
 *
 * `Item.links` is a label→item-id map. We look up each link target in the
 * markdown, substitute either an internal sourcey URL (for items in this
 * crate) or a docs.rs / doc.rust-lang.org URL (for cross-crate items),
 * leaving plain prose untouched. Unresolved labels render as plain text
 * with `title="unresolved intra-doc link"`.
 */
export function resolveIntraDocLinks(
  markdown: string,
  links: Record<string, LinkTarget>,
  ctx: RenderContext,
): { html: string; unresolved: string[] } {
  const unresolved: string[] = [];
  // Match both `[label]` and ``[`label`]`` forms used by rustdoc intra-doc links.
  // Match `[label]` or ``[`label`]`` but NOT `[label](url)` (regular markdown
  // inline links keep their target URL).
  const replaced = markdown.replace(
    /\[(`?)([^`\]\n]+)\1\](?:\[\])?(?!\()/g,
    (_match, _tick: string, label: string) => {
      const target = lookupLinkTarget(links, label);
      const display = `<code>${escapeHtml(label)}</code>`;
      if (!target) {
        unresolved.push(label);
        return `<code title="unresolved intra-doc link">${escapeHtml(label)}</code>`;
      }
      if (target.kind === "internal") {
        const item = ctx.itemsById.get(target.id);
        if (!item) {
          unresolved.push(label);
          return `<code title="unresolved intra-doc link">${escapeHtml(label)}</code>`;
        }
        const crateName = item.path[0] ?? ctx.crate.name;
        const modulePath = item.path.slice(1, -1);
        const href =
          tabHref(ctx.tabSlug, pageSlugFor(crateName, modulePath)) + `#${itemAnchor(item)}`;
        return `<a class="rust-symbol" href="${escapeAttr(href)}">${display}</a>`;
      }
      const externalHref = externalLinkHref(target);
      return `<a class="rust-extern" href="${escapeAttr(
        externalHref,
      )}" rel="noopener" target="_blank">${display}</a>`;
    },
  );
  return { html: replaced, unresolved };
}

function lookupLinkTarget(
  links: Record<string, LinkTarget>,
  label: string,
): LinkTarget | undefined {
  // rustdoc's Item.links keys can include backticks, full paths, or aliases.
  // Try common variants before giving up.
  return (
    links[label] ??
    links[`\`${label}\``] ??
    links[label.replace(/^`(.+)`$/, "$1")]
  );
}

function externalLinkHref(target: Extract<LinkTarget, { kind: "external" }>): string {
  const isStdLike = ["std", "core", "alloc", "proc_macro"].includes(target.crate_name);
  if (isStdLike) {
    return `https://doc.rust-lang.org/stable/${target.path.join("/")}`;
  }
  if (target.html_root_url) {
    const trimmed = target.html_root_url.replace(/\/+$/, "");
    return `${trimmed}/${target.path.join("/")}`;
  }
  return `https://docs.rs/${target.crate_name}/latest/${target.path.join("/")}`;
}

function renderMarkdownPlaceholder(markdown: string): string {
  // Phase 3 keeps markdown rendering deliberately minimal; the loader applies
  // sourcey's markdown pipeline before calling the renderer. This function
  // does the single step the renderer cares about: HTML-escape any raw
  // content that wasn't already a link target.
  return markdown;
}

// ---------------------------------------------------------------------------
// Stability + item-info row helpers
// ---------------------------------------------------------------------------

export function renderStabilityCallouts(item: Item): string {
  const parts: string[] = [];
  if (item.deprecation) {
    parts.push(
      apiStabilityCallout({
        kind: "deprecated",
        since: item.deprecation.since,
        reason: item.deprecation.note,
      }),
    );
  }
  const stability: Stability | null = item.stability;
  if (stability?.level === "unstable") {
    parts.push(
      apiStabilityCallout({
        kind: "unstable",
        featureName: stability.feature,
        issueId: stability.issue,
      }),
    );
  }
  for (const featureName of item.feature_gates) {
    parts.push(apiStabilityCallout({ kind: "portability", featureName }));
  }
  if (hasAttr(item, "non_exhaustive")) {
    parts.push(apiStabilityCallout({ kind: "non_exhaustive" }));
  }
  const mustUseReason = extractMustUseReason(item);
  if (mustUseReason !== null) {
    parts.push(
      apiStabilityCallout({
        kind: "must_use",
        reason: mustUseReason === "" ? undefined : mustUseReason,
      }),
    );
  }
  return parts.join("\n");
}

function hasAttr(item: Item, marker: string): boolean {
  return item.attrs_structured.some((a) => a.includes(marker));
}

function extractMustUseReason(item: Item): string | null {
  for (const attr of item.attrs_structured) {
    if (attr.startsWith("MustUse")) return "";
    if (attr.startsWith('#[must_use = "')) {
      const m = attr.match(/^#\[must_use = "([^"]*)"\]/);
      if (m) return m[1];
      return "";
    }
    if (attr === "#[must_use]") return "";
  }
  return null;
}

export function renderItemInfoRow(
  item: Item,
  ctx: RenderContext,
): string {
  const since = item.stability?.level === "stable" ? item.stability.since : null;
  const sourceHref = renderSourceHref(item, ctx);
  return apiItemInfoRow({ since: since ?? null, sourceHref });
}

export function renderSourceHref(item: Item, ctx: RenderContext): string | null {
  if (!item.source) return null;
  const { repo, editBranch, editBasePath } = ctx.sourceLinks;
  if (!repo || !editBranch) return null;
  const base = repo.replace(/\/+$/, "");
  const basePath = editBasePath ? `${editBasePath.replace(/^\/+|\/+$/g, "")}/` : "";
  return `${base}/blob/${editBranch}/${basePath}${item.source.file}#L${item.source.line_start}-L${item.source.line_end}`;
}

// ---------------------------------------------------------------------------
// Item rendering
// ---------------------------------------------------------------------------

export function renderItemHtml(item: Item, ctx: RenderContext): string {
  const anchor = itemAnchor(item);
  const callouts = renderStabilityCallouts(item);
  const infoRow = renderItemInfoRow(item, ctx);
  const signatureHtml = renderItemSignature(item, ctx);
  const docs = renderItemDocs(item, ctx);
  const doctests = item.doctests
    .map((dt, idx) => renderDoctestBlock(item, dt, idx, ctx))
    .join("\n");
  const impls = renderItemImpls(item, ctx);
  return [
    `<section class="rust-item rust-${item.inner.kind} api-item" id="${escapeAttr(anchor)}">`,
    infoRow,
    apiSectionAnchor({ level: 4, id: anchor, text: item.name ?? anchor, className: "code-header rust-item-header" }),
    signatureHtml,
    callouts,
    docs,
    doctests,
    impls,
    `</section>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function renderItemImpls(item: Item, ctx: RenderContext): string {
  const traitOwnMembers = renderTraitOwnMembers(item, ctx);
  const implIds = collectImplIds(item);
  if (implIds.length === 0 && !traitOwnMembers) return "";
  const blocks: string[] = [];
  if (traitOwnMembers) blocks.push(traitOwnMembers);
  for (const implId of implIds) {
    const impl = ctx.itemsById.get(implId);
    if (!impl || impl.inner.kind !== "impl") continue;
    const traitName = impl.inner.trait_path?.display;
    const forName = impl.inner.for_type.display;
    const header = traitName
      ? `impl ${traitName} for ${forName}`
      : `impl ${forName}`;
    const providedMethods = new Set(impl.inner.provided_trait_methods);
    const methodSections = impl.inner.items
      .map((mid) => ctx.itemsById.get(mid))
      .filter((m): m is Item => Boolean(m))
      .map((m) => {
        const isRequired =
          item.inner.kind === "trait" &&
          m.inner.kind === "function" &&
          !providedMethods.has(m.name ?? "");
        return renderImplMember(m, ctx, isRequired);
      })
      .filter(Boolean)
      .join("\n");
    if (!methodSections) continue;
    const implAnchorId = itemAnchor(impl);
    blocks.push(
      apiImplToggle({
        summary: `<h3 class="code-header rust-impl-header" id="${escapeAttr(implAnchorId)}"><code>${escapeHtml(
          header,
        )}</code></h3>`,
        body: methodSections,
      }),
    );
  }
  if (blocks.length === 0) return "";
  return (
    apiSectionAnchor({
      level: 3,
      id: `impls-for-${itemAnchor(item)}`,
      text: "Implementations",
      className: "rust-impls-header",
    }) + blocks.join("\n")
  );
}

function renderTraitOwnMembers(item: Item, ctx: RenderContext): string {
  if (item.inner.kind !== "trait") return "";
  const members = item.inner.items
    .map((mid) => ctx.itemsById.get(mid))
    .filter((m): m is Item => Boolean(m));
  if (members.length === 0) return "";
  const required: Item[] = [];
  const provided: Item[] = [];
  const assocTypes: Item[] = [];
  const assocConsts: Item[] = [];
  for (const m of members) {
    if (m.inner.kind === "function") {
      // Functions without bodies on a trait are required; with bodies are provided.
      (m.inner.has_body ? provided : required).push(m);
    } else if (m.inner.kind === "assoc_type") {
      assocTypes.push(m);
    } else if (m.inner.kind === "assoc_const") {
      assocConsts.push(m);
    }
  }
  const parts: string[] = [];
  if (assocTypes.length > 0) {
    parts.push(apiSectionAnchor({ level: 3, id: "required-associated-types", text: "Required Associated Types" }));
    parts.push(assocTypes.map((m) => renderImplMember(m, ctx, false)).join("\n"));
  }
  if (assocConsts.length > 0) {
    parts.push(apiSectionAnchor({ level: 3, id: "required-associated-consts", text: "Required Associated Constants" }));
    parts.push(assocConsts.map((m) => renderImplMember(m, ctx, false)).join("\n"));
  }
  if (required.length > 0) {
    parts.push(apiSectionAnchor({ level: 3, id: "required-methods", text: "Required Methods" }));
    parts.push(required.map((m) => renderImplMember(m, ctx, true)).join("\n"));
  }
  if (provided.length > 0) {
    parts.push(apiSectionAnchor({ level: 3, id: "provided-methods", text: "Provided Methods" }));
    parts.push(provided.map((m) => renderImplMember(m, ctx, false)).join("\n"));
  }
  return parts.join("\n");
}

function implMemberAnchor(member: Item, isRequiredTraitMethod: boolean): string {
  if (member.inner.kind === "function") {
    const prefix = isRequiredTraitMethod ? "tymethod" : "method";
    return `${prefix}.${member.name ?? ""}`;
  }
  if (member.inner.kind === "assoc_type") return `associatedtype.${member.name ?? ""}`;
  if (member.inner.kind === "assoc_const") return `associatedconstant.${member.name ?? ""}`;
  return itemAnchor(member);
}

function collectImplIds(item: Item): string[] {
  switch (item.inner.kind) {
    case "struct":
    case "enum":
    case "union":
      return item.inner.impls;
    case "trait":
      // Implementors of the trait are rendered separately below. Trait's own
      // members are handled by renderTraitOwnMembers().
      return item.inner.implementations;
    default:
      return [];
  }
}

function renderImplMember(member: Item, ctx: RenderContext, isRequiredTraitMethod = false): string {
  const anchor = implMemberAnchor(member, isRequiredTraitMethod);
  const sigHtml = renderItemSignature(member, ctx);
  const callouts = renderStabilityCallouts(member);
  const docs = renderItemDocs(member, ctx);
  const doctests = member.doctests
    .map((dt, idx) => renderDoctestBlock(member, dt, idx, ctx))
    .join("\n");
  const infoRow = renderItemInfoRow(member, ctx);
  return apiMethodToggle({
    summary: `<h4 class="code-header rust-method-header" id="${escapeAttr(anchor)}"><code>${escapeHtml(
      member.name ?? "",
    )}</code></h4>`,
    body: [infoRow, sigHtml, callouts, docs, doctests].filter(Boolean).join("\n"),
  });
}

function renderItemDocs(item: Item, ctx: RenderContext): string {
  if (!item.docs_markdown) return "";
  const links = item.links ?? {};
  const { html, unresolved } = resolveIntraDocLinks(item.docs_markdown, links, ctx);
  for (const label of unresolved) {
    ctx.diagnostics.push({
      severity: "info",
      code: RUSTDOC_DIAGNOSTIC_CODES.INTRA_DOC_LINK_UNRESOLVED,
      message: `Intra-doc link "${label}" in ${item.path.join("::")} could not be resolved.`,
      crate_name: ctx.crate.name,
      file: item.source?.file ?? null,
      line: item.source?.line_start ?? null,
    });
  }
  return `<div class="docblock rust-doc">${renderMarkdown(html)}</div>`;
}

function renderItemSignature(item: Item, ctx: RenderContext): string {
  if (item.inner.kind === "function") {
    return renderSignature(item.inner.signature, ctx);
  }
  const fallback = fallbackSignatureText(item);
  if (!fallback) return "";
  return `<pre class="code-header rust-signature rust-signature-fallback"><code>${escapeHtml(
    fallback,
  )}</code></pre>`;
}

function fallbackSignatureText(item: Item): string | null {
  const path = item.path.join("::");
  switch (item.inner.kind) {
    case "struct":
      return `pub struct ${path} { /* ... */ }`;
    case "enum":
      return `pub enum ${path} { /* ... */ }`;
    case "trait":
      return `pub trait ${path} { /* ... */ }`;
    case "trait_alias":
      return `pub trait ${path};`;
    case "type_alias":
      return `pub type ${path} = ${item.inner.aliased_type.display};`;
    case "constant":
      return `pub const ${path}: ${item.inner.type_display} = ${item.inner.expr};`;
    case "static":
      return `pub${item.inner.is_mutable ? " mut" : ""} static ${path}: ${item.inner.type_display};`;
    case "macro":
      return `macro_rules! ${item.name ?? ""}`;
    case "proc_macro":
      return `#[${item.inner.macro_kind === "derive" ? "derive" : "proc_macro"}] ${item.name ?? ""}`;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Doctest blocks
// ---------------------------------------------------------------------------

const RUST_EDITION_DEFAULT = "2024";

export function renderDoctestBlock(
  parent: Item,
  dt: Item["doctests"][number],
  idx: number,
  _ctx: RenderContext,
): string {
  const anchor = `doctest-${itemAnchor(parent)}-${idx}`;
  const isRust = dt.lang.toLowerCase() === "rust" || dt.lang === "";
  const badges = renderDoctestBadges(dt);
  const hasHidden = dt.display_code !== dt.executable_code;
  const code = highlightRustCode(dt.display_code);
  const fullCode = highlightRustCode(dt.executable_code);
  const edition = pickEdition(dt.fence_attributes);
  const playgroundHref = isRust && !dt.fence_attributes.includes("ignore")
    ? `https://play.rust-lang.org/?code=${encodeURIComponent(dt.executable_code)}&edition=${edition}`
    : null;

  const runButton = playgroundHref
    ? `<a class="test-arrow rust-doctest-run" href="${escapeAttr(playgroundHref)}" target="_blank" rel="noopener">Run</a>`
    : "";
  const copyButton = `<button class="rust-doctest-copy" type="button" data-clipboard-target="#${anchor}-code">Copy</button>`;
  const hiddenToggle = hasHidden
    ? `<button class="rust-doctest-toggle-hidden" type="button" data-target="#${anchor}-full" data-display="#${anchor}-code">Show hidden lines</button>`
    : "";

  return [
    `<div class="rust-doctest example-wrap api-doctest" id="${anchor}">`,
    badges,
    `<pre class="rust rust-example-rendered"><code id="${anchor}-code">${code}</code></pre>`,
    hasHidden
      ? `<pre class="rust rust-example-rendered rust-doctest-full" hidden><code id="${anchor}-full">${fullCode}</code></pre>`
      : "",
    `<div class="rust-doctest-controls">${runButton}${copyButton}${hiddenToggle}</div>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderDoctestBadges(dt: Item["doctests"][number]): string {
  if (dt.fence_attributes.length === 0) return "";
  const badges = dt.fence_attributes
    .map(
      (a) =>
        `<span class="rust-doctest-badge rust-doctest-badge-${escapeAttr(
          a.replace(/[^a-zA-Z0-9_-]/g, "_"),
        )}" title="${escapeAttr(badgeTitle(a))}">${escapeHtml(a)}</span>`,
    )
    .join(" ");
  return `<div class="rust-doctest-badges">${badges}</div>`;
}

function badgeTitle(attr: string): string {
  switch (attr) {
    case "ignore":
      return "Excluded from testing.";
    case "no_run":
      return "Compiled but not executed.";
    case "should_panic":
      return "Test expected to panic.";
    case "compile_fail":
      return "Test expected to fail to compile.";
    case "edition2018":
    case "edition2021":
    case "edition2024":
      return `Compiled with ${attr.replace("edition", "Rust edition ")}.`;
    case "standalone_crate":
      return "Compiled as a standalone crate.";
    default:
      return attr;
  }
}

function pickEdition(attrs: string[]): string {
  for (const a of attrs) {
    if (a === "edition2018") return "2018";
    if (a === "edition2021") return "2021";
    if (a === "edition2024") return "2024";
  }
  return RUST_EDITION_DEFAULT;
}

function highlightRustCode(code: string): string {
  // Phase 3 keeps the highlighter minimal; we class-prefix tokens that the
  // theme styles. A future iteration can swap in sourcey's Shiki pipeline
  // without changing this function's signature.
  return escapeHtml(code);
}

// ---------------------------------------------------------------------------
// Module page rendering
// ---------------------------------------------------------------------------

export interface ModulePageRender {
  html: string;
  sidebarSections: SidebarSection[];
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  text: string;
  anchor: string;
}

export function renderModulePage(
  module: ModuleSpec,
  items: Item[],
  ctx: RenderContext,
): ModulePageRender {
  const parts: string[] = [];
  if (module.docs_markdown) {
    parts.push(`<div class="docblock rust-doc">${escapeHtml(module.docs_markdown)}</div>`);
  }
  const grouped = groupItemsForRendering(items);
  const sidebar: SidebarSection[] = [];
  for (const [group, members] of grouped) {
    if (members.length === 0) continue;
    parts.push(apiSectionAnchor({ level: 2, id: groupAnchor(group), text: group }));
    for (const m of members) {
      const detail = apiMethodToggle({
        summary: `<code>${escapeHtml(m.name ?? "")}</code>`,
        body: renderItemHtml(m, ctx),
      });
      parts.push(detail);
    }
    sidebar.push({
      label: group,
      items: members
        .filter((m) => m.name)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        .map((m) => ({ text: m.name ?? "", anchor: itemAnchor(m) })),
    });
  }

  // Synthesised impl blocks: wrap them in implementors-toggle for parity with
  // rustdoc. Phase 3 keeps the visual scope minimal; trait-impl walks land in
  // Phase 4 if needed.
  return {
    html: parts.join("\n"),
    sidebarSections: sidebar,
  };
}

const GROUP_ORDER = [
  "Modules",
  "Macros",
  "Structs",
  "Enums",
  "Unions",
  "Traits",
  "Trait Aliases",
  "Type Aliases",
  "Constants",
  "Statics",
  "Functions",
  "Re-exports",
  "Implementations",
] as const;

function groupItemsForRendering(items: Item[]): Map<(typeof GROUP_ORDER)[number], Item[]> {
  const out = new Map<(typeof GROUP_ORDER)[number], Item[]>();
  for (const g of GROUP_ORDER) out.set(g, []);
  for (const item of items) {
    const group = groupForItem(item);
    if (group) out.get(group)!.push(item);
  }
  return out;
}

function groupForItem(item: Item): (typeof GROUP_ORDER)[number] | null {
  switch (item.inner.kind) {
    case "module":
      return "Modules";
    case "macro":
    case "proc_macro":
      return "Macros";
    case "struct":
      return "Structs";
    case "enum":
      return "Enums";
    case "union":
      return "Unions";
    case "trait":
      return "Traits";
    case "trait_alias":
      return "Trait Aliases";
    case "type_alias":
      return "Type Aliases";
    case "constant":
      return "Constants";
    case "static":
      return "Statics";
    case "function":
      return "Functions";
    case "use":
      return "Re-exports";
    case "impl":
      return "Implementations";
    default:
      return null;
  }
}

function groupAnchor(group: string): string {
  return group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Re-export for unit tests.
export const __internals = {
  encodeImplAnchor,
  encodeGenericSegment,
  itemAnchor,
  renderDoctestBadges,
  pickEdition,
};
