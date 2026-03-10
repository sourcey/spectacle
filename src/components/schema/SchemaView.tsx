import type { NormalizedSchema } from "../../core/types.js";
import { Markdown } from "../ui/Markdown.js";
import { RequiredBadge, ReadOnlyBadge, DeprecatedBadge, Badge } from "../ui/Badge.js";
import { SchemaDatatype } from "./SchemaDatatype.js";

interface SchemaViewProps {
  schema: NormalizedSchema;
  requiredFields?: string[];
  depth?: number;
  maxDepth?: number;
}

const MAX_DEPTH = 10;

/**
 * Recursive schema renderer — stacked property layout.
 * Each property: name + type on one line, description below, children indented.
 */
export function SchemaView({
  schema,
  requiredFields,
  depth = 0,
  maxDepth = MAX_DEPTH,
}: SchemaViewProps) {
  if (depth >= maxDepth) {
    return <div class="schema-max-depth">Max depth reached</div>;
  }

  // Handle allOf composition
  if (schema.allOf?.length) {
    return (
      <div class="schema-composition">
        {schema.description && (
          <div class="schema-description">
            <Markdown content={schema.description} />
          </div>
        )}
        {schema.allOf.map((sub, i) => (
          <SchemaView key={i} schema={sub} depth={depth} maxDepth={maxDepth} />
        ))}
      </div>
    );
  }

  // Handle anyOf/oneOf
  if (schema.oneOf?.length || schema.anyOf?.length) {
    const variants = schema.oneOf ?? schema.anyOf ?? [];
    const label = schema.oneOf ? "One of" : "Any of";
    return (
      <div class="schema-variants">
        {schema.description && (
          <div class="schema-description">
            <Markdown content={schema.description} />
          </div>
        )}
        <div class="schema-variant-label">{label}</div>
        {variants.map((sub, i) => (
          <div key={i} class="schema-variant-option">
            <SchemaView schema={sub} depth={depth + 1} maxDepth={maxDepth} />
          </div>
        ))}
      </div>
    );
  }

  // Object with properties
  if (schema.properties) {
    const required = new Set(schema.required ?? requiredFields ?? []);
    return (
      <div>
        {schema.description && (
          <div class="schema-description">
            <Markdown content={schema.description} />
          </div>
        )}
        <div class="params-list">
          {Object.entries(schema.properties).map(([name, prop]) => (
            <PropertyRow
              key={name}
              name={name}
              schema={prop}
              required={required.has(name)}
              depth={depth}
              maxDepth={maxDepth}
            />
          ))}
        </div>
        {schema.additionalProperties &&
          typeof schema.additionalProperties !== "boolean" && (
            <div class="param-item">
              <div class="param-header">
                <code class="param-name">{"[key: string]"}</code>
                <span class="param-type">
                  <SchemaDatatype schema={schema.additionalProperties} />
                </span>
              </div>
            </div>
          )}
      </div>
    );
  }

  // Array
  if (schema.type === "array" && schema.items) {
    return (
      <div>
        {schema.description && (
          <div class="schema-description">
            <Markdown content={schema.description} />
          </div>
        )}
        <div class="schema-array-info">
          <SchemaDatatype schema={schema} />
        </div>
        {schema.items.properties && (
          <div class="schema-nested">
            <SchemaView
              schema={schema.items}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          </div>
        )}
      </div>
    );
  }

  // Simple type
  return (
    <div>
      {schema.description && (
        <div class="schema-description">
          <Markdown content={schema.description} />
        </div>
      )}
      <SchemaDatatype schema={schema} />
    </div>
  );
}

interface PropertyRowProps {
  name: string;
  schema: NormalizedSchema;
  required: boolean;
  depth: number;
  maxDepth: number;
}

function PropertyRow({
  name,
  schema,
  required,
  depth,
  maxDepth,
}: PropertyRowProps) {
  const hasInner =
    schema.properties || (schema.type === "array" && schema.items?.properties);

  return (
    <div class="param-item">
      <div class="param-header">
        <code class="param-name">{name}</code>
        <span class="param-type">
          <SchemaDatatype schema={schema} />
        </span>
        {required && <RequiredBadge />}
        {schema.readOnly && <ReadOnlyBadge />}
        {schema.writeOnly && <Badge>write only</Badge>}
        {schema.deprecated && <DeprecatedBadge />}
      </div>
      {schema.description && (
        <div class="param-description">
          <Markdown content={schema.description} />
        </div>
      )}
      {hasInner && (
        <div class="schema-nested">
          <SchemaView
            schema={schema.type === "array" && schema.items ? schema.items : schema}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        </div>
      )}
    </div>
  );
}
