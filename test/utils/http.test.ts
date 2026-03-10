import { describe, it, expect } from "vitest";
import { httpStatusText, schemaRange } from "../../src/utils/http.js";

describe("httpStatusText", () => {
  it("returns known status text", () => {
    expect(httpStatusText("200")).toBe("OK");
    expect(httpStatusText("404")).toBe("Not Found");
    expect(httpStatusText("500")).toBe("Internal Server Error");
  });

  it("returns empty string for unknown codes", () => {
    expect(httpStatusText("999")).toBe("");
  });
});

describe("schemaRange", () => {
  it("formats min/max range", () => {
    expect(schemaRange({ minimum: 0, maximum: 100 })).toBe("[0, 100]");
  });

  it("handles exclusive minimum (boolean)", () => {
    expect(
      schemaRange({ minimum: 0, maximum: 100, exclusiveMinimum: true }),
    ).toBe("(0, 100]");
  });

  it("handles exclusive maximum (boolean)", () => {
    expect(
      schemaRange({ minimum: 0, maximum: 100, exclusiveMaximum: true }),
    ).toBe("[0, 100)");
  });

  it("handles exclusive minimum (number, OpenAPI 3.1)", () => {
    expect(
      schemaRange({ minimum: 0, maximum: 100, exclusiveMinimum: 0 }),
    ).toBe("(0, 100]");
  });

  it("returns undefined when no range", () => {
    expect(schemaRange({})).toBeUndefined();
  });
});
