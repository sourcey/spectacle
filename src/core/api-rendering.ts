/**
 * Shared API-documentation rendering primitives.
 *
 * Introduced by the rustdoc adapter and designed to be reusable by the godoc
 * and doxygen adapters in a follow-on retrofit. Class names mirror rustdoc's
 * DOM so deep-links from a rustdoc URL line up with sourcey output.
 */

export interface ApiStabilityCalloutInput {
  kind: "unstable" | "deprecated" | "portability" | "non_exhaustive" | "must_use";
  since?: string | null;
  reason?: string | null;
  featureName?: string | null;
  issueId?: number | null;
  /** Tracking-issue URL prefix; defaults to rust-lang issues. */
  issueBaseUrl?: string;
}

export function apiStabilityCallout(input: ApiStabilityCalloutInput): string {
  switch (input.kind) {
    case "unstable": {
      const issue = input.issueId
        ? ` (<a href="${escapeAttr(
            (input.issueBaseUrl ?? "https://github.com/rust-lang/rust/issues/") +
              String(input.issueId),
          )}">#${input.issueId}</a>)`
        : "";
      const feature = input.featureName ? ` <code>${escapeHtml(input.featureName)}</code>` : "";
      return `<div class="stab unstable api-stab api-stab-unstable">🔬 This is a nightly-only experimental API.${feature}${issue}</div>`;
    }
    case "deprecated": {
      const since = input.since ? ` since ${escapeHtml(input.since)}` : "";
      const reason = input.reason ? `: ${escapeHtml(input.reason)}` : "";
      return `<div class="stab deprecated api-stab api-stab-deprecated">👎 Deprecated${since}${reason}</div>`;
    }
    case "portability": {
      const feature = input.featureName
        ? ` crate feature <code>${escapeHtml(input.featureName)}</code>`
        : "";
      return `<div class="stab portability api-stab api-stab-portability">Available on${feature} only.</div>`;
    }
    case "non_exhaustive":
      return `<div class="stab api-stab api-stab-non-exhaustive">This is marked <code>#[non_exhaustive]</code>; new variants or fields may be added in future versions.</div>`;
    case "must_use": {
      const reason = input.reason ? `: ${escapeHtml(input.reason)}` : "";
      return `<div class="stab api-stab api-stab-must-use"><code>#[must_use]</code>${reason}</div>`;
    }
  }
}

export interface ApiItemInfoRowInput {
  since?: string | null;
  sourceHref?: string | null;
  sourceLabel?: string;
}

export function apiItemInfoRow(input: ApiItemInfoRowInput): string {
  const parts: string[] = [];
  if (input.since) {
    parts.push(`<span class="since api-since">${escapeHtml(input.since)}</span>`);
  }
  if (input.sourceHref) {
    parts.push(
      `<a class="srclink api-srclink" href="${escapeAttr(input.sourceHref)}">${escapeHtml(
        input.sourceLabel ?? "Source",
      )}</a>`,
    );
  }
  if (parts.length === 0) return "";
  return `<div class="rightside api-rightside">${parts.join(" · ")}</div>`;
}

export interface ApiSymbolLinkInput {
  kind: string;
  href: string;
  text: string;
  title?: string;
}

export function apiSymbolLink(input: ApiSymbolLinkInput): string {
  const title = input.title ? ` title="${escapeAttr(input.title)}"` : "";
  return `<a class="${escapeAttr(input.kind)} api-symbol-link"${title} href="${escapeAttr(
    input.href,
  )}">${escapeHtml(input.text)}</a>`;
}

export interface ApiToggleInput {
  open?: boolean;
  summary: string;
  body: string;
  cssClass: string;
}

export function apiImplToggle(input: Omit<ApiToggleInput, "cssClass">): string {
  return apiToggle({
    ...input,
    cssClass: "toggle implementors-toggle api-impl-toggle",
  });
}

export function apiMethodToggle(input: Omit<ApiToggleInput, "cssClass">): string {
  return apiToggle({
    ...input,
    cssClass: "toggle method-toggle api-method-toggle",
  });
}

function apiToggle(input: ApiToggleInput): string {
  const openAttr = input.open === false ? "" : " open";
  return `<details class="${escapeAttr(
    input.cssClass,
  )}"${openAttr}><summary class="hideme">${input.summary}</summary>${input.body}</details>`;
}

export interface ApiSectionAnchorInput {
  level: 2 | 3 | 4 | 5;
  id: string;
  text: string;
  className?: string;
}

export function apiSectionAnchor(input: ApiSectionAnchorInput): string {
  const cls = input.className ? ` ${input.className}` : "";
  return (
    `<h${input.level} id="${escapeAttr(input.id)}" class="section-header api-section-header${cls}">` +
    `${escapeHtml(input.text)}` +
    ` <a class="anchor api-anchor" href="#${escapeAttr(input.id)}">§</a>` +
    `</h${input.level}>`
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value);
}
