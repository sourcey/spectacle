import type { NormalizedChangelogEntry } from "../../core/types.js";

export function EntryList({ entries }: { entries: NormalizedChangelogEntry[] }) {
  if (!entries.length) return null;

  return (
    <ul class="sourcey-changelog-entry-list">
      {entries.map((entry, index) => (
        <li key={`${entry.text}-${index}`} dangerouslySetInnerHTML={{ __html: entry.html }} />
      ))}
    </ul>
  );
}
