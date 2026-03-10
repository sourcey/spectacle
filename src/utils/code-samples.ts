import type { NormalizedOperation } from "../core/types.js";
import type { CodeSample } from "../core/types.js";
import { generateExample } from "./example-generator.js";

/**
 * Auto-generate code samples (curl, JavaScript fetch, Python requests)
 * from an operation's spec when no custom x-code-samples are provided.
 */
export function generateCodeSamples(
  op: NormalizedOperation,
  serverUrl: string,
): CodeSample[] {
  if (op.codeSamples?.length) return op.codeSamples;

  const url = `${serverUrl.replace(/\/$/, "")}${op.path}`;
  const method = op.method.toUpperCase();
  const hasBody = !!op.requestBody;
  const contentType = hasBody
    ? Object.keys(op.requestBody!.content)[0] ?? "application/json"
    : undefined;

  const bodyExample = hasBody ? getRequestBodyExample(op) : undefined;
  const bodyJson = bodyExample ? JSON.stringify(bodyExample, null, 2) : undefined;

  return [
    generateCurl(url, method, contentType, bodyJson),
    generateJavaScript(url, method, contentType, bodyJson),
    generatePython(url, method, contentType, bodyJson),
  ];
}

function getRequestBodyExample(op: NormalizedOperation): unknown {
  const content = op.requestBody?.content;
  if (!content) return undefined;

  const mediaType = Object.values(content)[0];
  if (!mediaType) return undefined;

  if (mediaType.example !== undefined) return mediaType.example;
  if (mediaType.schema) return generateExample(mediaType.schema);
  return undefined;
}

function generateCurl(
  url: string,
  method: string,
  contentType?: string,
  body?: string,
): CodeSample {
  const parts = [`curl -X ${method} '${url}'`];
  if (contentType) {
    parts.push(`  -H 'Content-Type: ${contentType}'`);
  }
  if (body) {
    parts.push(`  -d '${body}'`);
  }
  return { lang: "bash", label: "cURL", source: parts.join(" \\\n") };
}

function generateJavaScript(
  url: string,
  method: string,
  contentType?: string,
  body?: string,
): CodeSample {
  const lines = [`const response = await fetch('${url}', {`];
  lines.push(`  method: '${method}',`);

  if (contentType) {
    lines.push(`  headers: {`);
    lines.push(`    'Content-Type': '${contentType}',`);
    lines.push(`  },`);
  }

  if (body) {
    lines.push(`  body: JSON.stringify(${body}),`);
  }

  lines.push(`});`);
  lines.push(``);
  lines.push(`const data = await response.json();`);

  return { lang: "javascript", label: "JavaScript", source: lines.join("\n") };
}

function generatePython(
  url: string,
  method: string,
  contentType?: string,
  body?: string,
): CodeSample {
  const lines = ["import requests", ""];
  const args = [`'${url}'`];

  if (body) {
    lines.push(`payload = ${pythonDict(body)}`);
    lines.push("");
    args.push("json=payload");
  }

  if (contentType && !body) {
    args.push(`headers={'Content-Type': '${contentType}'}`);
  }

  lines.push(
    `response = requests.${method.toLowerCase()}(${args.join(", ")})`,
  );
  lines.push(`data = response.json()`);

  return { lang: "python", label: "Python", source: lines.join("\n") };
}

function pythonDict(jsonStr: string): string {
  // Simple conversion of JSON to Python dict syntax
  return jsonStr
    .replace(/: true/g, ": True")
    .replace(/: false/g, ": False")
    .replace(/: null/g, ": None");
}
