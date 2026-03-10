import { describe, it, expect } from "vitest";
import { htmlId } from "../../src/utils/html-id.js";

describe("htmlId", () => {
  it("converts simple strings", () => {
    expect(htmlId("Pet")).toBe("pet");
    expect(htmlId("my-path")).toBe("my-path");
  });

  it("replaces special characters with hyphens", () => {
    expect(htmlId("/pets/{petId}")).toBe("pets-petid");
  });

  it("strips leading/trailing hyphens", () => {
    expect(htmlId("/hello/")).toBe("hello");
  });

  it("collapses multiple special chars", () => {
    expect(htmlId("a  b--c")).toBe("a-b-c");
  });

  it("handles empty string", () => {
    expect(htmlId("")).toBe("");
  });
});
