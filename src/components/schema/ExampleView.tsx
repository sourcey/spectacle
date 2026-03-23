import type { NormalizedSchema } from "../../core/types.js";
import { generateExample } from "../../utils/example-generator.js";
import { highlightCode } from "../../utils/highlighter.js";
import { CopyButton } from "../ui/CopyButton.js";

interface ExampleViewProps {
  schema: NormalizedSchema;
  title?: string;
}

/**
 * Renders a JSON example in a stone-themed code card with copy button.
 */
export function ExampleView({ schema, title }: ExampleViewProps) {
  const example = schema.example ?? generateExample(schema);
  if (example === undefined) return null;

  const json = JSON.stringify(example, null, 2);
  const html = highlightCode(json, "json");
  return (
    <div class="code-group not-prose">
      {title && (
        <div class="relative flex items-center justify-between gap-2 px-3">
          <div class="flex min-w-0 items-center gap-1.5 font-medium text-xs leading-6 my-1 mb-1.5">
            <span class="truncate text-[rgb(var(--color-stone-950))] dark:text-[rgb(var(--color-stone-50))]">
              {title}
            </span>
          </div>
          <div class="flex shrink-0 items-center justify-end gap-1.5">
            <CopyButton />
          </div>
        </div>
      )}
      <div class="relative w-full px-4 py-3.5 text-sm leading-6 bg-[rgb(var(--color-code-block-light))] dark:bg-[rgb(var(--color-code-block-dark))] overflow-x-auto" style="font-variant-ligatures: none">
        {!title && (
          <div class="absolute top-3 right-4 z-10">
            <CopyButton />
          </div>
        )}
        <div class="font-mono whitespace-pre text-xs leading-[1.35rem]" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
