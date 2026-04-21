import type { ChangelogPage } from "../core/markdown-loader.js";
import type { NormalizedChangelogVersion } from "../core/types.js";

export interface ChangelogFeedOptions {
  atomPath: string;
  rssPath: string;
  pagePath: string;
  buildDate?: Date;
  siteName: string;
  title?: string;
  description?: string;
  versionHref(version: NormalizedChangelogVersion): string;
}

export interface ChangelogFeedFiles {
  atom: string;
  rss: string;
}

export function generateChangelogFeeds(
  page: ChangelogPage,
  options: ChangelogFeedOptions,
): ChangelogFeedFiles {
  const buildDate = options.buildDate ?? new Date();
  const updated = page.changelog.versions
    .map((version) => version.date ? new Date(`${version.date}T00:00:00Z`) : null)
    .find(Boolean) ?? buildDate;
  const title = options.title ?? [options.siteName, page.title].filter(Boolean).join(" ").trim();
  const description = options.description ?? page.description ?? `${page.title} feed`;
  const feedId = toFeedId(options.atomPath);

  const atomEntries = page.changelog.versions.map((version) => {
    const href = options.versionHref(version);
    const content = renderVersionHtml(version);
    const updatedAt = version.date ? new Date(`${version.date}T00:00:00Z`) : updated;
    const label = version.version ?? "Unreleased";

    return [
      "  <entry>",
      `    <title>${escapeXml(label)}</title>`,
      `    <id>${escapeXml(toFeedId(href))}</id>`,
      `    <link href="${escapeXml(href)}" />`,
      `    <updated>${updatedAt.toISOString()}</updated>`,
      `    <content type="html">${escapeXml(content)}</content>`,
      "  </entry>",
    ].join("\n");
  }).join("\n");

  const atom = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom">`,
    `  <title>${escapeXml(title)}</title>`,
    `  <id>${escapeXml(feedId)}</id>`,
    `  <updated>${updated.toISOString()}</updated>`,
    `  <subtitle>${escapeXml(description)}</subtitle>`,
    `  <link rel="self" href="${escapeXml(options.atomPath)}" />`,
    `  <link href="${escapeXml(options.pagePath)}" />`,
    page.changelog.versions.length ? atomEntries : "",
    `</feed>`,
  ].filter(Boolean).join("\n");

  const rssItems = page.changelog.versions.map((version) => {
    const href = options.versionHref(version);
    const label = version.version ?? "Unreleased";
    const pubDate = version.date
      ? new Date(`${version.date}T00:00:00Z`)
      : updated;

    return [
      "    <item>",
      `      <title>${escapeXml(label)}</title>`,
      `      <link>${escapeXml(href)}</link>`,
      `      <guid>${escapeXml(href)}</guid>`,
      `      <pubDate>${pubDate.toUTCString()}</pubDate>`,
      `      <description>${escapeXml(renderVersionHtml(version))}</description>`,
      "    </item>",
    ].join("\n");
  }).join("\n");

  const rss = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `  <channel>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(options.pagePath)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    page.changelog.versions.length ? rssItems : "",
    `  </channel>`,
    `</rss>`,
  ].filter(Boolean).join("\n");

  return { atom, rss };
}

function renderVersionHtml(version: NormalizedChangelogVersion): string {
  const summary = version.summary ? `<p>${escapeHtml(version.summary)}</p>` : "";
  const sections = version.sections.map((section) => {
    const items = section.entries.map((entry) => `<li>${entry.html}</li>`).join("");
    return `<section><h3>${escapeHtml(section.label)}</h3><ul>${items}</ul></section>`;
  }).join("");

  return `<article><h2>${escapeHtml(version.version ?? "Unreleased")}</h2>${summary}${sections}</article>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toFeedId(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `urn:sourcey:${value.replace(/^\/+/, "").replace(/\//g, ":")}`;
}
