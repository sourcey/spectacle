import { useContext } from "preact/hooks";
import { NavigationContext, OptionsContext, SpecContext } from "../../renderer/context.js";

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5L17 17" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );
}

/**
 * Full-width site header for multi-page mode.
 * Contains logo, tabs, search, and theme toggle.
 * Only rendered when NavigationContext is present.
 */
export function Header() {
  const nav = useContext(NavigationContext);
  const options = useContext(OptionsContext);
  const spec = useContext(SpecContext);
  if (!nav) return null;

  const base = options.assetBase;

  return (
    <header id="site-header">
      <div class="header-left">
        {spec.info.logo && (
          <a href={`${base}${nav.tabs[0]?.href ?? ""}`} class="header-logo">
            <img src={spec.info.logo} alt={spec.info.title || "Home"} />
          </a>
        )}
        <nav class="header-tabs">
          {nav.tabs.map((tab) => (
            <a
              key={tab.slug}
              href={`${base}${tab.href}`}
              class={`header-tab${tab.slug === nav.activeTabSlug ? " active" : ""}`}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </div>
      <div class="header-right">
        <button id="search-open" type="button" aria-label="Search" class="header-search">
          <SearchIcon />
          <span>Search…</span>
          <kbd>/</kbd>
        </button>
        <button id="theme-toggle" type="button" aria-label="Toggle theme" class="header-theme-toggle">
          <span class="icon-sun"><SunIcon /></span>
          <span class="icon-moon"><MoonIcon /></span>
        </button>
      </div>
    </header>
  );
}
