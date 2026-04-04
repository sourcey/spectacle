import type { NormalizedResponse } from "../../core/types.js";
import { httpStatusText } from "../../utils/http.js";
import { SchemaDatatype } from "../schema/SchemaDatatype.js";
import { ExampleView } from "../schema/ExampleView.js";
import { Markdown } from "../ui/Markdown.js";
import { CopyButton } from "../ui/CopyButton.js";
import { generateExample } from "../../utils/example-generator.js";
import { highlightCode } from "../../utils/highlighter.js";

interface ResponsesProps {
  responses: NormalizedResponse[];
}

function statusColorClass(code: string): string {
  if (code.startsWith("2")) return "bg-green-100 text-green-800 dark:bg-green-400/20 dark:text-green-300";
  if (code.startsWith("3")) return "bg-blue-100 text-blue-800 dark:bg-blue-400/20 dark:text-blue-300";
  if (code.startsWith("4")) return "bg-amber-100 text-amber-900 dark:bg-yellow-400/20 dark:text-yellow-300";
  if (code.startsWith("5")) return "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-300";
  return "bg-gray-400/20 text-gray-700 dark:text-gray-400";
}

/**
 * Response status list (rendered in the content column).
 */
export function ResponsesCopy({ responses }: ResponsesProps) {
  if (!responses.length) return null;

  return (
    <div class="params-list">
      {responses.map((r) => (
        <div key={r.statusCode} class="param-item">
          <div class="param-header font-mono text-sm">
            <span class={`px-1.5 py-0.5 rounded-md text-xs font-bold ${statusColorClass(r.statusCode)}`}>
              {r.statusCode}
            </span>
            <span class="font-medium text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">
              {httpStatusText(r.statusCode)}
            </span>
            {r.content && (
              <span class="param-type">
                {renderResponseType(r)}
              </span>
            )}
          </div>
          {r.description && (
            <div class="param-description">
              <Markdown content={r.description} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Response examples with status code tabs on the code block card.
 * Status code tabs are part of the code block header.
 */
export function ResponsesExamples({ responses }: ResponsesProps) {
  if (!responses.length) return null;

  const examples = responses
    .map((r) => {
      const schema = getResponseSchema(r);
      if (!schema) return null;
      const example = schema.example ?? generateExample(schema);
      if (example === undefined) return null;
      const json = JSON.stringify(example, null, 2);
      const html = highlightCode(json, "json");
      return { statusCode: r.statusCode, html };
    })
    .filter(Boolean) as { statusCode: string; html: string }[];

  if (!examples.length) return null;

  // Single response: use plain ExampleView
  if (examples.length === 1) {
    const r = responses.find((r) => r.statusCode === examples[0].statusCode)!;
    const schema = getResponseSchema(r)!;
    return <ExampleView schema={schema} title={`${examples[0].statusCode}`} />;
  }

  // Multiple responses: tabbed code block with status code tabs in the header
  return (
    <div class="response-tabs code-group not-prose">
      {/* Tab bar with status code tabs */}
      <div class="relative flex items-center justify-between gap-2 px-3">
        <div class="response-tab-list flex gap-1 overflow-x-auto text-xs leading-6" role="tablist">
          {examples.map((ex, i) => (
            <button
              key={ex.statusCode}
              type="button"
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              class={`response-tab group relative my-1 mb-1.5 flex items-center gap-1.5 whitespace-nowrap font-medium outline-0${i === 0 ? " active" : ""}`}
              data-response-index={String(i)}
            >
              <div class="z-10 flex items-center gap-1.5 rounded-lg px-1.5 group-hover:bg-[rgb(var(--color-stone-200)/0.5)] group-hover:text-[rgb(var(--color-primary))] dark:group-hover:bg-[rgb(var(--color-stone-700)/0.7)] dark:group-hover:text-[rgb(var(--color-primary-light))]">
                {ex.statusCode}
              </div>
            </button>
          ))}
        </div>
        <div class="flex shrink-0 items-center justify-end gap-1.5">
          <CopyButton />
        </div>
      </div>

      {/* Code panels */}
      {examples.map((ex, i) => (
        <div
          key={ex.statusCode}
          class={`response-panel${i === 0 ? " active" : ""}`}
          role="tabpanel"
          data-response-panel={String(i)}
        >
          <div class="relative w-full px-4 py-3.5 text-sm leading-6 bg-[rgb(var(--color-code-block-light))] dark:bg-[rgb(var(--color-code-block-dark))] overflow-x-auto" style="font-variant-ligatures: none">
            <div class="font-mono whitespace-pre text-xs leading-[1.35rem]" dangerouslySetInnerHTML={{ __html: ex.html }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function renderResponseType(r: NormalizedResponse) {
  const schema = getResponseSchema(r);
  if (!schema) return null;
  return <SchemaDatatype schema={schema} />;
}

function getResponseSchema(r: NormalizedResponse) {
  if (!r.content) return null;
  const firstMedia = Object.values(r.content)[0];
  return firstMedia?.schema ?? null;
}
