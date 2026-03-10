import type { NormalizedSchema } from "../../core/types.js";
import { schemaRange } from "../../utils/http.js";

interface SchemaDatatypeProps {
  schema: NormalizedSchema;
}

/**
 * Renders type information matching the original Spectacle schema display.
 * Uses .json-property-type, .json-property-format, .json-property-enum, etc.
 */
export function SchemaDatatype({ schema }: SchemaDatatypeProps) {
  return (
    <>
      <span class="json-property-type">{formatBaseType(schema)}</span>
      {schema.format && (
        <span class="json-property-format"> ({schema.format})</span>
      )}
      {schema.enum?.length && (
        <span class="json-property-enum">
          {schema.enum.map((v, i) => (
            <span key={i} class="json-property-enum-item">
              {i > 0 ? ", " : ""}
              {String(v)}
            </span>
          ))}
        </span>
      )}
      {schemaRange(schema) && (
        <span class="json-property-range">{schemaRange(schema)}</span>
      )}
      {schema.default !== undefined && (
        <span class="json-property-default-value">{String(schema.default)}</span>
      )}
      {schema.nullable && <span class="json-property-type"> | null</span>}
    </>
  );
}

function formatBaseType(schema: NormalizedSchema): string {
  if (schema.allOf?.length) {
    return schema.allOf.map(formatBaseType).join(" & ");
  }
  if (schema.oneOf?.length) {
    return schema.oneOf.map(formatBaseType).join(" | ");
  }
  if (schema.anyOf?.length) {
    return schema.anyOf.map(formatBaseType).join(" | ");
  }
  if (schema.type === "array" && schema.items) {
    const itemType = schema.items.refName ?? formatBaseType(schema.items);
    return `Array<${itemType}>`;
  }
  if (schema.refName) {
    return schema.refName;
  }
  const type = Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  return type ?? "any";
}
