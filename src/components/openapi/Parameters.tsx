import type { NormalizedParameter } from "../../core/types.js";
import { SchemaDatatype } from "../schema/SchemaDatatype.js";
import { RequiredBadge, DeprecatedBadge } from "../ui/Badge.js";
import { Markdown } from "../ui/Markdown.js";
import { MediaTypeDetails, contentMediaTypes, firstContentSchema } from "./MediaTypeDetails.js";

interface ParametersProps {
  parameters: NormalizedParameter[];
}

export function Parameters({ parameters }: ParametersProps) {
  if (!parameters.length) return null;

  return (
    <div class="params-list">
      {parameters.map((param) => {
        const schema = param.schema ?? firstContentSchema(param.content);
        const mediaTypes = contentMediaTypes(param.content);
        return (
          <div key={`${param.in}-${param.name}`} class="param-item">
            <div class="param-header">
              <code class="param-name">{param.name}</code>
              {schema && (
                <span class="param-type">
                  <SchemaDatatype schema={schema} />
                </span>
              )}
              {mediaTypes.length > 0 && (
                <span class="param-type">
                  <code class="text-xs font-medium text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-300))]">
                    {mediaTypes.join(", ")}
                  </code>
                </span>
              )}
              {param.required && <RequiredBadge />}
              {param.deprecated && <DeprecatedBadge />}
              <span class="param-in">{param.in}</span>
            </div>
            {(param.description || mediaTypes.length > 0) && (
              <div class="param-description">
                {param.description && (
                  <Markdown content={param.description} class="prose-sm" />
                )}
                {param.content && Object.entries(param.content).map(([mediaType, content]) => (
                  <MediaTypeDetails
                    key={mediaType}
                    mediaType={mediaType}
                    content={content}
                    showLabel={true}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
