interface SectionLabelProps {
  children: preact.ComponentChildren;
}

/**
 * Section heading with bottom border.
 * Used for "Body", "Parameters", "Response" sections.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div class="flex items-baseline border-b pb-2.5 border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))] w-full mb-4">
      <h4 class="flex-1 mb-0 text-sm font-semibold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">{children}</h4>
    </div>
  );
}
