import type { NormalizedResponse } from "../../core/types.js";
import { httpStatusText } from "../../utils/http.js";
import { SchemaDatatype } from "../schema/SchemaDatatype.js";
import { ExampleView } from "../schema/ExampleView.js";
import { Markdown } from "../ui/Markdown.js";

interface ResponsesProps {
  responses: NormalizedResponse[];
}

function statusClass(code: string): string {
  if (code.startsWith("2")) return "status-success";
  if (code.startsWith("3")) return "status-redirect";
  if (code.startsWith("4")) return "status-client-error";
  if (code.startsWith("5")) return "status-server-error";
  return "status-default";
}

/**
 * Left-side: response status list.
 */
export function ResponsesCopy({ responses }: ResponsesProps) {
  if (!responses.length) return null;

  return (
    <div class="responses-list">
      {responses.map((r) => (
        <div key={r.statusCode} class="response-item">
          <div class="response-header">
            <span class={`status-code ${statusClass(r.statusCode)}`}>
              {r.statusCode}
            </span>
            <span class="response-status-text">
              {httpStatusText(r.statusCode)}
            </span>
            {r.content && (
              <span class="response-type">
                {renderResponseType(r)}
              </span>
            )}
          </div>
          {r.description && (
            <div class="response-description">
              <Markdown content={r.description} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Right-side: response examples + headers in dark panel.
 */
export function ResponsesExamples({ responses }: ResponsesProps) {
  if (!responses.length) return null;

  const examples = responses
    .map((r) => {
      const schema = getResponseSchema(r);
      if (!schema) return null;
      return (
        <div key={r.statusCode} class="example-block">
          <div class="example-block-header">
            <span class={`status-code ${statusClass(r.statusCode)}`}>
              {r.statusCode}
            </span>
            <span>{httpStatusText(r.statusCode)}</span>
          </div>
          <ExampleView schema={schema} />
        </div>
      );
    })
    .filter(Boolean);

  const headers = responses
    .map((r) => {
      if (!r.headers || Object.keys(r.headers).length === 0) return null;
      return (
        <div key={`headers-${r.statusCode}`} class="example-block">
          <div class="example-block-header">
            Response Headers ({r.statusCode})
          </div>
          <div class="response-headers-table">
            <table>
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Description</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(r.headers).map(([name, header]) => (
                  <tr key={name}>
                    <td><code>{name}</code></td>
                    <td>{header.description ?? ""}</td>
                    <td>
                      {header.schema && (
                        <SchemaDatatype schema={header.schema} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    })
    .filter(Boolean);

  if (!examples.length && !headers.length) return null;

  return (
    <>
      {examples}
      {headers}
    </>
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
