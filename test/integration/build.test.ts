import { describe, it, expect } from "vitest";
import { buildDocs } from "../../src/index.js";
import { resolve } from "node:path";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("buildDocs (integration)", () => {
  it("builds from a Swagger 2.0 JSON spec", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore.json`,
      skipWrite: true,
    });

    expect(result.spec.info.title).toBe("Swagger Petstore");
    expect(result.spec.operations.length).toBeGreaterThan(0);
    expect(Object.keys(result.spec.schemas).length).toBeGreaterThan(0);
  });

  it("builds from a Swagger 2.0 YAML spec", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore-expanded.yml`,
      skipWrite: true,
    });

    expect(result.spec.operations.length).toBeGreaterThan(0);
  });

  it("builds from an OpenAPI 3.0 YAML spec", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore-openapi3.yaml`,
      skipWrite: true,
    });

    expect(result.spec.info.title).toBe("Petstore");
    expect(result.spec.operations.length).toBe(5);
  });

  it("builds from an OpenAPI 3.1 YAML spec", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/cheese.yml`,
      skipWrite: true,
    });

    expect(result.spec.info.title).toBe("Cheese Store");
    expect(result.spec.operations.length).toBe(20);
    expect(result.spec.tags.length).toBe(3);
    expect(Object.keys(result.spec.schemas).length).toBe(13);
    expect(result.spec.servers.length).toBe(3);
    expect(Object.keys(result.spec.securitySchemes).length).toBe(3);
  });

  it("handles OpenAPI 3.1 nullable types", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/cheese.yml`,
      skipWrite: true,
    });

    const cheese = result.spec.schemas["Cheese"];
    expect(cheese).toBeDefined();
    const origin = cheese.properties?.["origin"];
    expect(origin).toBeDefined();
    expect(origin!.nullable).toBe(true);
  });

  it("handles OpenAPI 3.1 oneOf schemas", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/cheese.yml`,
      skipWrite: true,
    });

    const customer = result.spec.schemas["Customer"];
    const favourite = customer.properties?.["favouriteCheese"];
    expect(favourite).toBeDefined();
    expect(favourite!.oneOf).toBeDefined();
    expect(favourite!.oneOf!.length).toBe(2);
  });

  it("uses custom output directory", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore-openapi3.yaml`,
      outputDir: "custom-output",
      skipWrite: true,
    });

    expect(result.outputDir).toBe(resolve("custom-output"));
  });

  it("rejects missing spec file", async () => {
    await expect(
      buildDocs({ specSource: "/nonexistent/spec.yml" }),
    ).rejects.toThrow();
  });

  it("renders HTML output to disk", async () => {
    const outputDir = resolve(import.meta.dirname, "../../.test-output");
    try {
      const result = await buildDocs({
        specSource: `${FIXTURES}/petstore-openapi3.yaml`,
        outputDir,
      });

      expect(result.pageCount).toBeGreaterThan(0);

      // Site writes a redirect index.html and api/index.html
      const indexHtml = await readFile(resolve(outputDir, "index.html"), "utf-8");
      expect(indexHtml).toContain("Redirecting");

      const apiHtml = await readFile(resolve(outputDir, "api/index.html"), "utf-8");
      expect(apiHtml).toContain("<!DOCTYPE html>");
      expect(apiHtml).toContain("Petstore");
      expect(apiHtml).toContain("API Reference");
      expect(apiHtml).toContain("sourcey.css");
      expect(apiHtml).toContain("sourcey.js");

      const css = await readFile(resolve(outputDir, "sourcey.css"), "utf-8");
      expect(css).toContain("#sourcey");

      const js = await readFile(resolve(outputDir, "sourcey.js"), "utf-8");
      expect(js).toContain("data-traverse-target");
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("renders OpenAPI 3.1 spec to HTML with all sections", async () => {
    const outputDir = resolve(import.meta.dirname, "../../.test-output-cheese");
    try {
      await buildDocs({
        specSource: `${FIXTURES}/cheese.yml`,
        outputDir,
      });

      const html = await readFile(resolve(outputDir, "api/index.html"), "utf-8");
      expect(html).toContain("Cheese Store");
      expect(html).toContain("Models");
      expect(html).toContain("operation-");
      expect(html).toContain('id="sidebar"');
      expect(html).toContain('id="nav"');
      expect(html).toContain("Authentication");
      expect(html).toContain("bearer");
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("generates embeddable output without html wrapper", async () => {
    const outputDir = resolve(import.meta.dirname, "../../.test-output-embed");
    try {
      await buildDocs({
        specSource: `${FIXTURES}/petstore-openapi3.yaml`,
        outputDir,
        embeddable: true,
      });

      const html = await readFile(resolve(outputDir, "api/index.html"), "utf-8");
      expect(html).not.toContain("<!DOCTYPE html>");
      expect(html).not.toContain("<html");
      expect(html).toContain("Petstore");
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
