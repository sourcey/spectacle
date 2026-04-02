/**
 * Connection config card for MCP docs.
 * Rendered below Introduction in SpecPageContent.
 * Uses the same bordered card pattern as Introduction's Base URLs table.
 */

import type { McpConnectionInfo } from "../../core/types.js";

export function McpConnection({ connection }: { connection: McpConnectionInfo }) {
  const transport = connection.transport;
  if (!transport) return null;

  // Build the config JSON snippet
  const serverEntry: Record<string, unknown> = {};
  if (transport.type === "stdio") {
    if (transport.command) serverEntry.command = transport.command;
    if (transport.args?.length) serverEntry.args = transport.args;
  } else {
    if (transport.url) serverEntry.url = transport.url;
  }

  const configJson = JSON.stringify(
    { mcpServers: { [connection.serverName]: serverEntry } },
    null,
    2,
  );

  // Capabilities summary
  const caps: string[] = [];
  if (connection.capabilities) {
    if (connection.capabilities.tools) caps.push("tools");
    if (connection.capabilities.resources) caps.push("resources");
    if (connection.capabilities.prompts) caps.push("prompts");
    if (connection.capabilities.logging) caps.push("logging");
  }

  return (
    <div class="mb-8 rounded-[var(--radius)] border border-[rgb(var(--color-gray-200)/0.7)] dark:border-[rgb(var(--color-border-dark-subtle)/0.1)] overflow-hidden">
      <div class="px-4 py-2.5 text-xs font-semibold text-[rgb(var(--color-gray-600))] dark:text-[rgb(var(--color-gray-300))] border-b border-[rgb(var(--color-gray-200)/0.7)] dark:border-[rgb(var(--color-border-dark-subtle)/0.1)]">
        Connect
      </div>
      <div class="px-4 py-3">
        <p class="text-sm text-[rgb(var(--color-gray-500))] mb-3">
          Add to your MCP client configuration:
        </p>
        <div class="code-group not-prose">
          <div class="relative w-full px-4 py-3.5 text-sm leading-6 bg-[rgb(var(--color-code-block-light))] dark:bg-[rgb(var(--color-code-block-dark))] overflow-x-auto rounded-[var(--radius)]" style="font-variant-ligatures: none">
            <div class="font-mono whitespace-pre text-xs leading-[1.35rem] text-[rgb(var(--color-gray-800))] dark:text-[rgb(var(--color-gray-200))]">
              {configJson}
            </div>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[rgb(var(--color-gray-500))]">
          {connection.mcpVersion && (
            <span>Protocol <span class="font-medium text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-300))]">MCP {connection.mcpVersion}</span></span>
          )}
          <span>Transport <span class="font-medium text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-300))]">{transport.type}</span></span>
          {caps.length > 0 && (
            <span>Capabilities <span class="font-medium text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-300))]">{caps.join(", ")}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}
