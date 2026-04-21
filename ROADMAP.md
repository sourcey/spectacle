# Roadmap

What's coming for Sourcey.

## Shipped

- **MCP server documentation** — tools, resources, prompts rendered as browsable reference with code samples
- **C++ and Doxygen** — feed Doxygen XML, get modern searchable API docs via moxygen
- **MDX support** — custom component imports in `.mdx` files
- **Directive components** — `:::note`, `:::warning`, `:::code-group`, `:::steps`, `:::tabs`, `::video`, `::iframe` in plain markdown
- **llms.txt generation** — auto-generate llms.txt and llms-full.txt alongside HTML output
- **Dark mode** — semantic design tokens, light/dark logo variants
- **Client-side search** — fuzzy search across all pages and API operations
- **Theme presets** — default, minimal, api-first layouts
- **Docker and Nix** — Dockerfile and Nix flake for reproducible builds

## Planned

### Documentation experience

- **Changelog standardisation** — normalise any `CHANGELOG.md` into a structured model, render as version cards with coloured type badges, emit per-version Atom/RSS feeds, include in llms.txt
- **Version switcher** — multiple doc versions with dropdown selector
- **Incremental builds** — only re-render changed pages
- **i18n** — multi-language documentation support

### API reference

- **API playground** — try-it-live requests with parameter inputs, auth, cURL export

### Ecosystem

- **VS Code extension** — live preview of sourcey docs while editing
- **Theme packages** — publishable themes as npm packages
