/**
 * Copy icon SVG paths — single source of truth.
 * Used by CopyButton.tsx (Preact component) and markdown.ts (raw HTML string).
 */
export const COPY_ICON_PATH_1 =
  "M14.25 5.25H7.25C6.14543 5.25 5.25 6.14543 5.25 7.25V14.25C5.25 15.3546 6.14543 16.25 7.25 16.25H14.25C15.3546 16.25 16.25 15.3546 16.25 14.25V7.25C16.25 6.14543 15.3546 5.25 14.25 5.25Z";

export const COPY_ICON_PATH_2 =
  "M2.80103 11.998L1.77203 5.07397C1.61003 3.98097 2.36403 2.96397 3.45603 2.80197L10.38 1.77297C11.313 1.63397 12.19 2.16297 12.528 3.00097";

/** Raw HTML string for server-rendered contexts (markdown code blocks). */
export const COPY_ICON_SVG = `<svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg"><title>Copy</title><path d="${COPY_ICON_PATH_1}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${COPY_ICON_PATH_2}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
