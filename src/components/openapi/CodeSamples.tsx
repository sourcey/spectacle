import type { NormalizedOperation } from "../../core/types.js";
import { generateCodeSamples } from "../../utils/code-samples.js";
import { highlightCode } from "../../utils/highlighter.js";

interface CodeSamplesProps {
  operation: NormalizedOperation;
  serverUrl: string;
}

/**
 * Right-side: tabbed code samples with copy button.
 */
export function CodeSamplesExamples({ operation, serverUrl }: CodeSamplesProps) {
  const samples = generateCodeSamples(operation, serverUrl);
  if (!samples.length) return null;

  return (
    <div class="code-samples">
      <div class="code-samples-tabs" role="tablist">
        {samples.map((sample, i) => (
          <button
            key={i}
            role="tab"
            class={`code-samples-tab${i === 0 ? " active" : ""}`}
            aria-selected={i === 0 ? "true" : "false"}
            data-tab-index={String(i)}
          >
            {sample.label ?? sample.lang}
          </button>
        ))}
      </div>
      {samples.map((sample, i) => {
        const html = highlightCode(sample.source, sample.lang);
        return (
          <div
            key={i}
            class={`code-samples-panel${i === 0 ? " active" : ""}`}
            role="tabpanel"
            data-panel-index={String(i)}
          >
            <div class="code-block-wrapper">
              <button class="copy-btn" data-copy-source="code" aria-label="Copy code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </button>
              <div class="code-block" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
