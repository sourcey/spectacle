import type { NormalizedOperation } from "../core/types.js";
import type { CodeSample } from "../core/types.js";
import { generateExample } from "./example-generator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestInfo {
  url: string;
  method: string;
  contentType?: string;
  body?: string;
}

type CodeSampleGenerator = (req: RequestInfo) => CodeSample;

// ---------------------------------------------------------------------------
// Generator registry
// ---------------------------------------------------------------------------

const generators: Record<string, CodeSampleGenerator> = {
  curl({ url, method, contentType, body }: RequestInfo): CodeSample {
    const parts = [`curl -X ${method} '${url}'`];
    if (contentType) parts.push(`  -H 'Content-Type: ${contentType}'`);
    if (body) parts.push(`  -d '${body}'`);
    return { lang: "bash", label: "cURL", source: parts.join(" \\\n") };
  },

  javascript({ url, method, contentType, body }: RequestInfo): CodeSample {
    const lines = [`const response = await fetch('${url}', {`];
    lines.push(`  method: '${method}',`);
    if (contentType) {
      lines.push(`  headers: {`, `    'Content-Type': '${contentType}',`, `  },`);
    }
    if (body) lines.push(`  body: JSON.stringify(${body}),`);
    lines.push(`});`, ``, `const data = await response.json();`);
    return { lang: "javascript", label: "JavaScript", source: lines.join("\n") };
  },

  typescript({ url, method, contentType, body }: RequestInfo): CodeSample {
    const lines = [`const response = await fetch('${url}', {`];
    lines.push(`  method: '${method}',`);
    if (contentType) {
      lines.push(`  headers: {`, `    'Content-Type': '${contentType}',`, `  },`);
    }
    if (body) lines.push(`  body: JSON.stringify(${body}),`);
    lines.push(`});`, ``, `const data: Record<string, unknown> = await response.json();`);
    return { lang: "typescript", label: "TypeScript", source: lines.join("\n") };
  },

  python({ url, method, contentType, body }: RequestInfo): CodeSample {
    const lines = ["import requests", ""];
    const args = [`'${url}'`];
    if (body) {
      lines.push(`payload = ${pythonDict(body)}`, "");
      args.push("json=payload");
    } else if (contentType) {
      args.push(`headers={'Content-Type': '${contentType}'}`);
    }
    lines.push(`response = requests.${method.toLowerCase()}(${args.join(", ")})`);
    lines.push(`data = response.json()`);
    return { lang: "python", label: "Python", source: lines.join("\n") };
  },

  go({ url, method, body }: RequestInfo): CodeSample {
    const lines = ["package main", "", "import (", `  "fmt"`, `  "io"`, `  "net/http"`,];
    if (body) lines.push(`  "strings"`);
    lines.push(")", "");
    lines.push("func main() {");
    if (body) {
      lines.push(`  body := strings.NewReader(\`${body}\`)`);
      lines.push(`  req, _ := http.NewRequest("${method}", "${url}", body)`);
    } else {
      lines.push(`  req, _ := http.NewRequest("${method}", "${url}", nil)`);
    }
    lines.push(`  req.Header.Set("Content-Type", "application/json")`);
    lines.push(`  resp, _ := http.DefaultClient.Do(req)`);
    lines.push(`  defer resp.Body.Close()`);
    lines.push(`  data, _ := io.ReadAll(resp.Body)`);
    lines.push(`  fmt.Println(string(data))`);
    lines.push("}");
    return { lang: "go", label: "Go", source: lines.join("\n") };
  },

  ruby({ url, method, contentType, body }: RequestInfo): CodeSample {
    const lines = [
      `require 'net/http'`,
      `require 'json'`,
      ``,
      `uri = URI('${url}')`,
    ];
    const methodClass = method === "GET" ? "Get" : method === "POST" ? "Post" : method === "PUT" ? "Put" : method === "DELETE" ? "Delete" : method === "PATCH" ? "Patch" : "Post";
    lines.push(`request = Net::HTTP::${methodClass}.new(uri)`);
    if (contentType) lines.push(`request['Content-Type'] = '${contentType}'`);
    if (body) lines.push(`request.body = '${body}'`);
    lines.push(``, `response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(request) }`);
    lines.push(`data = JSON.parse(response.body)`);
    return { lang: "ruby", label: "Ruby", source: lines.join("\n") };
  },

  java({ url, method, body }: RequestInfo): CodeSample {
    const lines = [
      `import java.net.http.*;`,
      `import java.net.URI;`,
      ``,
      `HttpClient client = HttpClient.newHttpClient();`,
    ];
    if (body) {
      lines.push(`String body = """`, `${body}""";`, ``);
      lines.push(`HttpRequest request = HttpRequest.newBuilder()`);
      lines.push(`    .uri(URI.create("${url}"))`);
      lines.push(`    .header("Content-Type", "application/json")`);
      lines.push(`    .method("${method}", HttpRequest.BodyPublishers.ofString(body))`);
    } else {
      lines.push(`HttpRequest request = HttpRequest.newBuilder()`);
      lines.push(`    .uri(URI.create("${url}"))`);
      lines.push(`    .method("${method}", HttpRequest.BodyPublishers.noBody())`);
    }
    lines.push(`    .build();`, ``);
    lines.push(`HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`);
    lines.push(`System.out.println(response.body());`);
    return { lang: "java", label: "Java", source: lines.join("\n") };
  },

  php({ url, method, contentType, body }: RequestInfo): CodeSample {
    const lines = [`<?php`, `$ch = curl_init('${url}');`];
    lines.push(`curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);`);
    if (method !== "GET") {
      lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');`);
    }
    if (contentType) {
      lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: ${contentType}']);`);
    }
    if (body) {
      lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${body}');`);
    }
    lines.push(``, `$response = curl_exec($ch);`, `curl_close($ch);`);
    lines.push(`$data = json_decode($response, true);`);
    return { lang: "php", label: "PHP", source: lines.join("\n") };
  },

  rust({ url, method, body }: RequestInfo): CodeSample {
    const lines = [
      `use reqwest;`,
      ``,
      `#[tokio::main]`,
      `async fn main() -> Result<(), reqwest::Error> {`,
      `    let client = reqwest::Client::new();`,
    ];
    const m = method.toLowerCase();
    if (body) {
      lines.push(`    let body = serde_json::json!(${body});`);
      lines.push(`    let response = client.${m}("${url}")`);
      lines.push(`        .json(&body)`);
    } else {
      lines.push(`    let response = client.${m}("${url}")`);
    }
    lines.push(`        .send()`);
    lines.push(`        .await?`);
    lines.push(`        .text()`);
    lines.push(`        .await?;`);
    lines.push(`    println!("{}", response);`);
    lines.push(`    Ok(())`);
    lines.push(`}`);
    return { lang: "rust", label: "Rust", source: lines.join("\n") };
  },

  csharp({ url, method, body }: RequestInfo): CodeSample {
    const lines = [
      `using var client = new HttpClient();`,
      ``,
    ];
    if (body) {
      lines.push(`var content = new StringContent("""`, `${body}""", System.Text.Encoding.UTF8, "application/json");`);
      lines.push(`var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.${method[0] + method.slice(1).toLowerCase()}, "${url}") { Content = content });`);
    } else {
      lines.push(`var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.${method[0] + method.slice(1).toLowerCase()}, "${url}"));`);
    }
    lines.push(`var data = await response.Content.ReadAsStringAsync();`);
    return { lang: "csharp", label: "C#", source: lines.join("\n") };
  },
};

