import { useContext } from "preact/hooks";
import { NavigationContext, OptionsContext } from "../../renderer/context.js";

/**
 * Method pill for API sidebar navigation items.
 * Colored method badges.
 */
function MethodPill({ method }: { method: string }) {
  const m = method.toUpperCase();
  const label = m === "DELETE" ? "DEL" : m;

  // Method pill colors
  const colors: Record<string, string> = {
    GET: "bg-green-400/20 dark:bg-green-400/20 text-green-700 dark:text-green-400",
    POST: "bg-blue-400/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-400",
    PUT: "bg-yellow-400/20 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-400",
    DELETE: "bg-red-400/20 dark:bg-red-400/20 text-red-700 dark:text-red-400",
    DEL: "bg-red-400/20 dark:bg-red-400/20 text-red-700 dark:text-red-400",
    PATCH: "bg-orange-400/20 dark:bg-orange-400/20 text-orange-700 dark:text-orange-400",
  };

  return (
    <span class="flex items-center w-8 h-[1lh] shrink-0">
      <span class={`px-1 py-0.5 rounded-md text-[0.55rem] leading-tight font-bold ${colors[m] ?? "bg-gray-400/20 text-gray-700"}`}>
        {label}
      </span>
    </span>
  );
}

/**
 * Sidebar clean design:
 * - No border-right
 * - Bold group headers (not uppercase)
 * - Method pills for API operations
 * - Active item with primary bg/text and text-shadow trick
 */
export function Sidebar() {
  const nav = useContext(NavigationContext);
  const options = useContext(OptionsContext);
  const activeTab = nav.tabs.find((t) => t.slug === nav.activeTabSlug);
  if (!activeTab) return null;

  const base = options.assetBase;

  return (
    <div
      id="sidebar"
      class="z-20 hidden lg:block fixed bottom-0 right-auto w-[18rem]"
      style="top: var(--header-height)"
    >
      <div class="absolute inset-0 z-10 overflow-auto pr-8 pb-10" id="sidebar-content">
        <div class="relative lg:text-sm lg:leading-6">
          {/* Gradient fade at top */}
          <div class="sticky top-0 h-8 z-10 bg-gradient-to-b from-[rgb(var(--color-background-light))] dark:from-[rgb(var(--color-background-dark))]" />

          <nav id="nav" role="navigation">
            {activeTab.groups.map((group, gi) => (
              <div key={group.label} class={gi > 0 ? "mt-6 lg:mt-8" : ""}>
                {group.label && (
                  <div class="flex items-center gap-2.5 pl-4 mb-3.5 lg:mb-2.5 font-semibold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">
                    <h5>{group.label}</h5>
                  </div>
                )}
                <ul class="space-y-px">
                  {group.items.map((item) => {
                    const isActive = item.id === nav.activePageSlug;
                    return (
                      <li key={item.id} class="relative">
                        <a
                          href={`${base}${item.href}`}
                          class={`nav-link${isActive ? " active" : ""}`}
                        >
                          {item.method && <MethodPill method={item.method} />}
                          <div class="flex-1 break-words [word-break:break-word]">{item.label}</div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
