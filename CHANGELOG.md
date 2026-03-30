# Changelog

All notable changes to Sourcey.

## Unreleased

- Sitemap generation
- OpenGraph and Twitter Card meta tags in generated output
- Dockerfile for `sourcey/sourcey` on Docker Hub
- Nix flake (`nix build github:sourcey/sourcey`)
- npm homepage, keywords, and funding field updated

## 3.3.10 — 2026-03-30

- Package metadata: homepage → sourcey.com, repo → sourcey/sourcey org
- Node 24 JSON import compatibility (import attributes)

## 3.3.9 — 2026-03-28

- Fix directory structure preserved in page slugs to avoid nav collisions

## 3.3.8 — 2026-03-28

- Fix slugFromPath to preserve directory structure

## 3.3.7 — 2026-03-27

- Rewrite relative source links to repo URLs at build time

## 3.3.6 — 2026-03-27

- Doxygen index page generation
- Fix doxygen index content links

## 3.3.5 — 2026-03-26

- Report the actual package version in CLI help output
- Scaffold new projects with latest published sourcey version

## 3.3.4 — 2026-03-26

- Render first page directly instead of meta-refresh redirect

## 3.3.2 — 2026-03-25

- Smarter init with auto-detection and directory selection
- Init reads Doxygen XML_OUTPUT, proper relPath resolution

## 3.3.1 — 2026-03-25

- Fix: use jiti for TS config loading, resolve moxygen from npm registry

## 3.3.0 — 2026-03-25

- `sourcey init` command
- Scroll tracker `?target` param
- Node 24 added to CI test matrix

## 3.2.1 — 2026-03-24

- Fix dev-server asset path resolution for npm installs

## 3.2.0 — 2026-03-23

- Internal link resolution between pages
- `editBasePath` config option
- Page navigation (prev/next)
- Brand icons (GitHub, npm, etc.) in navbar and footer

## 3.1.0 — 2026-03-22

- Mobile navigation drawer with breadcrumbs
- Responsive layout fixes
- Configurable tab slugs
- Stone code surfaces, TOC nesting, code indent fix
- Collapsible schemas, edit page links, dev error recovery
- Auto Google Fonts loading from config
- Fix sidebar active state on prose pages, dedupe h1
- Fix: resolve logo paths relative to config dir

## 3.0.2 — 2026-03-21

- Config live reload, scroll offset fix
- Geist Mono default font
- Style improvements

## 3.0.1 — 2026-03-21

- Doxygen integration via Moxygen with glob pages and auto-title
- TOC scroll tracking, command palette search (Cmd+K), heading scroll offset
- Google Fonts loading and font stack wrapping
- Fix: use moxygen from npm registry

## 3.0.0 — 2026-03-20

Rebrand to Sourcey with redesigned theme.

- Rename package from `spectacle-docs` to `sourcey`, CLI binary from `spectacle` to `sourcey`
- License changed from MIT to AGPL-3.0-only
- Redesigned theme with new layout, typography, and color system
- EndpointBar component with method badge and path
- CopyButton and SocialIcon UI components
- Redesigned Header, Sidebar, Page, and TableOfContents components
- Redesigned CodeSamples with language icons and synced tabs
- Redesigned Responses and Security sections
- Theme presets with custom colors, fonts, and layout options in config
- Unified Vite plugin replacing watcher plugin
- Demo site with markdown guide pages and config
- Removed legacy Handlebars/Foundation/SCSS theme (`themes/default/reference/`)
- Removed TabBar and old CodeBlock components
- New screenshot

## 2.1.0 — 2026-03-19

Multi-page documentation platform with markdown guides alongside API reference.

- Multi-page sites with tabbed navigation and sidebar groups
- Markdown pages with rich components (Steps, Cards, Accordions)
- Vite dev server with SSR hot reload
- Header component with navbar links and CTA button
- Table of contents with scroll tracking
- Footer with social links
- Cross-page navigation link resolution
- Hide dark example panel on prose-only pages

## 2.0.2 — 2026-03-19

- Vite dev server with header/TOC components and layout system

## 2.0.0 — 2026-03-10

Complete rewrite from Handlebars/Grunt to TypeScript/Preact SSG.

- TypeScript codebase with Preact SSR
- `sourcey.config.ts` with `defineConfig()` and full type safety
- OpenAPI 3.x support (via swagger2openapi for 2.0 specs)
- Shiki syntax highlighting replacing highlight.js
- Dark mode with localStorage persistence
- Client-side search with keyboard navigation (Cmd+K)
- Auto-generated code samples (cURL, JavaScript, Python)
- Custom color theming with hex-to-RGB token system
- Stone-palette code blocks with language dropdown and response tabs
- Copy button on code blocks
- Scroll-tracked sidebar navigation
- Enum pills and array item type display
- Logo support with light/dark variants
- Static HTML output; no framework runtime
- GitHub Actions CI workflow

## 1.1.0 — 2020-03-10

- Fix example rendering
- Dependency updates (handlebars, js-yaml, lodash, marked, fstream)

## 1.0.7 — 2019-01-30

- Fix href with colon characters
- Fix href with multiple dots
- YAML example support
- Fix code block overflow

## 1.0.6 — 2018-09-20

- Licence update

## 1.0.5 — 2018-07-02

- Update Grunt dependencies

## 1.0.4 — 2018-07-01

- Update to grunt-sass 3.0
- Fix grunt-sass dependency issue

## 1.0.3 — 2018-04-15

- Nested objects and arrays in definitions
- Resource embedding support
- Enum definition descriptions
- `$ref` support in parameters and responses
- Development mode with live reload
- Schema syntax error reporting in dev mode
- `x-nullable` support

## 1.0.2 — 2018-03-22

- Security partial updates

## 1.0.1 — 2018-03-21

- Fix markdown rendering issues (#122, #126)
- Improved schema description rendering and linking

## 1.0.0 — 2018-03-20

First stable release. Requires Node.js >= 8.

- Fix rendering of remote file references
- Quiet output option

## 0.9.12 — 2017-11-13

- Response header display
- Fix null node error in reference resolution

## 0.9.11 — 2017-10-13

- Null check in reference replacement

## 0.9.10 — 2017-09-27

- Fix remote reference tests

## 0.9.9 — 2017-09-27

- Display min/max ranges for parameters
- Display maxLength and minLength for strings
- Better rendering of arrays of objects

## 0.9.8 — 2017-09-01

- Fix rendering on large screens with indents

## 0.7.0 — 2017-02-01

- Programmatic API with promise return

## 0.6.9 — 2017-01-16

- Remote schema support
- Temporary directory per build run

## 0.6.8 — 2017-01-13

- Code highlighting fix
- HTTPS for jQuery reference

## Pre-releases — 2016

- Initial release with OpenAPI 2.0 (Swagger) rendering
- Foundation 6 responsive layout with drawer navigation
- Custom logo support
- Docker support
- Recursive example parsing
- Definition rendering with JSON examples
- Custom CSS scoping
- Handlebars template engine
