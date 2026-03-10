import { describe, it, expect } from "vitest";
import { loadSpec } from "../../src/core/loader.js";
import { parseSpec } from "../../src/core/parser.js";
import { convertToOpenApi3 } from "../../src/core/converter.js";
import { resolve } from "node:path";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("convertToOpenApi3", () => {
  it("converts a Swagger 2.0 spec to OpenAPI 3.0", async () => {
    const loaded = await loadSpec(`${FIXTURES}/petstore-expanded.yml`);
    const parsed = await parseSpec(loaded);
    const result = await convertToOpenApi3(parsed);

    expect(result.document.openapi).toMatch(/^3\./);
    expect(result.document.info).toBeDefined();
    expect(result.document.paths).toBeDefined();
  });

  it("passes through an OpenAPI 3.0 spec unchanged", async () => {
    const loaded = await loadSpec(`${FIXTURES}/petstore-openapi3.yaml`);
    const parsed = await parseSpec(loaded);
    const result = await convertToOpenApi3(parsed);

    expect(result.document.openapi).toBe("3.0.3");
    expect(result).toBe(parsed); // Same reference, no conversion
  });

  it("preserves API info during conversion", async () => {
    const loaded = await loadSpec(`${FIXTURES}/cheese.yml`);
    const parsed = await parseSpec(loaded);
    const result = await convertToOpenApi3(parsed);

    const info = result.document.info as Record<string, unknown>;
    expect(info.title).toBe("Cheese Store");
  });

  it("converts paths and operations", async () => {
    const loaded = await loadSpec(`${FIXTURES}/cheese.yml`);
    const parsed = await parseSpec(loaded);
    const result = await convertToOpenApi3(parsed);

    expect(result.document.paths).toBeDefined();
    const paths = Object.keys(result.document.paths!);
    expect(paths.length).toBeGreaterThan(0);
  });
});
