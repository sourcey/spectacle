/**
 * MCP Returns section — replaces Responses for MCP operations.
 * Renders output schema as a schema view instead of status code tables.
 */

import type { NormalizedSchema } from "../../core/types.js";
import { SchemaView } from "../schema/SchemaView.js";
import { ExampleView } from "../schema/ExampleView.js";
import { SectionLabel } from "../ui/SectionLabel.js";

/**
 * Left column: "Returns" section label + schema view or fallback text.
 */
export function McpReturnsCopy({ schema }: { schema?: NormalizedSchema }) {
  return (
    <div class="mt-6">
      <SectionLabel>Returns</SectionLabel>
      {schema ? (
        <SchemaView schema={schema} />
      ) : (
        <p class="text-sm text-[rgb(var(--color-gray-500))]">
          Returns MCP content array (text, image, or embedded resource).
        </p>
      )}
    </div>
  );
}

/**
 * Right column (sticky panel): example JSON for the output schema.
 */
export function McpReturnsExample({ schema }: { schema?: NormalizedSchema }) {
  if (!schema) {
    return (
      <ExampleView
        schema={{
          type: "object",
          properties: {
            content: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["text", "image", "resource"] },
                  text: { type: "string", example: "..." },
                },
              },
            },
          },
        }}
        title="Response"
      />
    );
  }

  return <ExampleView schema={schema} title="Response" />;
}
