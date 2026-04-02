import { defineConfig } from "sourcey";

export default defineConfig({
  name: "Mixed Docs",
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        slug: "",
        groups: [
          {
            group: "Getting Started",
            pages: ["introduction"],
          },
        ],
      },
      {
        tab: "API Reference",
        slug: "api",
        openapi: "../fixtures/petstore-openapi3.yaml",
      },
      {
        tab: "MCP Reference",
        slug: "mcp",
        mcp: "../fixtures/nitrosend.mcp.json",
      },
    ],
  },
});
