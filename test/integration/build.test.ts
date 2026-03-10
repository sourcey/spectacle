import { describe, it, expect } from "vitest";
import { buildDocs } from "../../src/index.js";
import { resolve } from "node:path";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("buildDocs (integration)", () => {
  it("builds from a Swagger 2.0 YAML spec", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/cheese.yml`,
      skipWrite: true,
    });

    expect(result.spec.info.title).toBe("Cheese Store");
    expect(result.spec.operations.length).toBeGreaterThan(0);
    expect(result.spec.tags.length).toBeGreaterThan(0);
    expect(Object.keys(result.spec.schemas).length).toBeGreaterThan(0);
    expect(result.outputDir).toBe("dist");
  });

  it("builds from an OpenAPI 3.0 YAML spec", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore-openapi3.yaml`,
      skipWrite: true,
    });

    expect(result.spec.info.title).toBe("Petstore");
    expect(result.spec.operations.length).toBe(5);
  });

  it("applies custom logo override", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore-openapi3.yaml`,
      logo: "/custom/logo.png",
      skipWrite: true,
    });

    expect(result.spec.info.logo).toBe("/custom/logo.png");
  });

  it("uses custom output directory", async () => {
    const result = await buildDocs({
      specSource: `${FIXTURES}/petstore-openapi3.yaml`,
      outputDir: "custom-output",
      skipWrite: true,
    });

    expect(result.outputDir).toBe("custom-output");
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

      expect(result.htmlPath).toBeDefined();
      expect(existsSync(result.htmlPath!)).toBe(true);

      const html = await readFile(result.htmlPath!, "utf-8");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Petstore");
      expect(html).toContain("API Reference");
      expect(html).toContain("spectacle.css");
      expect(html).toContain("spectacle.js");

      // Check CSS was written
      const css = await readFile(resolve(outputDir, "spectacle.css"), "utf-8");
      expect(css).toContain("#spectacle");

      // Check JS was written
      const js = await readFile(resolve(outputDir, "spectacle.js"), "utf-8");
      expect(js).toContain("data-traverse-target");
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("renders Swagger 2.0 spec to HTML with all sections", async () => {
    const outputDir = resolve(import.meta.dirname, "../../.test-output-cheese");
    try {
      const result = await buildDocs({
        specSource: `${FIXTURES}/cheese.yml`,
        outputDir,
      });

      const html = await readFile(result.htmlPath!, "utf-8");
      expect(html).toContain("Cheese Store");
      expect(html).toContain("Models");
      // Should contain operations
      expect(html).toContain("operation-");
      // Should contain sidebar navigation
      expect(html).toContain('id="sidebar"');
      expect(html).toContain('id="nav"');
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("generates embeddable output without html wrapper", async () => {
    const outputDir = resolve(import.meta.dirname, "../../.test-output-embed");
    try {
      const result = await buildDocs({
        specSource: `${FIXTURES}/petstore-openapi3.yaml`,
        outputDir,
        embeddable: true,
      });

      const html = await readFile(result.htmlPath!, "utf-8");
      expect(html).not.toContain("<!DOCTYPE html>");
      expect(html).not.toContain("<html");
      expect(html).toContain("Petstore");
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
