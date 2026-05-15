---
title: Configuration
description: Set up Sourcey with TypeScript config, page groups, and reference tabs.
---

# Configuration

Sourcey reads `sourcey.config.ts` from your project and keeps the structure explicit. Each tab has one `source`, usually created with `markdown()`, `mkdocs()`, `openapi()`, `mcp()`, `doxygen()`, or `godoc()`.

```ts
import { defineConfig, doxygen, markdown, mcp, mkdocs, openapi } from "sourcey";

export default defineConfig({
  name: "My API",
  navigation: {
    tabs: [
      {
        tab: "Docs",
        slug: "",
        source: markdown({
          groups: [
            {
              group: "Getting Started",
              pages: ["introduction", "quickstart"],
            },
          ],
        }),
      },
      {
        tab: "MkDocs",
        source: mkdocs("./mkdocs.yml"),
      },
      {
        tab: "API Reference",
        slug: "api",
        source: openapi("./openapi.yaml"),
      },
      {
        tab: "MCP Reference",
        slug: "mcp",
        source: mcp("./mcp.json"),
      },
      {
        tab: "C++ Reference",
        slug: "cpp",
        source: doxygen({
          xml: "./build/doxygen/xml",
          language: "cpp",
          index: "rich",
          sourceUrl: [
            { prefix: "third_party/private/" },
            { prefix: "", url: "https://github.com/acme/project/blob/main/{fullPath}" },
          ],
        }),
      },
    ],
  },
});
```

`doxygen().sourceUrl` accepts a base URL string, a resolver function, or a
route map. Route maps use longest-prefix matching. `{path}` expands to the path
after the matched prefix, `{fullPath}` expands to the original Doxygen path,
and `{line}` expands to the source line. A route without `url` suppresses the
public link while generated pages still show `Defined in path:line`.

## Themes

Sourcey ships `default`, `minimal`, and `api-first` presets. Theme settings let you set brand colours, fonts, layout, and extra CSS without giving up a deterministic static build.

## Build flow

```bash
sourcey build
sourcey dev
```

`build` produces the static site. `dev` runs the Vite-backed preview server with config and content reloads.
