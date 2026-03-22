import type { NormalizedRequestBody } from "../../core/types.js";
import { SchemaView } from "../schema/SchemaView.js";
import { ExampleView } from "../schema/ExampleView.js";
import { Markdown } from "../ui/Markdown.js";

interface RequestBodyProps {
  body: NormalizedRequestBody;
}

/**
 * Request body content (rendered in the main content column).
 */
export function RequestBody({ body }: RequestBodyProps) {
  const mediaTypes = Object.entries(body.content);
  if (!mediaTypes.length) return null;

  return (
    <div>
      {mediaTypes.map(([mediaType, content]) => (
        <div key={mediaType}>
          {body.description && (
            <div class="mb-4 text-sm text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-400))]">
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

/**
 * Request body example (rendered in the sticky code panel).
 */
export function RequestBodyExample({ body }: RequestBodyExampleProps) {
  const mediaTypes = Object.entries(body.content);
  if (!mediaTypes.length) return null;

  const [, content] = mediaTypes[0];
  if (!content.schema) return null;

  return <ExampleView schema={content.schema} title="Request Body" />;
}
