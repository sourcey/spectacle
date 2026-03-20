import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import type { SecurityRequirement } from "../../core/types.js";
import { SectionLabel } from "../ui/SectionLabel.js";
import { Markdown } from "../ui/Markdown.js";

interface SecurityProps {
  security: SecurityRequirement[];
}

/**
 * Per-operation security requirements.
 */
export function SecurityCopy({ security }: SecurityProps) {
  const spec = useContext(SpecContext);

  if (!security.length) return null;

  const hasEntries = security.some((req) => Object.keys(req).length > 0);
  if (!hasEntries) return null;

  return (
    <div class="mt-6">
      <SectionLabel>Authorization</SectionLabel>
      <div>
        {security.map((req, i) => (
          <div key={i}>
            {Object.entries(req).map(([name, scopes]) => {
              const scheme = spec.securitySchemes[name];
              return (
                <div key={name} class="py-4 border-b border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))] last:border-b-0">
                  <div class="flex items-baseline gap-2 flex-wrap font-mono text-sm">
                    <span class="font-semibold text-[rgb(var(--color-primary))] dark:text-[rgb(var(--color-primary-light))]">{name}</span>
                    {scheme && (
                      <span class="rounded-md bg-[rgb(var(--color-gray-100)/0.5)] px-2 py-0.5 text-xs font-medium text-[rgb(var(--color-gray-600))] dark:bg-[rgb(var(--color-surface-dark-tint)/0.05)] dark:text-[rgb(var(--color-gray-200))]">
                        {scheme.type}
                        {scheme.scheme && ` (${scheme.scheme})`}
                        {scheme.in && ` in ${scheme.in}`}
                      </span>
                    )}
                  </div>
                  {(scheme?.description || scopes.length > 0) && (
                    <div class="mt-2 text-sm text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-400))]">
                      {scheme?.description && <Markdown content={scheme.description} />}
                      {scopes.length > 0 && (
                        <p class="mt-1">Scopes: <code class="text-xs font-medium">{scopes.join(", ")}</code></p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Global authentication/security definitions section.
 */
export function SecurityDefinitions() {
  const spec = useContext(SpecContext);
  const schemes = Object.entries(spec.securitySchemes);

  if (!schemes.length) return null;

  return (
    <div id="authentication" class="py-8 border-t border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))]" data-traverse-target="authentication">
      <h2 class="text-xl font-bold text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))] mb-4">Authentication</h2>
      <div>
        {schemes.map(([name, scheme]) => (
          <div key={name} class="py-4 border-b border-[rgb(var(--color-gray-100))] dark:border-[rgb(var(--color-gray-800))] last:border-b-0">
            <div class="flex items-baseline gap-2 flex-wrap font-mono text-sm">
              <span class="font-semibold text-[rgb(var(--color-primary))] dark:text-[rgb(var(--color-primary-light))]">{name}</span>
              <span class="rounded-md bg-[rgb(var(--color-gray-100)/0.5)] px-2 py-0.5 text-xs font-medium text-[rgb(var(--color-gray-600))] dark:bg-[rgb(var(--color-surface-dark-tint)/0.05)] dark:text-[rgb(var(--color-gray-200))]">
                {scheme.type}
              </span>
            </div>
            <div class="mt-2 text-sm text-[rgb(var(--color-gray-700))] dark:text-[rgb(var(--color-gray-400))]">
              {scheme.description && <Markdown content={scheme.description} />}
              {scheme.type === "apiKey" && (
                <p class="mt-1">
                  API Key: <code class="text-xs font-medium">{scheme.name}</code> in {scheme.in}
                </p>
              )}
              {scheme.type === "http" && (
                <p class="mt-1">
                  Scheme: {scheme.scheme}
                  {scheme.bearerFormat && ` (${scheme.bearerFormat})`}
                </p>
              )}
              {scheme.type === "oauth2" && scheme.flows && (
                <div class="mt-2 space-y-2">
                  {Object.entries(scheme.flows).map(([flowType, flow]) => (
                    <div key={flowType}>
                      <strong class="text-[rgb(var(--color-gray-900))] dark:text-[rgb(var(--color-gray-200))]">{flowType}</strong>
                      {flow?.authorizationUrl && (
                        <p class="mt-1">Authorization: <code class="text-xs">{flow.authorizationUrl}</code></p>
                      )}
                      {flow?.tokenUrl && (
                        <p class="mt-1">Token: <code class="text-xs">{flow.tokenUrl}</code></p>
                      )}
                      {flow?.scopes && Object.keys(flow.scopes).length > 0 && (
                        <p class="mt-1">
                          Scopes:{" "}
                          {Object.entries(flow.scopes)
                            .map(([s, desc]) => `${s} — ${desc}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {scheme.type === "openIdConnect" && scheme.openIdConnectUrl && (
                <p class="mt-1">
                  OpenID Connect:{" "}
                  <a href={scheme.openIdConnectUrl} class="text-[rgb(var(--color-primary))] dark:text-[rgb(var(--color-primary-light))]">{scheme.openIdConnectUrl}</a>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
