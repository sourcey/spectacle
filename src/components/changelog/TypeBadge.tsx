import { Badge } from "../ui/Badge.js";
import type { ChangelogChangeType } from "../../core/types.js";

const BADGE_CLASS: Record<ChangelogChangeType, string> = {
  added: "sourcey-changelog-badge sourcey-changelog-badge-added",
  changed: "sourcey-changelog-badge sourcey-changelog-badge-changed",
  fixed: "sourcey-changelog-badge sourcey-changelog-badge-fixed",
  removed: "sourcey-changelog-badge sourcey-changelog-badge-removed",
  deprecated: "sourcey-changelog-badge sourcey-changelog-badge-deprecated",
  security: "sourcey-changelog-badge sourcey-changelog-badge-security",
  other: "sourcey-changelog-badge sourcey-changelog-badge-other",
};

export function TypeBadge({
  type,
  label,
}: {
  type: ChangelogChangeType;
  label: string;
}) {
  return <Badge class={BADGE_CLASS[type]}>{label}</Badge>;
}
