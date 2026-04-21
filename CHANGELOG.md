# Changelog

All notable changes to Sourcey. Format based on [Keep a Changelog](https://keepachangelog.com/).

## 3.4.12 — 2026-04-16

### Added

- Automatic per-page OG image generation at build time using Satori and resvg
- `ogImage` config option for overriding with a static image URL
- Heroicons in navigation and UI components

### Changed

- Inter loaded as the default sans-serif; layout rhythm refined for tighter vertical spacing

### Fixed

- Tab path deduplication when multiple tabs share a slug
- Inline code styling inside TOC items
- TOC nested-item border alignment

## 3.4.5 — 2026-04-07

### Added

- Nested directives (e.g. tabs inside `:::code-group`)
- Doxygen link rewriting for cross-referenced symbols in prose

### Fixed

- Inline code protection during markdown directive preprocessing

## 3.4.4 — 2026-04-06

### Fixed

- OAuth security section rendering
- Footer logo restored after layout refactor
- Fenced markdown examples preserved through directive preprocessing

## 3.4.3 — 2026-04-05

### Added

- `::iframe` directive for embedding arbitrary https URLs in markdown

### Fixed

- Doxygen page summaries now reuse resolved cross-links in page headers instead of exposing raw `{#ref ... #}` placeholders
- Rich Doxygen index cards strip inline markdown link syntax from summaries
- `sourcey init` now scaffolds projects against the latest published version again
- Minimal-theme callout borders and responsive page description sizing
- TOC sub-item margin alignment
- Search featured pages, inline dialog, display font, and sidebar dot markers
- Lighthouse baseline polish for generated docs

## 3.4.0 — 2026-04-02

### Added

- MCP server documentation as a first-class input format alongside OpenAPI, Markdown, and Doxygen
- `mcp` tab config option for rendering tools, resources, and prompts from an `mcp.json` snapshot
- Auto-generated code samples in JSON-RPC, TypeScript SDK, and Python SDK for all MCP operations
- Connection config card showing how to add the server to Claude, Cursor, or any MCP client
- Annotation badges for tool hints (read-only, destructive, idempotent, open-world)
- Colour-coded sidebar method pills (purple TOOL, green RES, blue PRMT)
- Hot-reload for mcp.json files in the dev server
- `::video` directive for embedding YouTube, Vimeo, or raw video files in markdown
- Sitemap generation
- OpenGraph and Twitter Card meta tags
- Dockerfile for Docker Hub
- Nix flake support

### Changed

- Sidebar active state uses pill-style background instead of left border
- Table of contents uses a continuous grey track with primary colour active marker
- Clicking the first sidebar item scrolls to the top of the page

### Fixed

- Dev server `fs.allow` now includes the sourcey root for npm link compatibility
- Double-wrapped accordion groups from `<AccordionGroup>` component syntax

## 3.3.10 — 2026-03-30

### Changed

- Package metadata moved to sourcey.com and sourcey/sourcey org

### Fixed

- Node 24 JSON import compatibility

## 3.3.9 — 2026-03-28

### Fixed

- Page slugs preserve directory structure to avoid nav collisions

## 3.3.8 — 2026-03-28

### Fixed

- `slugFromPath` preserves directory structure

## 3.3.7 — 2026-03-27

### Added

- Relative source links in markdown rewrite to repo URLs at build time

## 3.3.6 — 2026-03-27

### Added

- Doxygen index page generation

### Fixed

- Doxygen index content links

## 3.3.5 — 2026-03-26

### Fixed

- CLI help output reports the actual package version
- `sourcey init` scaffolds new projects with the latest published version

## 3.3.4 — 2026-03-26

### Changed

- First page renders directly instead of meta-refresh redirect

## 3.3.2 — 2026-03-25

### Added

- `sourcey init` auto-detects project type and offers directory selection
- Init reads Doxygen `XML_OUTPUT` for proper path resolution

## 3.3.1 — 2026-03-25

### Fixed

- Use jiti for TypeScript config loading
- Resolve moxygen from npm registry

## 3.3.0 — 2026-03-25

### Added

- `sourcey init` command for scaffolding new projects
- Scroll tracker `?target` query parameter for deep linking
- Node 24 in CI test matrix

## 3.2.1 — 2026-03-24

### Fixed

- Dev server asset path resolution for npm installs

## 3.2.0 — 2026-03-23

### Added

- Internal link resolution between markdown pages
- `editBasePath` config option for repos with docs in a subdirectory
- Previous/next page navigation at the bottom of markdown pages
- Brand icons (GitHub, npm, etc.) in navbar and footer

## 3.1.0 — 2026-03-22

### Added

- Mobile navigation drawer with breadcrumbs
- Configurable tab slugs
- Collapsible schemas in API reference
- "Edit this page" links on markdown pages
- Auto Google Fonts loading from theme config

### Changed

- Stone-palette code surfaces
- TOC nesting improvements

### Fixed

- Responsive layout at small breakpoints
- Code indent rendering
- Dev server error recovery
- Sidebar active state on prose pages
- Duplicate h1 headings
- Logo paths resolve relative to config directory

## 3.0.2 — 2026-03-21

### Added

- Geist Mono as default monospace font

### Changed

- Config changes hot-reload in dev server

### Fixed

- Scroll offset calculation

## 3.0.1 — 2026-03-21

### Added

- Doxygen C++ documentation via Moxygen integration
- Command palette search (Cmd+K)
- Google Fonts loading and font stack configuration

### Fixed

- Moxygen resolved from npm registry
- TOC scroll tracking
- Heading scroll offset

## 3.0.0 — 2026-03-20

### Added

- Redesigned theme with new layout, typography, and colour system
- Theme presets (default, minimal, api-first) with custom colours, fonts, and layout
- EndpointBar component with colour-coded method badges
- CopyButton and SocialIcon UI components
- Demo site with markdown guides
- Unified Vite plugin for dev server

### Changed

- Renamed from `spectacle-docs` to `sourcey`
- License changed from MIT to AGPL-3.0-only
- Complete redesign of Header, Sidebar, Page, TableOfContents, CodeSamples, Responses, and Security components

### Removed

- Legacy Handlebars/Foundation/SCSS theme
- TabBar and old CodeBlock components

## 2.1.0 — 2026-03-19

### Added

- Multi-page sites with tabbed navigation and sidebar groups
- Markdown pages with rich components (Steps, Cards, Accordions)
- Vite dev server with SSR hot reload
- Header with navbar links and CTA button
- Table of contents with scroll tracking
- Footer with social links
- Cross-page navigation link resolution

### Changed

- Dark example panel hidden on prose-only pages

## 2.0.2 — 2026-03-19

### Added

- Vite dev server with header, TOC, and layout system

## 2.0.0 — 2026-03-10

Complete rewrite from Handlebars/Grunt to TypeScript/Preact SSG.

### Added

- TypeScript codebase with Preact SSR
- `sourcey.config.ts` with `defineConfig()` and full type safety
- OpenAPI 3.x support (auto-converts Swagger 2.0)
- Shiki syntax highlighting
- Dark mode with localStorage persistence
- Client-side search with keyboard navigation (Cmd+K)
- Auto-generated code samples in 10 languages
- Custom colour theming with hex-to-RGB token system
- Stone-palette code blocks with language dropdown and response tabs
- Copy button on code blocks
- Scroll-tracked sidebar navigation
- Enum pills and array item type display
- Logo support with light/dark variants
- Static HTML output with no framework runtime
- GitHub Actions CI

### Removed

- Handlebars template engine
- Grunt build system
- highlight.js

## 1.1.0 — 2020-03-10

### Fixed

- Example rendering
- Dependency vulnerabilities (handlebars, js-yaml, lodash, marked, fstream)

## 1.0.7 — 2019-01-30

### Added

- YAML example support

### Fixed

- Href with colon characters
- Href with multiple dots
- Code block overflow

## 1.0.6 — 2018-09-20

### Changed

- Licence update

## 1.0.5 — 2018-07-02

### Changed

- Updated Grunt dependencies

## 1.0.4 — 2018-07-01

### Fixed

- grunt-sass 3.0 compatibility
- grunt-sass dependency resolution

## 1.0.3 — 2018-04-15

### Added

- Nested objects and arrays in definitions
- Resource embedding support
- Enum definition descriptions
- `$ref` support in parameters and responses
- Development mode with live reload
- Schema syntax error reporting in dev mode
- `x-nullable` support

## 1.0.2 — 2018-03-22

### Changed

- Security partial rendering

## 1.0.1 — 2018-03-21

### Fixed

- Markdown rendering (#122, #126)
- Schema description rendering and linking

## 1.0.0 — 2018-03-20

First stable release. Requires Node.js >= 8.

### Added

- Quiet output option

### Fixed

- Remote file reference rendering

## 0.9.12 — 2017-11-13

### Added

- Response header display

### Fixed

- Null node error in reference resolution

## 0.9.11 — 2017-10-13

### Fixed

- Null check in reference replacement

## 0.9.10 — 2017-09-27

### Fixed

- Remote reference tests

## 0.9.9 — 2017-09-27

### Added

- Min/max range display for parameters
- maxLength and minLength display for strings
- Better rendering of arrays of objects

## 0.9.8 — 2017-09-01

### Fixed

- Rendering on large screens with indents

## 0.7.0 — 2017-02-01

### Added

- Programmatic API with promise return

## 0.6.9 — 2017-01-16

### Added

- Remote schema support
- Temporary directory per build run

## 0.6.8 — 2017-01-13

### Fixed

- Code highlighting
- HTTPS for jQuery reference

## Pre-releases — 2016

### Added

- OpenAPI 2.0 (Swagger) rendering
- Foundation 6 responsive layout with drawer navigation
- Custom logo support
- Docker support
- Recursive example parsing
- Definition rendering with JSON examples
- Custom CSS scoping
- Handlebars template engine
