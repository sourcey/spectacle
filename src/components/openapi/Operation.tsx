import type { NormalizedOperation } from "../../core/types.js";
import { htmlId } from "../../utils/html-id.js";
import { Markdown } from "../ui/Markdown.js";
import { DeprecatedBadge } from "../ui/Badge.js";
import { SectionLabel } from "../ui/SectionLabel.js";
import { Parameters } from "./Parameters.js";
import { RequestBody, RequestBodyExample } from "./RequestBody.js";
import { ResponsesCopy, ResponsesExamples } from "./Responses.js";
import { SecurityCopy } from "./Security.js";
import { CodeSamplesExamples } from "./CodeSamples.js";

interface OperationProps {
  operation: NormalizedOperation;
  serverUrl: string;
}

export function Operation({ operation: op, serverUrl }: OperationProps) {
  const id = `operation-${htmlId(op.path)}-${htmlId(op.method)}`;
  const hasParams = op.parameters.length > 0;
  const hasBody = !!op.requestBody;

  return (
    <div id={id} class="operation" data-traverse-target={id}>
      <div class="operation-header">
        <div class="operation-method-path">
          <span class={`operation-method method-${op.method.toLowerCase()}`}>
            {op.method.toUpperCase()}
          </span>
          <span class="operation-path">{op.path}</span>
          {op.deprecated && (
            <>
              {" "}
              <DeprecatedBadge />
            </>
          )}
        </div>
        {op.summary && (
          <h2 class="operation-summary">
            <Markdown content={op.summary} inline />
          </h2>
        )}
      </div>

      <div class="doc-row">
        <div class="doc-copy">
          {op.description && (
            <div class="operation-description">
              <Markdown content={op.description} />
            </div>
          )}

          {hasBody && (
            <div class="content-section">
              <SectionLabel>Request Body</SectionLabel>
              <RequestBody body={op.requestBody!} />
            </div>
          )}

          {hasParams && (
            <div class="content-section">
              <SectionLabel>Parameters</SectionLabel>
              <Parameters parameters={op.parameters} />
            </div>
          )}

          {op.responses.length > 0 && (
            <div class="content-section">
              <SectionLabel>Responses</SectionLabel>
              <ResponsesCopy responses={op.responses} />
            </div>
          )}

          <SecurityCopy security={op.security} />
        </div>

        <div class="doc-examples">
          <CodeSamplesExamples operation={op} serverUrl={serverUrl} />
          {hasBody && <RequestBodyExample body={op.requestBody!} />}
          <ResponsesExamples responses={op.responses} />
        </div>
      </div>
    </div>
  );
}
