import type { PageHeading } from "../../core/markdown-loader.js";
import { iconPath } from "../../utils/icons.js";

/**
 * Right-sidebar table of contents for prose pages.
 * TOC layout: w-[19rem] outer, w-[16.5rem] inner,
 * sticky at 9.5rem, "On this page" with icon.
 */
const tocLink = "toc-item break-words block hover:text-[rgb(var(--color-gray-900))] dark:hover:text-[rgb(var(--color-gray-300))] dark:text-[rgb(var(--color-gray-400))] transition-colors";

function TocList({ headings }: { headings: PageHeading[] }) {
  // Group: each root heading (level 2) followed by its sub-headings (level 3+)
  const groups: { root: PageHeading; children: PageHeading[] }[] = [];
  for (const h of headings) {
    if (h.level < 3) {
      groups.push({ root: h, children: [] });
    } else if (groups.length) {
      groups[groups.length - 1].children.push(h);
    }
  }

  return (
    <ul>
      {groups.map((g) => (
        <li key={g.root.id}>
          <a href={`#${g.root.id}`} class={`${tocLink} py-1 font-medium`}>{g.root.text}</a>
          {g.children.length > 0 && (
            <ul class="mb-2">
              {g.children.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} class={`${tocLink} pl-3 py-1 text-[rgb(var(--color-gray-500))]`}>{c.text}</a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TableOfContents({ headings }: { headings: PageHeading[] }) {
  if (headings.length === 0) return null;

  return (
    <aside
      id="toc"
      class="hidden xl:flex self-start sticky xl:flex-col max-w-[28rem] z-[21]"
      style="height: calc(100vh - var(--header-height) - 2.5rem); top: calc(var(--header-height) + 2.5rem)"
    >
      <div class="z-10 hidden xl:flex box-border max-h-full pl-10 w-[19rem]">
        <div class="text-[rgb(var(--color-gray-600))] text-sm leading-6 w-[16.5rem] overflow-y-auto space-y-2 pb-4 -mt-10 pt-10">
          <h5 class="font-medium text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-300))] flex items-center gap-2">
            <svg class="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" dangerouslySetInnerHTML={{ __html: iconPath("book-open") ?? "" }} />
            On this page
          </h5>

          <nav>
            <TocList headings={headings} />
          </nav>
        </div>
      </div>
    </aside>
  );
}
