import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import { htmlId } from "../../utils/html-id.js";

function methodDotColor(method: string): string {
  switch (method.toLowerCase()) {
    case "get": return "#22c55e";
    case "post": return "#3b82f6";
    case "put": return "#f59e0b";
    case "delete": return "#ef4444";
    case "patch": return "#a855f7";
    default: return "#94a3b8";
  }
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5L17 17" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );
}

export function Sidebar() {
  const spec = useContext(SpecContext);

  return (
    <div id="sidebar">
      <button
        class="close-button"
        aria-label="Close menu"
        type="button"
        data-drawer-close
      >
        <span aria-hidden="true">&times;</span>
      </button>

      {spec.info.logo && (
        <div id="logo">
          <img src={spec.info.logo} alt={spec.info.title} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "stretch", gap: "0.5rem", padding: "0 0.5rem 0.75rem 0" }}>
        <button id="search-open" type="button" aria-label="Search">
          <SearchIcon />
          <span>Search…</span>
          <span class="search-shortcut">/</span>
        </button>
        <button id="theme-toggle" type="button" aria-label="Toggle theme">
          <span class="icon-sun"><SunIcon /></span>
          <span class="icon-moon"><MoonIcon /></span>
        </button>
      </div>

      <nav id="nav" role="navigation">
        <div class="nav-section">
          <a href="#introduction" class="nav-link">Introduction</a>
          {Object.keys(spec.securitySchemes).length > 0 && (
            <a href="#authentication" class="nav-link">Authentication</a>
          )}
        </div>

        {spec.tags
          .filter((t) => !t.hidden)
          .map((tag) => (
            <div key={tag.name} class="nav-section">
              <div class="nav-group-label">{tag.name}</div>
              {tag.operations.map((op) => (
                <a
                  key={`${op.method}-${op.path}`}
                  href={`#operation-${htmlId(op.path)}-${htmlId(op.method)}`}
                  class="nav-link nav-operation"
                >
                  <span
                    class="method-dot"
                    style={{ background: methodDotColor(op.method) }}
                    title={op.method.toUpperCase()}
                  />
                  {op.summary ?? `${op.method.toUpperCase()} ${op.path}`}
                </a>
              ))}
            </div>
          ))}

        {Object.keys(spec.schemas).length > 0 && (
          <div class="nav-section">
            <div class="nav-group-label">Models</div>
            {Object.keys(spec.schemas).map((name) => (
              <a key={name} href={`#definition-${htmlId(name)}`} class="nav-link">
                {name}
              </a>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
