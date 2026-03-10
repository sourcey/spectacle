interface SectionLabelProps {
  children: preact.ComponentChildren;
}

/**
 * A visible, accessible section label. Replaces the CSS ::before hack.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return <div class="section-label">{children}</div>;
}
