import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { loadSpec } from "../../src/core/loader.js";
import { parseSpec } from "../../src/core/parser.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("parseSpec", () => {
  it("resolves relative refs against $self when present", async () => {
    const loaded = await loadSpec(`${FIXTURES}/self-base/entry.yaml`);
    const parsed = await parseSpec(loaded);

    expect(parsed.document.paths?.["/pets"]?.get).toBeDefined();
    expect(parsed.document.paths?.["/pets"]?.get?.operationId).toBe("listPets");
  });
});
