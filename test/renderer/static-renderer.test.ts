import { describe, it, expect } from "vitest";
import { renderPage } from "../../src/renderer/static-renderer.js";
import { buildNavFromSpec, buildSiteNavigation } from "../../src/core/navigation.js";
import type { NormalizedSpec } from "../../src/core/types.js";
import type { RenderOptions, CurrentPage, SiteConfig } from "../../src/renderer/context.js";

function createMinimalSpec(overrides?: Partial<NormalizedSpec>): NormalizedSpec {
  return {
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "A test API",
    },
    servers: [{ url: "https://api.test.com" }],
    tags: [],
    operations: [],
    schemas: {},
    securitySchemes: {},
    webhooks: [],
    ...overrides,
  };
}

const defaultOptions: RenderOptions = {
  embeddable: false,
  assetBase: "",
};

const defaultSite: SiteConfig = {
  name: "Test",
  theme: {
    preset: "default",
    colors: { primary: "99 102 241", light: "129 140 248", dark: "79 70 229" },
    fonts: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    },
    layout: { sidebar: "18rem", toc: "19rem", content: "44rem" },
    css: [],
  },
  codeSamples: ["curl", "javascript", "python"],
  navbar: { links: [] },
  footer: { links: [] },
};

function renderSpec(spec: NormalizedSpec, options: RenderOptions): string {
  const tab = buildNavFromSpec(spec, "api");
  tab.label = "API Reference";
  const navigation = buildSiteNavigation([tab]);
  const currentPage: CurrentPage = { kind: "spec", spec };
  return renderPage(spec, options, navigation, currentPage, defaultSite);
}

describe("renderPage (spec)", () => {
  it("renders a complete HTML document", () => {
    const html = renderSpec(createMinimalSpec(), defaultOptions);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("Test API");
    expect(html).toContain("API Reference");
    expect(html).toContain("sourcey.css");
  });

  it("includes sidebar navigation", () => {
    const html = renderSpec(createMinimalSpec(), defaultOptions);
    expect(html).toContain('id="sidebar"');
    expect(html).toContain('id="nav"');
    expect(html).toContain("Introduction");
  });

  it("renders operations in tags", () => {
    const spec = createMinimalSpec({
      tags: [
        {
          name: "Pets",
          description: "Pet operations",
          operations: [
            {
              method: "get",
              path: "/pets",
              summary: "List all pets",
              tags: ["Pets"],
              parameters: [],
              responses: [],
              security: [],
              deprecated: false,
            },
          ],
        },
      ],
      operations: [
        {
          method: "get",
          path: "/pets",
          summary: "List all pets",
          tags: ["Pets"],
          parameters: [],
          responses: [],
          security: [],
          deprecated: false,
        },
      ],
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("Pets");
    expect(html).toContain("List all pets");
    expect(html).toContain("operation-pets-get");
  });

  it("renders schema definitions", () => {
    const spec = createMinimalSpec({
      schemas: {
        Pet: {
          name: "Pet",
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
          },
          required: ["id", "name"],
        },
      },
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("Models");
    expect(html).toContain("definition-pet");
    expect(html).toContain("Pet");
  });

  it("renders security schemes in sidebar", () => {
    const spec = createMinimalSpec({
      securitySchemes: {
        api_key: {
          type: "apiKey",
          name: "X-API-Key",
          in: "header",
        },
      },
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("Authentication");
    expect(html).toContain("api_key");
  });

  it("renders server endpoints", () => {
    const spec = createMinimalSpec({
      servers: [
        { url: "https://api.example.com", description: "Production" },
        { url: "https://staging-api.example.com", description: "Staging" },
      ],
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("https://api.example.com");
    expect(html).toContain("Production");
  });
});
