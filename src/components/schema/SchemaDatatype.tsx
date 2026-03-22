import type { NormalizedSchema } from "../../core/types.js";
import { schemaRange } from "../../utils/http.js";

interface SchemaDatatypeProps {
  schema: NormalizedSchema;
}

/**
 * Renders type information as a pill badge.
 * Combines type, format, and nullable into one label.
 */
export function SchemaDatatype({ schema }: SchemaDatatypeProps) {
  const base = formatBaseType(schema);
  const suffix = schema.nullable ? " | null" : "";
  const fmt = schema.format ? `<${schema.format}>` : "";
  const typeLabel = `${base}${fmt}${suffix}`;

  return (
    <>
      <span class="json-property-type">{typeLabel}</span>
      {renderEnum(schema.enum) ||
        (schema.type === "array" && schema.items?.enum && renderEnum(schema.items.enum))}
      {schemaRange(schema) && (
        <span class="json-property-range">{schemaRange(schema)}</span>
      )}
      {schema.default !== undefined && (
        <span class="json-property-default-value">{String(schema.default)}</span>
      )}
    </>
  );
}

function renderEnum(values?: unknown[]) {
  if (!values?.length) return null;
  return (
    <span class="json-property-enum">
      {values.map((v, i) => (
        <span key={i} class="json-property-enum-item">
          {String(v)}
        </span>
      ))}
    </span>
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
