interface BadgeProps {
  children: preact.ComponentChildren;
  class?: string;
  style?: Record<string, string>;
}

export function Badge({ children, class: className, style }: BadgeProps) {
  return (
    <span class={`badge ${className ?? ""}`} style={style}>
      {children}
    </span>
  );
}

export function RequiredBadge() {
  return <span class="badge badge-required">required</span>;
}

export function DeprecatedBadge() {
  return <span class="badge badge-deprecated">deprecated</span>;
}

export function ReadOnlyBadge() {
  return <span class="badge badge-info">read only</span>;
}
