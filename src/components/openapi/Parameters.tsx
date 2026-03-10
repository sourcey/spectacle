import type { NormalizedParameter } from "../../core/types.js";
import { SchemaDatatype } from "../schema/SchemaDatatype.js";
import { RequiredBadge, DeprecatedBadge } from "../ui/Badge.js";
import { Markdown } from "../ui/Markdown.js";

interface ParametersProps {
  parameters: NormalizedParameter[];
}

export function Parameters({ parameters }: ParametersProps) {
  if (!parameters.length) return null;

  return (
    <div class="params-list">
      {parameters.map((param) => (
        <div key={`${param.in}-${param.name}`} class="param-item">
          <div class="param-header">
            <code class="param-name">{param.name}</code>
            {param.schema && (
              <span class="param-type">
                <SchemaDatatype schema={param.schema} />
              </span>
            )}
            {param.required && <RequiredBadge />}
            {param.deprecated && <DeprecatedBadge />}
            <span class="param-in">{param.in}</span>
          </div>
          {param.description && (
            <div class="param-description">
              <Markdown content={param.description} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
