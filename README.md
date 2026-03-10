# Spectacle

> The gentleman at REST

Spectacle generates beautiful static HTML documentation from [OpenAPI](https://openapis.org) / [Swagger](http://swagger.io) specifications.

The goal of Spectacle is to help you **save time and look good** by auto generating your API docs from your spec. The output is a clean three-column layout inspired by [Stripe](https://stripe.com/docs/api) — a fixed sidebar, documentation on the left, and code examples on the right.

Supports **OpenAPI 3.0**, **OpenAPI 3.1**, and **Swagger 2.0** (auto-converted).

---

## Features

- **OpenAPI 3.x + Swagger 2.0** — full support, with automatic Swagger-to-OpenAPI conversion
- **Beautiful three-column layout** — sidebar navigation, docs, and dark code panel
- **Dark mode** — toggle with a button, respects system preference, persists with localStorage
- **Client-side search** — `/` or `Ctrl+K` to search endpoints and models instantly
- **Auto-generated code samples** — cURL, JavaScript (fetch), and Python (requests) for every operation
- **Synced language tabs** — switch language in one example, all others follow
- **Shiki syntax highlighting** — VS Code-quality highlighting at build time
- **Markdown descriptions** — full markdown rendering in all description fields
- **Dev server with live reload** — `spectacle dev` watches your spec and reloads the browser
- **Theming** — override any CSS variable via `spectacle.json` — colors, fonts, spacing
- **Custom branding** — logo and favicon via config
- **Embeddable output** — generate partial HTML for embedding into your own site
- **Zero client-side dependencies** — no frameworks shipped to the browser

## Quick Start

Install Spectacle:

```bash
npm install -g spectacle-docs
```

Generate docs from your spec:

```bash
spectacle build your_api.yaml -o docs/
```

That's it. Open `docs/index.html` in your browser.

## CLI

```
spectacle build <spec> [options]    Build static documentation
spectacle dev <spec> [options]      Start dev server with live reload
spectacle validate <spec>           Validate a spec file
spectacle <spec>                    Shorthand for 'spectacle build'
```

### Build options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--output <dir>` | `-o`, `-t` | Output directory | `dist` |
| `--logo <file>` | `-l` | Custom logo image | — |
| `--single-file` | `-1` | Embed all assets into a single HTML file | `false` |
| `--embed` | `-e` | Omit `<html>`/`<body>` tags for embedding | `false` |
| `--quiet` | `-q` | Suppress output | `false` |

### Dev server options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--port <port>` | `-p` | Port to listen on | `4400` |
| `--output <dir>` | `-o` | Build output directory | `.preview` |
| `--logo <file>` | `-l` | Custom logo image | — |

### Examples

```bash
# Build docs to a custom directory
spectacle build api.yaml -o public/docs

# Start dev server with live reload
spectacle dev api.yaml

# Validate a spec without building
spectacle validate api.yaml

# Build with a custom logo
spectacle build api.yaml --logo ./logo.png -o docs/
```

## Configuration

Create a `spectacle.json` in your project root to configure branding and theming. CLI flags take precedence over config values.

```json
{
  "logo": "./logo.png",
  "favicon": "./favicon.ico",
  "theme": {
    "--color-accent": "#e11d48",
    "--font-sans": "'IBM Plex Sans', sans-serif",
    "--sidebar-width": "280px"
  }
}
```

### Theme variables

The `theme` object accepts any CSS custom property. Here are the available variables:

#### Layout

| Variable | Default | Description |
|----------|---------|-------------|
| `--sidebar-width` | `260px` | Sidebar width |
| `--content-padding` | `2rem` | Content area padding |

#### Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--color-accent` | `#2563eb` | Links, active states, accent color |
| `--color-accent-hover` | `#1d4ed8` | Accent hover state |
| `--color-heading` | `#0f172a` | Heading text |
| `--color-body` | `#374151` | Body text |
| `--color-muted` | `#6b7280` | Secondary text |
| `--color-faint` | `#9ca3af` | Tertiary text, labels |
| `--color-border` | `#e5e7eb` | Borders and dividers |
| `--color-bg-subtle` | `#f9fafb` | Subtle backgrounds |

#### Method colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--method-get` | `#16a34a` | GET badge and dot |
| `--method-post` | `#2563eb` | POST badge and dot |
| `--method-put` | `#d97706` | PUT badge and dot |
| `--method-delete` | `#dc2626` | DELETE badge and dot |
| `--method-patch` | `#9333ea` | PATCH badge and dot |

#### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--font-sans` | `'Inter', system-ui, sans-serif` | Body font |
| `--font-mono` | `'JetBrains Mono', monospace` | Code font |

#### Dark panel

| Variable | Default | Description |
|----------|---------|-------------|
| `--dark-bg` | `#0f1117` | Dark panel background |
| `--dark-bg-raised` | `#161922` | Raised element background |
| `--dark-border` | `rgba(255,255,255,0.08)` | Dark panel borders |

## Programmatic API

```typescript
import { buildDocs } from 'spectacle-docs';

const result = await buildDocs({
  specSource: './api.yaml',
  outputDir: './docs',
  logo: './logo.png',
  favicon: './favicon.ico',
  themeOverrides: {
    '--color-accent': '#e11d48',
  },
});

console.log(result.spec.info.title);      // "My API"
console.log(result.spec.operations.length); // 42
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `specSource` | `string` | Path or URL to the spec file (required) |
| `outputDir` | `string` | Output directory (default: `"dist"`) |
| `logo` | `string` | Path to a custom logo |
| `favicon` | `string` | Path to a custom favicon |
| `singleFile` | `boolean` | Embed assets into one HTML file |
| `embeddable` | `boolean` | Omit `<html>`/`<body>` tags |
| `skipWrite` | `boolean` | Parse and normalize without writing files |
| `themeOverrides` | `Record<string, string>` | CSS custom property overrides |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Open search |
| `Escape` | Close search or sidebar |
| `↑` / `↓` | Navigate search results |
| `Enter` | Go to selected result |

## Development

```bash
git clone https://github.com/sourcey/spectacle.git
cd spectacle
npm install
npm run build
npm test
```

### Project structure

```
src/
  cli.ts              CLI entry point (citty)
  index.ts            Programmatic API
  config.ts           spectacle.json loader
  dev-server.ts       Dev server with live reload
  core/               Spec processing pipeline
    loader.ts         Load from file/URL
    parser.ts         Validate and dereference $refs
    converter.ts      Swagger 2.0 → OpenAPI 3.x
    normalizer.ts     OpenAPI → internal model
    types.ts          Internal types
  components/         Preact components (SSG)
    layout/           Page, Sidebar, Head
    openapi/          Operation, Parameters, Responses, etc.
    schema/           SchemaView, ExampleView
    ui/               Badge, CodeBlock, Markdown, SectionLabel
  renderer/           HTML generation
    static-renderer.ts  Preact → HTML string
    html-builder.ts     Assemble HTML + CSS + JS
    context.ts          Render context
  client/             Browser JavaScript (vanilla JS)
    sidebar.js        Drawer toggle, close on outside click/Escape
    scroll-tracker.js IntersectionObserver nav highlighting
    tabs.js           Synced language tab switching
    copy.js           Clipboard copy with feedback
    theme-toggle.js   Dark/light mode toggle
    search.js         Client-side search dialog
  themes/
    default/          Default theme CSS
```

### Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
```

## More Information

Please use the [GitHub issue tracker](https://github.com/sourcey/spectacle/issues) if you have any ideas or bugs to report.

All contributions are welcome.

Good luck and enjoy Spectacle!

## License

MIT
