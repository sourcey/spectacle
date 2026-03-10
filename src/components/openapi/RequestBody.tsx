import type { NormalizedRequestBody } from "../../core/types.js";
import { SchemaView } from "../schema/SchemaView.js";
import { ExampleView } from "../schema/ExampleView.js";
import { RequiredBadge } from "../ui/Badge.js";
import { Markdown } from "../ui/Markdown.js";

interface RequestBodyProps {
  body: NormalizedRequestBody;
}

export function RequestBody({ body }: RequestBodyProps) {
  const mediaTypes = Object.entries(body.content);
  if (!mediaTypes.length) return null;

  return (
    <div>
      {mediaTypes.map(([mediaType, content]) => (
        <div key={mediaType}>
          <div class="content-type-line">
            <code>{mediaType}</code>
            {body.required && <RequiredBadge />}
          </div>
          {body.description && (
            <div class="param-description">
              <Markdown content={body.description} />
            </div>
          )}
          {content.schema && <SchemaView schema={content.schema} />}
        </div>
      ))}
    </div>
  );
}

interface RequestBodyExampleProps {
  body: NormalizedRequestBody;
}

export function RequestBodyExample({ body }: RequestBodyExampleProps) {
  const mediaTypes = Object.entries(body.content);
  if (!mediaTypes.length) return null;

  const [, content] = mediaTypes[0];
  if (!content.schema) return null;

  return (
    <div class="example-block">
      <div class="example-block-header">Request Body</div>
      <ExampleView schema={content.schema} />
    </div>
  );
}
