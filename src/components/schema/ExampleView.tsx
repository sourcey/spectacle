import type { NormalizedSchema } from "../../core/types.js";
import { generateExample } from "../../utils/example-generator.js";
import { highlightCode } from "../../utils/highlighter.js";

interface ExampleViewProps {
  schema: NormalizedSchema;
  title?: string;
}

/**
 * Renders a JSON example for a schema, auto-generating one if not provided.
 */
export function ExampleView({ schema, title }: ExampleViewProps) {
  const example = schema.example ?? generateExample(schema);
  if (example === undefined) return null;

  const json = JSON.stringify(example, null, 2);
  const html = highlightCode(json, "json");
  return (
    <div class="code-block-wrapper">
      {title && <div class="example-block-header">{title}</div>}
      <div class="code-block" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
