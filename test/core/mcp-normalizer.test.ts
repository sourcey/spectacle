import { describe, expect, it } from "vitest";
import { normalizeMcpSpec } from "../../src/core/mcp-normalizer.js";
import type { McpSpec } from "mcp-parser";

describe("normalizeMcpSpec", () => {
  it("renders nested tool inputs as a body instead of duplicate parameters", () => {
    const spec = normalizeMcpSpec(
      createSpec({
        tools: [
          {
            name: "search_contacts",
            description: "Search contacts.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search term" },
                filters: {
                  type: "object",
                  properties: {
                    country: { type: "string" },
                  },
                },
              },
              required: ["query"],
            },
          },
        ],
      }),
    );

    const op = spec.operations[0];
    expect(op.parameters).toEqual([]);
    expect(op.requestBody?.content["application/json"].schema?.properties?.query).toBeDefined();
    expect(op.requestBody?.content["application/json"].schema?.properties?.filters).toBeDefined();
  });

  it("renders flat tool inputs as parameters", () => {
    const spec = normalizeMcpSpec(
      createSpec({
        tools: [
          {
            name: "get_contact",
            inputSchema: {
              type: "object",
              properties: {
                email: { type: "string" },
              },
              required: ["email"],
            },
          },
        ],
      }),
    );

    const op = spec.operations[0];
    expect(op.parameters.map((param) => param.name)).toEqual(["email"]);
    expect(op.requestBody).toBeUndefined();
  });
});

function createSpec(overrides: Partial<McpSpec>): McpSpec {
  return {
    mcpSpec: "0.2.0",
    mcpVersion: "2025-11-25",
    server: { name: "test", version: "1.0.0" },
    tools: [],
    resources: [],
    resourceTemplates: [],
    prompts: [],
    ...overrides,
  } as unknown as McpSpec;
}
