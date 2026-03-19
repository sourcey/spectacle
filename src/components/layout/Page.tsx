import { useContext } from "preact/hooks";
import { SpecContext, PageContext, NavigationContext } from "../../renderer/context.js";
import type { MarkdownPage } from "../../core/markdown-loader.js";
import { Sidebar } from "./Sidebar.js";
import { TabBar } from "./TabBar.js";
import { Introduction } from "../openapi/Introduction.js";
import { SecurityDefinitions } from "../openapi/Security.js";
import { Tags } from "../openapi/Tags.js";
import { Definition } from "../openapi/Definition.js";

/**
 * Renders a standalone markdown page with prose typography.
 */
function MarkdownPageContent({ page }: { page: MarkdownPage }) {
  return (
    <article class="prose-page">
      <header class="prose-header">
        <h1>{page.title}</h1>
      </header>
      <div class="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
      <footer class="doc-footer">
        <a href="https://github.com/sourcey/spectacle">
          Documentation by <strong>Spectacle</strong>
        </a>
      </footer>
    </article>
  );
}

/**
 * Renders an OpenAPI spec page (existing behaviour).
 */
function SpecPageContent() {
  const spec = useContext(SpecContext);
  const serverUrl = spec.servers[0]?.url ?? "/";

  return (
    <article>
      <header class="doc-header">
        <h1 class="doc-title">{spec.info.title}</h1>
        <span class="doc-version">v{spec.info.version}</span>
      </header>

      <Introduction />
      <SecurityDefinitions />
      <Tags tags={spec.tags} serverUrl={serverUrl} />

      {Object.keys(spec.schemas).length > 0 && (
        <div class="tag-group">
          <div class="tag-header">
            <h1>Models</h1>
          </div>
          {Object.entries(spec.schemas).map(([name, schema]) => (
            <Definition key={name} name={name} schema={schema} />
          ))}
        </div>
      )}

      <footer class="doc-footer">
        <a href="https://github.com/sourcey/spectacle">
          Documentation by <strong>Spectacle</strong>
        </a>
      </footer>
    </article>
  );
}

export function Page() {
  const page = useContext(PageContext);
  const nav = useContext(NavigationContext);

  return (
    <div id="page">
      <Sidebar />

      <div id="docs">
        {nav && <TabBar />}

        <button
          class="floating-menu-icon"
          type="button"
          data-drawer-slide="right"
        >
          <span class="hamburger" />
        </button>

        {page?.kind !== "markdown" && <div class="example-box" />}

        {page?.kind === "markdown"
          ? <MarkdownPageContent page={page.markdown!} />
          : <SpecPageContent />
        }
      </div>

      <div id="search-dialog" role="dialog" aria-label="Search">
        <div class="search-dialog-inner">
          <input
            id="search-input"
            type="text"
            placeholder="Search…"
            autocomplete="off"
            spellcheck={false}
          />
          <div id="search-results" />
        </div>
      </div>
    </div>
  );
}
