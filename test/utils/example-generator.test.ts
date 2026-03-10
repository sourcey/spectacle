import { describe, it, expect } from "vitest";
import { generateExample } from "../../src/utils/example-generator.js";
import type { NormalizedSchema } from "../../src/core/types.js";

describe("generateExample", () => {
  it("uses explicit example", () => {
    const schema: NormalizedSchema = { type: "string", example: "hello" };
    expect(generateExample(schema)).toBe("hello");
  });

  it("uses default value", () => {
    const schema: NormalizedSchema = { type: "integer", default: 42 };
    expect(generateExample(schema)).toBe(42);
  });

  it("uses first enum value", () => {
    const schema: NormalizedSchema = { type: "string", enum: ["a", "b", "c"] };
    expect(generateExample(schema)).toBe("a");
  });

  it("generates object example from properties", () => {
    const schema: NormalizedSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
    };
    const result = generateExample(schema) as Record<string, unknown>;
    expect(result).toHaveProperty("name", "string");
    expect(result).toHaveProperty("age", 0);
  });

  it("generates array example from items", () => {
    const schema: NormalizedSchema = {
      type: "array",
      items: { type: "string" },
    };
    expect(generateExample(schema)).toEqual(["string"]);
  });

  it("handles format-specific strings", () => {
    expect(generateExample({ type: "string", format: "email" })).toBe(
      "user@example.com",
    );
    expect(generateExample({ type: "string", format: "date" })).toBe(
      "2024-01-15",
    );
    expect(generateExample({ type: "string", format: "uuid" })).toMatch(
      /^[0-9a-f-]+$/,
    );
  });

  it("handles boolean", () => {
    expect(generateExample({ type: "boolean" })).toBe(true);
  });

  it("handles null", () => {
    expect(generateExample({ type: "null" })).toBe(null);
  });

  it("detects circular references", () => {
    const schema: NormalizedSchema = {
      name: "Node",
      type: "object",
      properties: {
        child: { name: "Node", type: "object" },
      },
    };
    const result = generateExample(schema) as Record<string, unknown>;
    expect(result.child).toBe("[circular]");
  });

  it("handles anyOf by picking first", () => {
    const schema: NormalizedSchema = {
      anyOf: [
        { type: "string" },
        { type: "integer" },
      ],
    };
    expect(generateExample(schema)).toBe("string");
  });

  it("handles oneOf by picking first", () => {
    const schema: NormalizedSchema = {
      oneOf: [
        { type: "integer", example: 5 },
        { type: "string" },
      ],
    };
    expect(generateExample(schema)).toBe(5);
  });

  it("merges allOf examples", () => {
    const schema: NormalizedSchema = {
      allOf: [
        { type: "object", properties: { id: { type: "integer" } } },
        { type: "object", properties: { name: { type: "string" } } },
      ],
    };
    const result = generateExample(schema) as Record<string, unknown>;
    expect(result).toEqual({ id: 0, name: "string" });
  });
});
