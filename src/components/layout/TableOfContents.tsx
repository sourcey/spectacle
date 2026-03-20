import type { PageHeading } from "../../core/markdown-loader.js";

/**
 * Right-sidebar table of contents for prose pages.
 * TOC layout: w-[19rem] outer, w-[16.5rem] inner,
 * sticky at 9.5rem, "On this page" with icon.
 */
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
          <h5 class="font-semibold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">On this page</h5>

          <nav>
            <ul class="space-y-0.5">
              {headings.map((h) => (
                <li key={h.id} class="relative">
                  <a
                    href={`#${h.id}`}
                    class={`toc-item break-words py-1 block hover:text-[rgb(var(--color-gray-900))] dark:hover:text-[rgb(var(--color-gray-300))] dark:text-[rgb(var(--color-gray-400))] transition-colors ${
                      h.level >= 3 ? "pl-3 text-[13px]" : ""
                    }`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );
}
