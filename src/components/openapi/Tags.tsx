import type { NormalizedTag } from "../../core/types.js";
import { htmlId } from "../../utils/html-id.js";
import { Markdown } from "../ui/Markdown.js";
import { Operation } from "./Operation.js";

interface TagsProps {
  tags: NormalizedTag[];
  serverUrl: string;
}

export function Tags({ tags, serverUrl }: TagsProps) {
  return (
    <>
      {tags
        .filter((t) => !t.hidden)
        .map((tag) => (
          <div key={tag.name} class="mt-12">
            <div
              id={`tag-${htmlId(tag.name)}`}
              data-traverse-target={`tag-${htmlId(tag.name)}`}
              class="mb-6"
            >
              <h1 class="text-xl font-bold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))] mb-2">{tag.name}</h1>
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
        ))}
    </>
  );
}
