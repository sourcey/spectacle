# Roadmap

What's coming for Sourcey.

## In progress

- **MDX support** — custom component imports in `.mdx` files
- **Directive components** — `:::note`, `:::warning`, `:::code-group`, `:::steps`, `:::tabs` in plain markdown

## Planned

### Documentation experience

- **Build-time search index** — fuzzy matching, result categories, keyboard navigation
- **Breadcrumbs & prev/next** — page context and sequential navigation
- **Version switcher** — multiple doc versions with dropdown selector

### API reference

- **API playground** — try-it-live requests with parameter inputs, auth, cURL export
- **Doxygen integration** — C++ API reference from Doxygen XML via Moxygen

### Customization

- **Custom font loading** — Google Fonts or self-hosted via config

### Developer experience

- **`sourcey init`** — scaffold a starter site with example pages
- **Incremental builds** — only re-render changed pages
- **GitHub Action** — build and deploy to GitHub Pages on push

## Shipped

- TypeScript config (`sourcey.config.ts` with `defineConfig()`)
- Navbar links, CTA button, footer socials
- Theme presets (default, minimal, api-first) with custom colors, fonts, layout, CSS overrides
- Markdown components: Steps, Cards, Accordions
- Code blocks with language dropdown, response tabs, copy button
- Scroll-tracked sidebar navigation
- Multi-page sites with markdown guides alongside API reference
- Dark mode with localStorage persistence
- Client-side search with keyboard navigation
- Auto-generated code samples (cURL, JavaScript, Python)
- Vite dev server with SSR hot reload
- Table of contents with scroll tracking
- Redesigned theme with new layout, typography, and color system
- EndpointBar, CopyButton, SocialIcon components
- Demo site with guide pages
- Unified Vite plugin
- AGPL-3.0 license
