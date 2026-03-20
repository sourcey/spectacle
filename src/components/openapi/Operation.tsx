import { useContext } from "preact/hooks";
import type { NormalizedOperation } from "../../core/types.js";
import { htmlId } from "../../utils/html-id.js";
import { SiteContext } from "../../renderer/context.js";
import { Markdown } from "../ui/Markdown.js";
import { DeprecatedBadge } from "../ui/Badge.js";
import { SectionLabel } from "../ui/SectionLabel.js";
import { Parameters } from "./Parameters.js";
import { RequestBody, RequestBodyExample } from "./RequestBody.js";
import { ResponsesCopy, ResponsesExamples } from "./Responses.js";
import { SecurityCopy } from "./Security.js";
import { CodeSamplesExamples } from "./CodeSamples.js";
import { EndpointBar } from "./EndpointBar.js";

interface OperationProps {
  operation: NormalizedOperation;
  serverUrl: string;
}

/**
 * Single operation with sticky code panel:
 * - Endpoint bar at top
 * - Single-column content (left) + sticky code panel (right, xl+ only)
 */
export function Operation({ operation: op, serverUrl }: OperationProps) {
  const site = useContext(SiteContext);
  const apiFirst = site.theme.preset === "api-first";
  const id = `operation-${htmlId(op.path)}-${htmlId(op.method)}`;
  const hasParams = op.parameters.length > 0;
  const hasBody = !!op.requestBody;

  return (
    <div id={id} class="py-8 border-t border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))]" data-traverse-target={id}>
      {/* Operation title */}
      <header class="mb-6">
        {op.summary && (
          <h2 class="text-2xl sm:text-3xl text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))] tracking-tight font-bold mb-2">
            <Markdown content={op.summary} inline />
          </h2>
        )}
        {op.deprecated && <DeprecatedBadge />}
      </header>

      {/* Endpoint bar */}
      <EndpointBar method={op.method} path={op.path} serverUrl={serverUrl} />

      {/* Content + sticky code panel */}
      <div class={`flex flex-col ${apiFirst ? "lg:flex-row" : "xl:flex-row"} gap-8`}>
        {/* Left: content column */}
        <div class="flex-1 min-w-0">
          {op.description && (
            <Markdown content={op.description} class="mb-6" />
          )}

          {hasBody && (
            <div class="mt-6">
              <SectionLabel>Body</SectionLabel>
              <RequestBody body={op.requestBody!} />
            </div>
          )}

          {hasParams && (
            <div class="mt-6">
              <SectionLabel>Parameters</SectionLabel>
              <Parameters parameters={op.parameters} />
            </div>
          )}

          {op.responses.length > 0 && (
            <div class="mt-6">
              <SectionLabel>Response</SectionLabel>
              <ResponsesCopy responses={op.responses} />
            </div>
          )}

          <SecurityCopy security={op.security} />
        </div>

        {/* Right: sticky code panel */}
        <aside class={`hidden ${apiFirst ? "lg:block" : "xl:block"} w-[28rem] shrink-0 sticky self-start overflow-y-auto space-y-4`} style="top: calc(var(--header-height) + 2.5rem); max-height: calc(100vh - var(--header-height) - 5rem)">
          <CodeSamplesExamples operation={op} serverUrl={serverUrl} codeSampleLangs={site.codeSamples} />
          {hasBody && <RequestBodyExample body={op.requestBody!} />}
          <ResponsesExamples responses={op.responses} />
        </aside>
      </div>

      {/* Mobile: code examples shown inline below content */}
      <div class={`${apiFirst ? "lg:hidden" : "xl:hidden"} mt-8 space-y-4`}>
        <CodeSamplesExamples operation={op} serverUrl={serverUrl} codeSampleLangs={site.codeSamples} />
        {hasBody && <RequestBodyExample body={op.requestBody!} />}
        <ResponsesExamples responses={op.responses} />
      </div>
    </div>
  );
}
