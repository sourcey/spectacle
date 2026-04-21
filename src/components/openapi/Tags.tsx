import type { NormalizedTag } from "../../core/types.js";
import { tagDisplayName, tagLineage } from "../../core/tag-utils.js";
import { htmlId } from "../../utils/html-id.js";
import { Markdown } from "../ui/Markdown.js";
import { Badge } from "../ui/Badge.js";
import { Operation } from "./Operation.js";

interface TagsProps {
  tags: NormalizedTag[];
  serverUrl: string;
}

export function Tags({ tags, serverUrl }: TagsProps) {
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));

  return (
    <>
      {tags
        .filter((t) => !t.hidden)
        .map((tag) => {
          const parents = tagLineage(tag, tagsByName);
          const displayName = tagDisplayName(tag);

          return (
            <div key={tag.name} class={tag.parent ? "mt-8" : "mt-12"}>
              <div
                id={`tag-${htmlId(tag.name)}`}
                data-traverse-target={`tag-${htmlId(tag.name)}`}
                class="mb-6"
              >
                {parents.length > 0 && (
                  <div class="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[rgb(var(--color-gray-500))]">
                    {parents.map(tagDisplayName).join(" / ")}
                  </div>
                )}
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <h1 class="text-xl font-bold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">
                    {displayName}
                  </h1>
                  {tag.summary && tag.summary !== tag.name && (
                    <Badge>
                      <code>{tag.name}</code>
                    </Badge>
                  )}
                  {tag.kind && <Badge>{tag.kind}</Badge>}
                </div>
                {tag.description && (
                  <Markdown content={tag.description} class="text-sm max-w-none" />
                )}
              </div>
              {tag.operations.map((op) => (
                <Operation
                  key={`${op.method}-${op.path}`}
                  operation={op}
                  serverUrl={serverUrl}
                />
              ))}
            </div>
          );
        })}
    </>
  );
}
