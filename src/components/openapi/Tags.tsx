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
          <div key={tag.name} class="tag-group">
            <div
              class="tag-header"
              id={`tag-${htmlId(tag.name)}`}
              data-traverse-target={`tag-${htmlId(tag.name)}`}
            >
              <h1>{tag.name}</h1>
              {tag.description && (
                <div class="tag-description">
                  <Markdown content={tag.description} />
                </div>
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
