import { describe, it, expect } from "vitest";
import { resolveInternalLinks } from "../../src/index.js";
import type { ResolvedConfig } from "../../src/config.js";
import type { SitePage } from "../../src/renderer/html-builder.js";

const EMPTY_SPEC = {
  info: { title: "", version: "", description: "" },
  servers: [],
  tags: [],
  operations: [],
  schemas: {},
  securitySchemes: {},
  webhooks: [],
};

describe("resolveInternalLinks", () => {
  it("rewrites module-guide links to aliased API reference pages", () => {
    const pages: SitePage[] = [
      {
        outputPath: "documentation/modules/base.html",
        currentPage: {
          kind: "markdown",
          markdown: {
            title: "Base Module",
            description: "",
            slug: "modules/base",
            html: '<p><a href="../api/base.md">API Reference</a> <a href="../concepts/runtime-contracts.md">Runtime Contracts</a></p>',
            headings: [],
            sourcePath: "modules/base.md",
            editPath: "modules/base.md",
          },
        },
        spec: EMPTY_SPEC,
        tabSlug: "documentation",
        pageSlug: "modules/base",
      },
      {
        outputPath: "documentation/concepts/runtime-contracts.html",
        currentPage: {
          kind: "markdown",
          markdown: {
            title: "Runtime Contracts",
            description: "",
            slug: "concepts/runtime-contracts",
            html: "<p>Contracts</p>",
            headings: [],
            sourcePath: "concepts/runtime-contracts.md",
            editPath: "concepts/runtime-contracts.md",
          },
        },
        spec: EMPTY_SPEC,
        tabSlug: "documentation",
        pageSlug: "concepts/runtime-contracts",
      },
      {
        outputPath: "api-reference/base.html",
        currentPage: {
          kind: "markdown",
          markdown: {
            title: "base",
            description: "",
            slug: "base",
            html: "<p>API reference</p>",
            headings: [],
            sourcePath: "api/base.md",
            editPath: "api/base.md",
          },
        },
        spec: EMPTY_SPEC,
        tabSlug: "api-reference",
        pageSlug: "base",
      },
    ];

    resolveInternalLinks(pages, {} as ResolvedConfig);

    expect(pages[0].currentPage.markdown?.html).toContain('href="../../api-reference/base.html"');
    expect(pages[0].currentPage.markdown?.html).toContain('href="../../documentation/concepts/runtime-contracts.html"');
  });
});
