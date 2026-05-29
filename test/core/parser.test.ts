import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadSpec } from "../../src/core/loader.js";
import { parseSpec } from "../../src/core/parser.js";
import type { LoadedSpec } from "../../src/core/types.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("parseSpec", () => {
  it("resolves relative refs against $self when present", async () => {
    const loaded = await loadSpec(`${FIXTURES}/self-base/entry.yaml`);
    const parsed = await parseSpec(loaded);

    expect(parsed.document.paths?.["/pets"]?.get).toBeDefined();
    expect(parsed.document.paths?.["/pets"]?.get?.operationId).toBe("listPets");
  });

  it("rejects remote refs by default", async () => {
    const loaded = createLoadedSpec({
      components: {
        schemas: {
          Secret: { $ref: "http://169.254.169.254/latest/meta-data" },
        },
      },
    });

    await expect(parseSpec(loaded)).rejects.toThrow("Failed to parse OpenAPI spec");
  });

  it("rejects local refs outside the spec directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "sourcey-parser-"));
    try {
      const specDir = join(root, "spec");
      await mkdir(specDir);
      await writeFile(
        join(root, "secret.yaml"),
        "components:\n  schemas:\n    Secret:\n      type: object\n",
      );

      const loaded = createLoadedSpec(
        {
          components: {
            schemas: {
              Secret: { $ref: "../secret.yaml#/components/schemas/Secret" },
            },
          },
        },
        join(specDir, "openapi.yaml"),
      );

      await expect(parseSpec(loaded)).rejects.toThrow("Failed to parse OpenAPI spec");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stamps dereferenced schemas with their ref name", async () => {
    const root = await mkdtemp(join(tmpdir(), "sourcey-parser-"));
    try {
      const specDir = join(root, "spec");
      await mkdir(specDir);
      await writeFile(
        join(specDir, "schemas.yaml"),
        "components:\n  schemas:\n    Pet:\n      type: object\n      properties:\n        name:\n          type: string\n",
      );

      const loaded = createLoadedSpec(
        {
          components: {
            schemas: {
              PetResponse: { $ref: "./schemas.yaml#/components/schemas/Pet" },
            },
          },
        },
        join(specDir, "openapi.yaml"),
      );

      const parsed = await parseSpec(loaded);
      expect(parsed.document.components?.schemas?.PetResponse).toMatchObject({
        "x-ref-name": "Pet",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function createLoadedSpec(
  extra: Record<string, unknown>,
  source = resolve("/tmp/openapi.yaml"),
): LoadedSpec {
  return {
    raw: {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      ...extra,
    },
    format: "yaml",
    version: "openapi-3.1",
    source,
  };
}
