import type { NormalizedChangelogVersion } from "../../core/types.js";
import { Markdown } from "../ui/Markdown.js";
import { EntryList } from "./EntryList.js";
import { TypeBadge } from "./TypeBadge.js";

function formatDate(date: string | null): string | null {
  if (!date) return null;

  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  } catch {
    return date;
  }
}

export function VersionCard({
  version,
  permalinkHref,
}: {
  version: NormalizedChangelogVersion;
  permalinkHref?: string;
}) {
  const href = permalinkHref ?? `#${version.id}`;
  const label = version.version ?? "Unreleased";
  const formattedDate = formatDate(version.date);

  return (
    <article id={version.id} class={`sourcey-changelog-version${version.version ? "" : " sourcey-changelog-version-unreleased"}`}>
      <header class="sourcey-changelog-version-header">
        <div class="sourcey-changelog-version-heading">
          <a href={href} class="sourcey-changelog-version-link">
            {label}
          </a>
          {version.yanked && <span class="sourcey-changelog-pill sourcey-changelog-pill-yanked">YANKED</span>}
          {version.prerelease && <span class="sourcey-changelog-pill sourcey-changelog-pill-pre">pre</span>}
        </div>
        <div class="sourcey-changelog-version-meta">
          {formattedDate && <time dateTime={version.date ?? undefined}>{formattedDate}</time>}
          {version.compareUrl && (
            <a href={version.compareUrl} target="_blank" rel="noopener noreferrer" class="sourcey-changelog-compare-link">
              Compare
            </a>
          )}
        </div>
      </header>

      {version.summary && <Markdown content={version.summary} class="sourcey-changelog-summary" />}

      <div class="sourcey-changelog-sections">
        {version.sections.map((section) => (
          <section key={`${version.id}-${section.label}`} class="sourcey-changelog-section">
            <div class="sourcey-changelog-section-header">
              <TypeBadge type={section.type} label={section.label} />
            </div>
            <EntryList entries={section.entries} />
          </section>
        ))}
      </div>
    </article>
  );
}
