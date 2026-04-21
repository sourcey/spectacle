import { describe, it, expect } from "vitest";
import { renderPage } from "../../src/renderer/static-renderer.js";
import { buildNavFromSpec, buildSiteNavigation } from "../../src/core/navigation.js";
import type { SiteNavigation } from "../../src/core/navigation.js";
import type { NormalizedChangelog, NormalizedSpec } from "../../src/core/types.js";
import type { ChangelogPage, MarkdownPage } from "../../src/core/markdown-loader.js";
import type { RenderOptions, CurrentPage, SiteConfig } from "../../src/renderer/context.js";

function createMinimalSpec(overrides?: Partial<NormalizedSpec>): NormalizedSpec {
  return {
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "A test API",
    },
    servers: [{ url: "https://api.test.com" }],
    tags: [],
    operations: [],
    schemas: {},
    securitySchemes: {},
    webhooks: [],
    ...overrides,
  };
}

const defaultOptions: RenderOptions = {
  embeddable: false,
  assetBase: "",
};

const defaultSite: SiteConfig = {
  name: "Test",
  siteUrl: undefined,
  baseUrl: "",
  theme: {
    preset: "default",
    colors: { primary: "99 102 241", light: "129 140 248", dark: "79 70 229" },
    fonts: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      googleFont: "Inter",
    },
    layout: { sidebar: "18rem", toc: "19rem", content: "44rem" },
    css: [],
  },
  codeSamples: ["curl", "javascript", "python"],
  navbar: { links: [] },
  footer: { links: [] },
  changelog: { enabled: true, feed: false, permalinks: false, ogImages: false },
};

function renderSpec(spec: NormalizedSpec, options: RenderOptions): string {
  const tab = buildNavFromSpec(spec, "api");
  tab.label = "API Reference";
  const navigation = buildSiteNavigation([tab]);
  const currentPage: CurrentPage = { kind: "spec", spec };
  return renderPage(spec, options, navigation, currentPage, defaultSite);
}

function createMarkdownPage(overrides?: Partial<MarkdownPage>): MarkdownPage {
  return {
    kind: "markdown",
    title: "Guide",
    description: "",
    slug: "guides/current",
    html: "<p>Body</p>",
    headings: [],
    sourcePath: "guides/current.md",
    editPath: "guides/current.md",
    ...overrides,
  };
}

function createChangelogPage(overrides?: Partial<ChangelogPage>): ChangelogPage {
  const changelog: NormalizedChangelog = {
    title: "Changelog",
    format: "keepachangelog",
    versions: [
      {
        id: "1-2-0",
        version: "1.2.0",
        date: "2026-04-20",
        yanked: false,
        prerelease: false,
        sections: [
          {
            type: "added",
            label: "Added",
            entries: [{ text: "Added feeds", html: "Added feeds", links: [], refs: [] }],
          },
        ],
        sourceOrder: 0,
      },
    ],
    links: [],
    diagnostics: [],
    rawMarkdown: "# Changelog",
  };

  return {
    kind: "changelog",
    title: "Changelog",
    description: "Release notes",
    slug: "changelog",
    headings: [{ level: 2, text: "1.2.0", id: "1-2-0" }],
    sourcePath: "CHANGELOG.md",
    editPath: "CHANGELOG.md",
    changelog,
    rawBody: "# Changelog",
    ...overrides,
  };
}

function createDocsNavigation(): SiteNavigation {
  return {
    tabs: [
      {
        label: "Documentation",
        slug: "documentation",
        href: "documentation/guides/previous.html",
        kind: "docs",
        groups: [
          {
            label: "Guides",
            items: [
              { label: "Previous", href: "documentation/guides/previous.html", id: "guides/previous" },
              { label: "Current", href: "documentation/guides/current.html", id: "guides/current" },
              { label: "Next", href: "documentation/guides/next.html", id: "guides/next" },
            ],
          },
        ],
      },
    ],
    activeTabSlug: "documentation",
    activePageSlug: "guides/current",
  };
}

