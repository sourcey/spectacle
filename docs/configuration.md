---
title: Configuration
description: Set up Sourcey with TypeScript config, page groups, and reference tabs.
---

# Configuration

Sourcey reads `sourcey.config.ts` from your project and keeps the structure explicit. Tabs can point at Markdown groups, OpenAPI specs, MCP snapshots, or Doxygen output.

```ts
import { defineConfig } from "sourcey";

export default defineConfig({
  name: "My API",
  navigation: {
    tabs: [
      {
        tab: "Docs",
        slug: "",
        groups: [
          {
            group: "Getting Started",
            pages: ["introduction", "quickstart"],
          },
        ],
      },
      {
        tab: "API Reference",
        slug: "api",
        openapi: "./openapi.yaml",
      },
      {
        tab: "MCP Reference",
        slug: "mcp",
        mcp: "./mcp.json",
      },
    ],
  },
});
```

## Themes

Sourcey ships `default`, `minimal`, and `api-first` presets. Theme settings let you set brand colours, fonts, layout, and extra CSS without giving up a deterministic static build.

## Build flow

```bash
sourcey build
sourcey dev
```

`build` produces the static site. `dev` runs the Vite-backed preview server with config and content reloads.
