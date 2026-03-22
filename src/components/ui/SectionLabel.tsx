interface SectionLabelProps {
  children: preact.ComponentChildren;
  meta?: preact.ComponentChildren;
}

/**
 * Section heading with bottom border and optional right-aligned metadata.
 * Used for "Body", "Parameters", "Response" sections.
 */
export function SectionLabel({ children, meta }: SectionLabelProps) {
  return (
    <div class="flex items-baseline border-b pb-2.5 border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))] w-full mb-4">
      <h4 class="flex-1 mb-0 text-sm font-semibold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">{children}</h4>
      {meta && (
        <div class="flex items-center gap-2 text-xs font-medium font-mono text-[rgb(var(--color-gray-500))]">
          {meta}
        </div>
      )}
    </div>
  );
}
