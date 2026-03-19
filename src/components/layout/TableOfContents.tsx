import type { PageHeading } from "../../core/markdown-loader.js";

/**
 * Right-sidebar table of contents for prose pages.
 * Shows h2/h3 headings with anchor links.
 * Only rendered when headings are available.
 */
export function TableOfContents({ headings }: { headings: PageHeading[] }) {
  if (headings.length === 0) return null;

  return (
    <aside id="toc">
      <div class="toc-inner">
        <div class="toc-label">On this page</div>
        <nav>
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              class={`toc-link toc-level-${h.level}`}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
