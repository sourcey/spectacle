import type { NormalizedSchema } from "../../core/types.js";
import { htmlId } from "../../utils/html-id.js";
import { SchemaView } from "../schema/SchemaView.js";
import { ExampleView } from "../schema/ExampleView.js";

interface DefinitionProps {
  name: string;
  schema: NormalizedSchema;
}

export function Definition({ name, schema }: DefinitionProps) {
  const id = `definition-${htmlId(name)}`;

  return (
    <div id={id} class="definition" data-traverse-target={id}>
      <a id={`/definitions/${name}`} />
      <div class="definition-header">
        <h2>{name}</h2>
        <span class="definition-type">{schema.type ?? "object"}</span>
      </div>

      <div class="doc-row">
        <div class="doc-copy">
          <SchemaView schema={schema} />
        </div>
        <div class="doc-examples">
          <ExampleView schema={schema} title="Example" />
        </div>
      </div>
    </div>
  );
}