/** Default languages when none configured. */
export const DEFAULT_CODE_SAMPLE_LANGS = ["curl", "javascript", "python"];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate code samples for an operation.
 *
 * @param langs - Which languages to generate. Defaults to curl, JS, Python.
 *                Use keys from the generator registry: curl, javascript,
 *                python, go, ruby, java, php, rust, csharp.
 */
export function generateCodeSamples(
  op: NormalizedOperation,
  serverUrl: string,
  langs: string[] = DEFAULT_CODE_SAMPLE_LANGS,
): CodeSample[] {
  // Spec-defined samples always win
  if (op.codeSamples?.length) return op.codeSamples;

  const url = `${serverUrl.replace(/\/$/, "")}${op.path}`;
  const method = op.method.toUpperCase();
  const hasBody = !!op.requestBody;
  const contentType = hasBody
    ? Object.keys(op.requestBody!.content)[0] ?? "application/json"
    : undefined;

  const bodyExample = hasBody ? getRequestBodyExample(op) : undefined;
  const body = bodyExample ? JSON.stringify(bodyExample, null, 2) : undefined;

  const req: RequestInfo = { url, method, contentType, body };

  return langs
    .map((lang) => generators[lang]?.(req))
    .filter((s): s is CodeSample => !!s);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRequestBodyExample(op: NormalizedOperation): unknown {
  const content = op.requestBody?.content;
  if (!content) return undefined;

  const mediaType = Object.values(content)[0];
  if (!mediaType) return undefined;

  if (mediaType.example !== undefined) return mediaType.example;
  if (mediaType.schema) return generateExample(mediaType.schema);
  return undefined;
}

function pythonDict(jsonStr: string): string {
  return jsonStr
    .replace(/: true/g, ": True")
    .replace(/: false/g, ": False")
    .replace(/: null/g, ": None");
}
