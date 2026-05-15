import { defineConfig, mcp } from "sourcey";

export default defineConfig({
  name: "Nitrosend MCP",
  theme: {
    preset: "default",
    colors: { primary: "#6366f1" },
  },
  navigation: {
    tabs: [
      {
        tab: "MCP Reference",
        slug: "",
        source: mcp("../fixtures/nitrosend.mcp.json"),
      },
    ],
  },
});
