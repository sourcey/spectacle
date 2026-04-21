import type { NormalizedTag } from "./types.js";

export function tagDisplayName(tag: Pick<NormalizedTag, "name" | "summary">): string {
  return tag.summary ?? tag.name;
}

export function tagLineage(
  tag: Pick<NormalizedTag, "name" | "parent">,
  tagsByName: Map<string, NormalizedTag>,
): NormalizedTag[] {
  const lineage: NormalizedTag[] = [];
  const seen = new Set<string>([tag.name]);
  let parentName = tag.parent;

  while (parentName && !seen.has(parentName)) {
    const parent = tagsByName.get(parentName);
    if (!parent) break;
    lineage.unshift(parent);
    seen.add(parent.name);
    parentName = parent.parent;
  }

  return lineage;
}

export function tagNavigationLabel(
  tag: NormalizedTag,
  tagsByName: Map<string, NormalizedTag>,
): string {
  return [...tagLineage(tag, tagsByName), tag]
    .map(tagDisplayName)
    .join(" / ");
}
