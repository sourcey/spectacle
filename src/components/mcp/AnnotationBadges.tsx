/**
 * Renders MCP tool annotation badges inline with the operation title.
 * Same visual pattern as DeprecatedBadge / RequiredBadge / ReadOnlyBadge.
 */

interface Annotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

const badges: { key: keyof Annotations; label: string; className: string }[] = [
  { key: "readOnlyHint", label: "read-only", className: "bg-green-100/50 text-green-600 dark:bg-green-400/10 dark:text-green-300" },
  { key: "destructiveHint", label: "destructive", className: "bg-red-100/50 text-red-600 dark:bg-red-400/10 dark:text-red-300" },
  { key: "idempotentHint", label: "idempotent", className: "bg-blue-100/50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300" },
  { key: "openWorldHint", label: "open-world", className: "bg-amber-100/50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300" },
];

export function AnnotationBadges({ annotations }: { annotations: Annotations }) {
  return (
    <>
      {badges.map(
        ({ key, label, className }) =>
          annotations[key] && (
            <span key={key} class={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
              {label}
            </span>
          ),
      )}
    </>
  );
}
