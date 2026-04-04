/**
 * endpoint bar showing method, path, and server URL.
 * Displayed at the top of each operation.
 */

const METHOD_COLORS: Record<string, string> = {
  get: "bg-green-100 dark:bg-green-400/20 text-green-800 dark:text-green-300",
  post: "bg-blue-100 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300",
  put: "bg-amber-100 dark:bg-yellow-400/20 text-amber-900 dark:text-yellow-300",
  delete: "bg-red-100 dark:bg-red-400/20 text-red-800 dark:text-red-300",
  patch: "bg-orange-100 dark:bg-orange-400/20 text-orange-900 dark:text-orange-300",
};

interface EndpointBarProps {
  method: string;
  path: string;
  serverUrl: string;
}

export function EndpointBar({ method, path, serverUrl }: EndpointBarProps) {
  const m = method.toLowerCase();
  const colorClass = METHOD_COLORS[m] ?? "bg-gray-400/20 text-gray-700";

  // Split path into segments for styled rendering
  const segments = path.split("/").filter(Boolean);

  return (
    <div class="flex items-center gap-2 rounded-[var(--radius)] border border-[rgb(var(--color-gray-200)/0.7)] dark:border-[rgb(var(--color-border-dark-subtle)/0.1)] px-3 py-2.5 mb-6 overflow-hidden">
      {/* Method pill */}
      <div class={`rounded-lg font-bold px-1.5 py-0.5 text-sm leading-5 shrink-0 ${colorClass}`}>
        {method.toUpperCase()}
      </div>

      {/* URL display */}
      <div class="flex items-center overflow-x-auto flex-1 no-scrollbar gap-0.5 font-mono">
        <span class="text-sm text-[rgb(var(--color-gray-500))] dark:text-[rgb(var(--color-gray-500))] shrink-0">
          {serverUrl}
        </span>
        {segments.map((seg, i) => (
          <span key={i} class="flex items-center shrink-0">
            <span class="text-sm text-[rgb(var(--color-gray-400))]">/</span>
            <span class="text-sm font-medium text-[rgb(var(--color-gray-800))] dark:text-[rgb(var(--color-gray-50))]">
              {seg}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
