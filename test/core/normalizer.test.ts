import { describe, it, expect } from "vitest";
import { loadSpec } from "../../src/core/loader.js";
import { convertToOpenApi3 } from "../../src/core/converter.js";
import { parseSpec } from "../../src/core/parser.js";
import { normalizeSpec } from "../../src/core/normalizer.js";
import { resolve } from "node:path";
import type { NormalizedSpec } from "../../src/core/types.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

async function loadAndNormalize(fixture: string): Promise<NormalizedSpec> {
  const loaded = await loadSpec(`${FIXTURES}/${fixture}`);
  const parsed = await parseSpec(loaded);
  const converted = await convertToOpenApi3(parsed);
  return normalizeSpec(converted);
}

describe("normalizeSpec", () => {
  describe("cheese.yml (Swagger 2.0 with external refs)", () => {
    let spec: NormalizedSpec;

    it("loads and normalizes without errors", async () => {
      spec = await loadAndNormalize("cheese.yml");
      expect(spec).toBeDefined();
    });

    it("extracts API info", () => {
      expect(spec.info.title).toBe("Cheese Store");
      expect(spec.info.version).toBeDefined();
      expect(spec.info.description).toBeDefined();
    });

    it("extracts operations from paths", () => {
      expect(spec.operations.length).toBeGreaterThan(0);
      for (const op of spec.operations) {
        expect(op.method).toBeDefined();
        expect(op.path).toBeDefined();
      }
    });

    it("assigns operations to tags", () => {
      expect(spec.tags.length).toBeGreaterThan(0);
      const tagWithOps = spec.tags.find((t) => t.operations.length > 0);
      expect(tagWithOps).toBeDefined();
    });

    it("creates implicit tags for unregistered tag names", () => {
      for (const op of spec.operations) {
        if (op.hidden) continue;
        const opTags = op.tags.length > 0 ? op.tags : ["default"];
        for (const tagName of opTags) {
          const tag = spec.tags.find((t) => t.name === tagName);
          expect(tag, `Tag "${tagName}" should exist`).toBeDefined();
          expect(tag!.operations).toContain(op);
        }
      }
    });

    it("extracts schemas/definitions", () => {
      expect(Object.keys(spec.schemas).length).toBeGreaterThan(0);
    });

    it("normalizes parameters with dedup", () => {
      for (const op of spec.operations) {
        const seen = new Set<string>();
        for (const p of op.parameters) {
          const key = `${p.in}:${p.name}`;
          expect(seen.has(key), `Duplicate param: ${key}`).toBe(false);
          seen.add(key);
        }
      }
    });

    it("normalizes responses", () => {
      const opWithResponses = spec.operations.find(
        (op) => op.responses.length > 0,
      );
      expect(opWithResponses).toBeDefined();
      for (const r of opWithResponses!.responses) {
        expect(r.statusCode).toBeDefined();
        expect(r.description).toBeDefined();
      }
    });
  });

  describe("petstore-openapi3.yaml (OpenAPI 3.0)", () => {
    let spec: NormalizedSpec;

    it("loads and normalizes without errors", async () => {
      spec = await loadAndNormalize("petstore-openapi3.yaml");
      expect(spec).toBeDefined();
    });

    it("extracts servers", () => {
      expect(spec.servers.length).toBe(2);
      expect(spec.servers[0].url).toContain("petstore.example.com");
    });

    it("extracts operations", () => {
      expect(spec.operations.length).toBe(5); // listPets, createPet, getPet, deletePet, getInventory
    });

    it("extracts request bodies", () => {
      const createPet = spec.operations.find((op) => op.operationId === "createPet");
      expect(createPet).toBeDefined();
      expect(createPet!.requestBody).toBeDefined();
      expect(createPet!.requestBody!.content["application/json"]).toBeDefined();
    });

    it("extracts security schemes", () => {
      expect(spec.securitySchemes.apiKey).toBeDefined();
      expect(spec.securitySchemes.apiKey.type).toBe("apiKey");
      expect(spec.securitySchemes.apiKey.in).toBe("header");
    });

    it("marks deprecated operations", () => {
      const deletePet = spec.operations.find((op) => op.operationId === "deletePet");
      expect(deletePet).toBeDefined();
      expect(deletePet!.deprecated).toBe(true);
    });

    it("merges path-level and operation-level parameters", () => {
      const getPet = spec.operations.find((op) => op.operationId === "getPet");
      expect(getPet).toBeDefined();
      // petId comes from path-level parameters
      const petIdParam = getPet!.parameters.find((p) => p.name === "petId");
      expect(petIdParam).toBeDefined();
      expect(petIdParam!.in).toBe("path");
      expect(petIdParam!.required).toBe(true);
    });

    it("normalizes schema types", () => {
      for (const [, schema] of Object.entries(spec.schemas)) {
        if (schema.type) {
          expect(
            typeof schema.type === "string" || Array.isArray(schema.type),
          ).toBe(true);
        }
      }
    });

    it("extracts tags with descriptions", () => {
      const petsTag = spec.tags.find((t) => t.name === "pets");
      expect(petsTag).toBeDefined();
      expect(petsTag!.description).toBe("Pet operations");
      expect(petsTag!.operations.length).toBe(4); // listPets, createPet, getPet, deletePet
    });
  });

  describe("nullable handling", () => {
    it("normalizes schemas with nullable flag", async () => {
      const spec = await loadAndNormalize("petstore-openapi3.yaml");
      for (const [, schema] of Object.entries(spec.schemas)) {
        expect(typeof schema.nullable).toBe("boolean");
      }
    });
  });

  describe("servers fallback", () => {
    it("provides default server when none specified", async () => {
      const spec = await loadAndNormalize("petstore-expanded.yml");
      expect(spec.servers.length).toBeGreaterThan(0);
    });
  });

  it("normalizes OpenAPI 3.2 query methods, response summaries, and device authorization flows", async () => {
    const spec = await loadAndNormalize("openapi-3.2.yaml");

    const queryOp = spec.operations.find((op) => op.operationId === "querySearch");
    expect(queryOp).toBeDefined();
    expect(queryOp!.method).toBe("query");

    const successResponse = queryOp!.responses.find((r) => r.statusCode === "200");
    expect(successResponse).toBeDefined();
    expect(successResponse!.summary).toBe("Search results");
    expect(successResponse!.description).toBe("Returns ranked matches.");

    const oauth = spec.securitySchemes.oauth;
    expect(oauth).toBeDefined();
    expect(oauth.type).toBe("oauth2");
    expect(oauth.flows?.deviceAuthorization).toBeDefined();
    expect(oauth.flows?.deviceAuthorization?.deviceAuthorizationUrl).toBe("https://example.com/oauth/device");
    expect(oauth.flows?.deviceAuthorization?.tokenUrl).toBe("https://example.com/oauth/token");
  });

  it("preserves rich OpenAPI 3.2 metadata for tags, encodings, path items, and security schemes", async () => {
    const spec = await loadAndNormalize("openapi-3.2-rich.yaml");

    expect(spec.info.summary).toBe("Search and indexing endpoints");

    const adminTag = spec.tags.find((tag) => tag.name === "admin");
    expect(adminTag).toBeDefined();
    expect(adminTag!.summary).toBe("Administration");
    expect(adminTag!.kind).toBe("audience");

    const childTag = spec.tags.find((tag) => tag.name === "admin-index");
    expect(childTag).toBeDefined();
    expect(childTag!.summary).toBe("Index Management");
    expect(childTag!.parent).toBe("admin");
    expect(childTag!.kind).toBe("nav");

    const queryOp = spec.operations.find((op) => op.operationId === "querySearch");
    expect(queryOp).toBeDefined();
    expect(queryOp!.method).toBe("query");

    const querystringParam = queryOp!.parameters.find((param) => param.in === "querystring");
    expect(querystringParam).toBeDefined();
    expect(querystringParam!.content?.["application/x-www-form-urlencoded"]).toBeDefined();
    expect(querystringParam!.content?.["application/x-www-form-urlencoded"]?.encoding?.facets?.explode).toBe(false);

    const createIndex = spec.operations.find((op) => op.operationId === "createIndex");
    expect(createIndex).toBeDefined();
    expect(createIndex!.requestBody?.content["application/x-www-form-urlencoded"]?.encoding?.filter?.contentType).toBe("application/json");
    expect(createIndex!.requestBody?.content["multipart/mixed"]?.prefixEncoding?.[0]?.headers?.["X-Part-Id"]?.required).toBe(true);
    expect(createIndex!.requestBody?.content["multipart/mixed"]?.itemEncoding?.contentType).toBe("text/plain");

    const oauth = spec.securitySchemes.oauth;
    expect(oauth).toBeDefined();
    expect(oauth.deprecated).toBe(true);
    expect(oauth.oauth2MetadataUrl).toBe("https://example.com/.well-known/oauth-authorization-server");
  });
});