describe("renderPage (spec)", () => {
  it("renders a complete HTML document", () => {
    const html = renderSpec(createMinimalSpec(), defaultOptions);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("Test API");
    expect(html).toContain("API Reference");
    expect(html).toContain("sourcey.css");
  });

  it("includes sidebar navigation", () => {
    const html = renderSpec(createMinimalSpec(), defaultOptions);
    expect(html).toContain('id="sidebar"');
    expect(html).toContain('id="nav"');
    expect(html).toContain("Introduction");
  });

  it("renders operations in tags", () => {
    const spec = createMinimalSpec({
      tags: [
        {
          name: "Pets",
          description: "Pet operations",
          operations: [
            {
              method: "get",
              path: "/pets",
              summary: "List all pets",
              tags: ["Pets"],
              parameters: [],
              responses: [],
              security: [],
              deprecated: false,
            },
          ],
        },
      ],
      operations: [
        {
          method: "get",
          path: "/pets",
          summary: "List all pets",
          tags: ["Pets"],
          parameters: [],
          responses: [],
          security: [],
          deprecated: false,
        },
      ],
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("Pets");
    expect(html).toContain("List all pets");
    expect(html).toContain("operation-pets-get");
  });

  it("renders schema definitions", () => {
    const spec = createMinimalSpec({
      schemas: {
        Pet: {
          name: "Pet",
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
          },
          required: ["id", "name"],
        },
      },
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("Models");
    expect(html).toContain("definition-pet");
    expect(html).toContain("Pet");
  });

  it("renders security schemes in sidebar", () => {
    const spec = createMinimalSpec({
      securitySchemes: {
        api_key: {
          type: "apiKey",
          name: "X-API-Key",
          in: "header",
        },
      },
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("Authentication");
    expect(html).toContain("api_key");
  });

  it("renders server endpoints", () => {
    const spec = createMinimalSpec({
      servers: [
        { url: "https://api.example.com", description: "Production" },
        { url: "https://staging-api.example.com", description: "Staging" },
      ],
    });

    const html = renderSpec(spec, defaultOptions);
    expect(html).toContain("https://api.example.com");
    expect(html).toContain("Production");
  });

  it("prefixes markdown page navigation links with the page asset base", () => {
    const spec = createMinimalSpec();
    const navigation = createDocsNavigation();
    const options: RenderOptions = { embeddable: false, assetBase: "../../" };
    const currentPage: CurrentPage = {
      kind: "markdown",
      markdown: createMarkdownPage(),
    };

    const html = renderPage(spec, options, navigation, currentPage, defaultSite);

    expect(html).toContain('href="../../documentation/guides/previous.html"');
    expect(html).toContain('href="../../documentation/guides/next.html"');
  });

  it("renders changelog pages through the structured changelog component", () => {
    const spec = createMinimalSpec();
    const navigation = {
      ...createDocsNavigation(),
      tabs: [
        {
          label: "Documentation",
          slug: "documentation",
          href: "documentation/changelog.html",
          kind: "docs" as const,
          groups: [
            {
              label: "Guides",
              items: [{ label: "Changelog", href: "documentation/changelog.html", id: "changelog" }],
            },
          ],
        },
      ],
      activePageSlug: "changelog",
    };
    const currentPage: CurrentPage = {
      kind: "changelog",
      changelog: createChangelogPage(),
    };

    const html = renderPage(spec, defaultOptions, navigation, currentPage, defaultSite);

    expect(html).toContain("sourcey-changelog-version");
    expect(html).toContain("1.2.0");
    expect(html).toContain("Added");
  });

  it("renders canonical, feed, and OG metadata from resolved public URLs", () => {
    const spec = createMinimalSpec();
    const navigation = {
      ...createDocsNavigation(),
      tabs: [
        {
          label: "Documentation",
          slug: "documentation",
          href: "documentation/changelog.html",
          kind: "docs" as const,
          groups: [
            {
              label: "Guides",
              items: [{ label: "Changelog", href: "documentation/changelog.html", id: "changelog" }],
            },
          ],
        },
      ],
      activePageSlug: "changelog",
    };
    const currentPage: CurrentPage = {
      kind: "changelog",
      changelog: createChangelogPage(),
    };
    const options: RenderOptions = {
      embeddable: false,
      assetBase: "../../",
      pageUrl: "https://docs.example.com/reference/changelog.html",
      ogImageUrl: "https://docs.example.com/reference/_og/changelog.png",
      alternateLinks: [
        {
          href: "https://docs.example.com/reference/feed.xml",
          type: "application/atom+xml",
          title: "Changelog Atom Feed",
        },
      ],
    };

    const html = renderPage(spec, options, navigation, currentPage, {
      ...defaultSite,
      siteUrl: "https://docs.example.com",
      baseUrl: "/reference/",
    });

    expect(html).toContain('rel="canonical" href="https://docs.example.com/reference/changelog.html"');
    expect(html).toContain('property="og:url" content="https://docs.example.com/reference/changelog.html"');
    expect(html).toContain('property="og:image" content="https://docs.example.com/reference/_og/changelog.png"');
    expect(html).toContain('rel="alternate" type="application/atom+xml" href="https://docs.example.com/reference/feed.xml"');
  });
});
