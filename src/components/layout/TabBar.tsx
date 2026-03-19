import { useContext } from "preact/hooks";
import { NavigationContext } from "../../renderer/context.js";

/**
 * Horizontal tab bar for multi-page sites.
 * Rendered above the main content area. Only shown when 2+ tabs exist.
 */
export function TabBar() {
  const nav = useContext(NavigationContext);
  if (!nav || nav.tabs.length <= 1) return null;

  return (
    <div id="tab-bar">
      {nav.tabs.map((tab) => (
        <a
          key={tab.slug}
          href={tab.href}
          class={`tab-link${tab.slug === nav.activeTabSlug ? " active" : ""}`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
