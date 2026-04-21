import type { ChangelogPage as ChangelogPageData } from "../../core/markdown-loader.js";
import { VersionCard } from "./VersionCard.js";

export function ChangelogPage({ page }: { page: ChangelogPageData }) {
  const versions = page.permalinkVersionId
    ? page.changelog.versions.filter((version) => version.id === page.permalinkVersionId)
    : page.changelog.versions;

  return (
    <div class="sourcey-changelog-page">
      <header class="sourcey-changelog-header">
        <div class="mt-0.5 space-y-2.5">
          <h1 class="text-2xl sm:text-3xl text-[rgb(var(--color-gray-900))] tracking-tight dark:text-[rgb(var(--color-gray-200))] font-bold" style="overflow-wrap: anywhere">
            {page.title}
          </h1>
        </div>
        {page.description && (
          <p class="sourcey-changelog-description">{page.description}</p>
        )}
      </header>

      <div class="sourcey-changelog-list">
        {versions.map((version) => (
          <VersionCard key={version.id} version={version} />
        ))}
      </div>
    </div>
  );
}
