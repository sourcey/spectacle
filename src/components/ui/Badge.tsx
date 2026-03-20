interface BadgeProps {
  children: preact.ComponentChildren;
  class?: string;
  style?: Record<string, string>;
}

export function Badge({ children, class: className, style }: BadgeProps) {
  return (
    <span
      class={`inline-flex items-center gap-1 break-all rounded-md px-2 py-0.5 text-xs font-medium ${className ?? "bg-[rgb(var(--color-gray-100)/0.5)] text-[rgb(var(--color-gray-600))] dark:bg-[rgb(var(--color-surface-dark-tint)/0.05)] dark:text-[rgb(var(--color-gray-200))]"}`}
      style={style}
    >
      {children}
    </span>
  );
}

export function RequiredBadge() {
  return (
    <span class="whitespace-nowrap rounded-md bg-red-100/50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-400/10 dark:text-red-300">
      required
    </span>
  );
}

export function DeprecatedBadge() {
  return (
    <span class="whitespace-nowrap rounded-md bg-amber-100/50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
      deprecated
    </span>
  );
}

export function ReadOnlyBadge() {
  return (
    <span class="whitespace-nowrap rounded-md bg-[rgb(var(--color-gray-100)/0.5)] px-2 py-0.5 text-xs font-medium text-[rgb(var(--color-gray-600))] dark:bg-[rgb(var(--color-surface-dark-tint)/0.05)] dark:text-[rgb(var(--color-gray-200))]">
      read only
    </span>
  );
}
