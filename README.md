# Sourcey

> Your API docs shouldn't depend on someone else's SaaS.

Sourcey is an open source documentation platform. Point it at an OpenAPI spec, an MCP server, a Doxygen XML directory, or a Go module; add markdown guides; get a complete docs site. Static HTML you own; no dashboard, no monthly bill, no API calls to render your own documentation. Deploy anywhere.

[![npm](https://img.shields.io/npm/v/sourcey)](https://www.npmjs.com/package/sourcey)
[![build](https://img.shields.io/github/actions/workflow/status/sourcey/sourcey/ci.yml?branch=main)](https://github.com/sourcey/sourcey/actions)
[![node](https://img.shields.io/node/v/sourcey)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/sourcey)](LICENSE)
[![Go Reference](https://pkg.go.dev/badge/github.com/sourcey/sourcey/go/sourcey-godoc.svg)](https://pkg.go.dev/github.com/sourcey/sourcey/go/sourcey-godoc)
[![Go Report Card](https://goreportcard.com/badge/github.com/sourcey/sourcey/go/sourcey-godoc)](https://goreportcard.com/report/github.com/sourcey/sourcey/go/sourcey-godoc)

```bash
npx sourcey init
```

![Sourcey](assets/hero-preview.jpg)

**[Live demo](https://cheesestore.github.io/)** · [Documentation](https://sourcey.com/docs) · [GitHub](https://github.com/sourcey/sourcey)

## Features

- **OpenAPI 2.0, 3.0, 3.1, and 3.2**: full spec coverage including `QUERY` operations, response summaries, hierarchical tags, `deviceAuthorization` OAuth, `querystring` parameters, and `$self`-aware refs for multi-document APIs
- **API reference from OpenAPI**: endpoints, parameters, request/response schemas, auto-generated code samples in 10 languages (cURL, JavaScript, TypeScript, Python, Go, Ruby, Java, PHP, Rust, C#)
- **MCP server documentation**: tools, resources, prompts rendered as browsable reference with JSON-RPC, TypeScript, and Python code samples. Color-coded method types, annotation badges, connection config cards
- **Markdown guides with rich components**: steps, cards, accordions, syntax-highlighted code blocks; prose docs alongside your API reference
- **C++ and Doxygen**: feed Doxygen XML output, get modern searchable API docs. No new parser, no four-tool Breathe/Exhale/Sphinx pipeline
- **Go and godoc**: native package documentation extracted from Go source via the toolchain. Render Go modules as Sourcey tabs, generate standalone static Go docs sites, or commit `godoc.json` snapshots for JS-only docs hosts. No Doxygen detour
- **llms.txt generation**: auto-generate llms.txt and llms-full.txt alongside your HTML. Docs serve developers and AI agents from one build
- **TypeScript config**: `sourcey.config.ts` with `defineConfig()` autocomplete; theme, navbar, CTA buttons, footer
- **Theme presets**: default (sidebar + TOC), minimal (single column), api-first (Stripe-style three column); colors, fonts, layout dimensions, and custom CSS on top
- **Vite dev server**: SSR hot reload on every component and CSS change; spec and markdown changes trigger instant refresh
- **Dark mode**: semantic design tokens, light/dark logo variants, localStorage persistence
- **Client-side search**: instant fuzzy search across all pages and API operations; Cmd+K
- **Static HTML output**: no framework runtime, no vendor lock-in. Deploy to GitHub Pages, Vercel, Netlify, S3, anywhere
- **Open source**: AGPL-3.0. Self-host, fork, extend. Your docs, your infrastructure

### Sourcey vs alternatives

| | Sourcey | Redocly | GitBook | Mintlify | Fern | ReadMe |
|---|---|---|---|---|---|---|
| Open source | Yes | Partial | No | No | No | No |
| Static output | Yes | Yes | No | No | No | No |
| Zero JS shipped | Yes | No | No | No | No | No |
| MCP server docs | Native | No | No | No | No | No |
| Doxygen / C++ docs | Native | No | No | No | No | No |
| godoc / Go docs | Native | No | No | No | No | No |
| Config format | TypeScript | YAML | GUI | JSON | YAML | GUI |
| Local preview | Vite SSR | Local | Hosted | Local | Local | Hosted |
| No account required | Yes | Partial | No | No | No | No |
| Self-hosted | Yes | Yes | No | No | Yes | No |
| Pricing | Free | $10–$24 | $65–$249 | $250+ | $150+ | $79–$3,000+ |

## Install

### Sourcey

```bash
npm install -g sourcey
npx sourcey init
```

### Go docs generator

```bash
go install github.com/sourcey/sourcey/go/sourcey-godoc/cmd/sourcey-godoc@latest
```

### Homebrew

```bash
brew tap sourcey/tap
brew install sourcey-godoc
```

### Scoop

```powershell
scoop bucket add sourcey https://github.com/sourcey/scoop-bucket
scoop install sourcey-godoc
```

## Quick start

```bash
# From a single OpenAPI spec
sourcey build api.yaml -o docs/

# Multi-page site (reads sourcey.config.ts)
sourcey build -o docs/

# Dev server with hot reload
sourcey dev
```

## Configuration

Create `sourcey.config.ts` in your project root:

```typescript
import { defineConfig } from "sourcey";

export default defineConfig({
  name: "My API",
  theme: {
    preset: "default",  // "default" | "minimal" | "api-first"
    colors: {
      primary: "#6366F1",
      light: "#818CF8",
      dark: "#4F46E5",
    },
  },
  logo: "./logo.png",
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        groups: [
          {
            group: "Getting Started",
            pages: ["introduction", "quickstart", "authentication"],
          },
        ],
      },
      {
        tab: "API Reference",
        openapi: "./openapi.yaml",
      },
      {
        tab: "MCP Server",
        mcp: "./mcp.json",
      },
    ],
  },
  navbar: {
    links: [{ type: "github", href: "https://github.com/you/repo" }],
    primary: { type: "button", label: "Dashboard", href: "https://app.example.com" },
  },
  footer: {
    socials: { github: "https://github.com/you/repo" },
  },
});
```

Each tab is an `openapi` spec, an `mcp` snapshot, a `doxygen` directory, a `godoc` Go module, or `groups` of markdown pages. Pages are referenced by slug (e.g. `"quickstart"` resolves to `quickstart.md`).

### Go documentation (godoc)

Add a Go module as a tab and Sourcey extracts package docs natively (no Doxygen pipeline):

```typescript
{
  tab: "Go API",
  godoc: {
    module: ".",
    packages: ["./internal/core/...", "./cmd/..."],
    // mode: "auto"   // default; live when Go is available, snapshot otherwise
    // includeTests: true       // examples from *_test.go (default)
    // includeUnexported: false // hide unexported symbols (default)
  },
}
```

The string shorthand is `godoc: "."` and expands to `{ module: ".", packages: ["./..."], mode: "auto", includeTests: true }`.

Live mode invokes `go list` + `go/parser` + `go/doc` against the host Go toolchain. To pin a build environment for reproducibility, set `goEnv: { GOOS, GOARCH, tags }`.

Snapshot mode reads a committed `godoc.json` and needs no Go on the build host. Generate it with:

```bash
sourcey godoc --module . --packages './...' --out docs/godoc.json
```

then point the tab at it:

```typescript
{
  tab: "Go API",
  godoc: { mode: "snapshot", snapshot: "./docs/godoc.json" },
}
```

The extractor is also a standalone Go CLI for projects that want a native Go
docs generator without installing the full Sourcey npm package:

```bash
go install github.com/sourcey/sourcey/go/sourcey-godoc/cmd/sourcey-godoc@latest
sourcey-godoc generate --module . --packages './...' --out site
sourcey-godoc snapshot --module . --packages './...' --out docs/godoc.json
```

### Markdown components

Guides support rich components in standard markdown:

```markdown
<Steps>
  <Step title="Install">Run `npm install sourcey`</Step>
  <Step title="Configure">Create `sourcey.config.ts`</Step>
  <Step title="Build">Run `sourcey build`</Step>
</Steps>

<CardGroup cols={2}>
  <Card title="API Reference" icon="book" href="/api">Full endpoint docs</Card>
  <Card title="Guides" icon="map" href="/docs">Step-by-step tutorials</Card>
</CardGroup>

<AccordionGroup>
  <Accordion title="How does auth work?">We use API keys and OAuth2.</Accordion>
</AccordionGroup>
```

### Theme

All visual configuration lives under `theme`. Colors, fonts, layout dimensions, and a preset that controls page structure:

```typescript
theme: {
  preset: "api-first",
  colors: { primary: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
  fonts: { sans: "'Lexend', sans-serif", mono: "'Fira Code', monospace" },
  layout: { sidebar: "16rem", content: "48rem" },
  css: ["./brand.css"],
}
```

Presets control layout structure: `"default"` (sidebar + TOC), `"minimal"` (single centered column), `"api-first"` (three-column with persistent code panels). Everything else applies on top.

## CLI

```bash
sourcey dev                       Dev server (reads sourcey.config.ts)
sourcey build                     Build site (reads sourcey.config.ts)
sourcey build api.yaml            Quick build from a single spec
sourcey validate api.yaml         Validate a spec file
sourcey godoc --out godoc.json    Snapshot a Go module's docs to JSON
sourcey-godoc generate --out site Standalone Go CLI for static godoc sites
```

| Command | Flag | Description |
| --- | --- | --- |
| `build` | `--output, -o` | Output directory (default: `dist`) |
| `build` | `--embed, -e` | Embeddable output (no html/body wrapper) |
| `build` | `--quiet, -q` | Suppress output |
| `dev` | `--port, -p` | Dev server port (default: `4400`) |

## Development

```bash
git clone https://github.com/sourcey/sourcey.git
cd sourcey && npm install
npm run build && npm test
cd go/sourcey-godoc && go test ./... && go vet ./...

# Run the demo site
cd demo && npx tsx ../src/cli.ts dev
```

## License

[AGPL-3.0](LICENSE). Free to use, self-host, and modify. If you run Sourcey as a hosted service, you open-source your stack.

Commercial licensing available; contact [sourcey.com](https://sourcey.com).
