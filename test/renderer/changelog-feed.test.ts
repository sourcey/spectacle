import { describe, expect, it } from "vitest";
import { generateChangelogFeeds } from "../../src/renderer/changelog-feed.js";
import type { ChangelogPage } from "../../src/core/markdown-loader.js";
import type { NormalizedChangelogVersion } from "../../src/core/types.js";

describe("generateChangelogFeeds", () => {
  it("uses the newest dated version as Atom updated and emits an author", () => {
    const feeds = generateChangelogFeeds(
      page([
        version("0.1.0", "2024-01-01"),
        version("0.2.0", "2024-03-01"),
        version("0.3.0", "2024-02-01"),
      ]),
      options(),
    );

    expect(feeds.atom).toContain("<updated>2024-03-01T00:00:00.000Z</updated>");
    expect(feeds.atom).toContain("<author><name>Sourcey</name></author>");
  });

  it("renders version summaries as markdown before embedding feed content", () => {
    const feeds = generateChangelogFeeds(
      page([{ ...version("0.1.0", "2024-01-01"), summary: "Ships **bold** text." }]),
      options(),
    );

    expect(feeds.atom).toContain("&lt;strong&gt;bold&lt;/strong&gt;");
    expect(feeds.atom).not.toContain("**bold**");
  });
});

function options() {
  return {
    atomPath: "https://example.com/feed.xml",
    rssPath: "https://example.com/feed.rss",
    pagePath: "https://example.com/changelog.html",
    buildDate: new Date("2024-05-01T00:00:00Z"),
    siteName: "Sourcey",
    versionHref: (item: NormalizedChangelogVersion) => `https://example.com/${item.id}`,
  };
}

function page(versions: NormalizedChangelogVersion[]): ChangelogPage {
  return {
    kind: "changelog",
    title: "Changelog",
    description: "",
    slug: "changelog",
    headings: [],
    sourcePath: "CHANGELOG.md",
    changelog: {
      title: "Changelog",
      format: "loose",
      versions,
      links: [],
      diagnostics: [],
      rawMarkdown: "",
    },
    rawBody: "",
  };
}

function version(value: string, date: string): NormalizedChangelogVersion {
  return {
    id: value,
    version: value,
    date,
    yanked: false,
    prerelease: false,
    sections: [],
    sourceOrder: 0,
  };
}
