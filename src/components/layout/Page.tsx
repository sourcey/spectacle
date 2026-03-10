import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import { Sidebar } from "./Sidebar.js";
import { Introduction } from "../openapi/Introduction.js";
import { SecurityDefinitions } from "../openapi/Security.js";
import { Tags } from "../openapi/Tags.js";
import { Definition } from "../openapi/Definition.js";

export function Page() {
  const spec = useContext(SpecContext);
  const serverUrl = spec.servers[0]?.url ?? "/";

  return (
    <div id="page">
      <Sidebar />

      <div id="docs">
        <button
          class="floating-menu-icon"
          type="button"
          data-drawer-slide="right"
        >
          <span class="hamburger" />
        </button>

        <div class="example-box" />

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
      </div>

      <div id="search-dialog" role="dialog" aria-label="Search API">
        <div class="search-dialog-inner">
          <input
            id="search-input"
            type="text"
            placeholder="Search endpoints, models…"
            autocomplete="off"
            spellcheck={false}
          />
          <div id="search-results" />
        </div>
      </div>
    </div>
  );
}
