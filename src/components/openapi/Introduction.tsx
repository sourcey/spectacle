import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import { Markdown } from "../ui/Markdown.js";

/**
 * API introduction: description, contact info, server URLs.
 * Single-column layout; servers shown as a simple list.
 */
export function Introduction() {
  const spec = useContext(SpecContext);
  const { info, servers } = spec;

  return (
    <div id="introduction" data-traverse-target="introduction" class="mb-8">
      {info.description && (
        <Markdown content={info.description} class="max-w-none" />
      )}

      {info.termsOfService && (
        <p class="mt-4 text-sm text-[rgb(var(--color-gray-500))]">
          <a href={info.termsOfService} class="text-[rgb(var(--color-primary))] dark:text-[rgb(var(--color-primary-light))]">Terms of Service</a>
        </p>
      )}

      {info.contact?.email && (
        <p class="mt-2 text-sm text-[rgb(var(--color-gray-500))]">
          Contact: <a href={`mailto:${info.contact.email}`} class="text-[rgb(var(--color-primary))] dark:text-[rgb(var(--color-primary-light))]">{info.contact.email}</a>
        </p>
      )}

      {servers.length > 0 && (
        <div class="mt-6 rounded-[var(--radius)] border border-[rgb(var(--color-gray-200)/0.7)] dark:border-[rgb(var(--color-border-dark-subtle)/0.1)] overflow-hidden">
          <div class="px-4 py-2.5 text-xs font-semibold text-[rgb(var(--color-gray-600))] dark:text-[rgb(var(--color-gray-300))] border-b border-[rgb(var(--color-gray-200)/0.7)] dark:border-[rgb(var(--color-border-dark-subtle)/0.1)]">
            Base URL{servers.length > 1 ? "s" : ""}
          </div>
          {servers.map((s, i) => (
            <div key={i} class={`flex items-baseline gap-3 px-4 py-2 ${i > 0 ? "border-t border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))]" : ""}`}>
              <code class="font-mono text-sm text-[rgb(var(--color-gray-800))] dark:text-[rgb(var(--color-gray-200))]">{s.url}</code>
              {s.description && (
                <span class="text-xs text-[rgb(var(--color-gray-500))]">{s.description}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
