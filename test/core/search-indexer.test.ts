import { describe, expect, it } from "vitest";
import { buildSearchIndex } from "../../src/core/search-indexer.js";
import type { DocsPage } from "../../src/core/markdown-loader.js";
import type { SiteNavigation } from "../../src/core/navigation.js";

describe("buildSearchIndex", () => {
  it("preserves generated symbol metadata for client-side ranking", () => {
    const pages = new Map<string, DocsPage[]>([
      [
        "api-reference",
        [
          {
            kind: "markdown",
            title: "Application",
            description: "Application runtime.",
            slug: "icy-Application",
            html: "<h1>Application</h1>",
            headings: [],
            sourcePath: "api/icy-Application.md",
            searchEntries: [
              {
                title: "setSinkVolume",
                content: "icy::Application::setSinkVolume",
                anchor: "setsinkvolume",
                category: "Functions",
                symbolKind: "function",
                owner: "icy::Application",
                ownerKind: "class",
                namespace: "icy",
                qualifiedName: "icy::Application::setSinkVolume",
              },
            ],
          },
        ],
      ],
    ]);
    const navigation: SiteNavigation = {
      activeTabSlug: "api-reference",
      activePageSlug: "icy-Application",
      tabs: [{ label: "API Reference", slug: "api-reference", href: "api-reference.html", kind: "docs", groups: [] }],
    };

    const entries = JSON.parse(buildSearchIndex(new Map(), pages, navigation)) as Array<Record<string, string>>;
    const member = entries.find((entry) => entry.qualifiedName === "icy::Application::setSinkVolume");

    expect(member).toMatchObject({
      title: "setSinkVolume",
      url: "/api-reference/icy-Application.html#setsinkvolume",
      category: "Functions",
      symbolKind: "function",
      owner: "icy::Application",
      ownerKind: "class",
      namespace: "icy",
      qualifiedName: "icy::Application::setSinkVolume",
    });
  });
});
