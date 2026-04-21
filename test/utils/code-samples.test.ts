import { describe, expect, it } from "vitest";
import { generateCodeSamples } from "../../src/utils/code-samples.js";
import type { NormalizedOperation } from "../../src/core/types.js";

function createOperation(overrides?: Partial<NormalizedOperation>): NormalizedOperation {
  return {
    method: "query",
    path: "/search",
    summary: "Query search index",
    tags: [],
    parameters: [],
    responses: [],
    security: [],
    deprecated: false,
    ...overrides,
  };
}

describe("generateCodeSamples", () => {
  it("falls back to generic request APIs for non-standard HTTP methods", () => {
    const samples = generateCodeSamples(
      createOperation(),
      "https://api.example.com",
      ["python", "ruby", "rust", "csharp"],
    );

    expect(samples.find((sample) => sample.lang === "python")?.source).toContain(
      "requests.request('QUERY', 'https://api.example.com/search')",
    );
    expect(samples.find((sample) => sample.lang === "ruby")?.source).toContain(
      "Net::HTTPGenericRequest.new('QUERY'",
    );
    expect(samples.find((sample) => sample.lang === "rust")?.source).toContain(
      'client.request(reqwest::Method::from_bytes(b"QUERY").unwrap(), "https://api.example.com/search")',
    );
    expect(samples.find((sample) => sample.lang === "csharp")?.source).toContain(
      'new HttpMethod("QUERY")',
    );
  });
});
