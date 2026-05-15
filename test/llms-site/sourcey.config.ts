import { defineConfig, markdown, mcp, openapi } from "sourcey";

export default defineConfig({
  name: "Mixed Docs",
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        slug: "",
        source: markdown({
          groups: [
            {
              group: "Getting Started",
              pages: ["introduction"],
            },
          ],
        }),
      },
      {
        tab: "API Reference",
        slug: "api",
        source: openapi("../fixtures/petstore-openapi3.yaml"),
      },
      {
        tab: "MCP Reference",
        slug: "mcp",
        source: mcp("../fixtures/nitrosend.mcp.json"),
      },
    ],
  },
});
