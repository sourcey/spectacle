import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import type { SecurityRequirement } from "../../core/types.js";
import { SectionLabel } from "../ui/SectionLabel.js";

interface SecurityProps {
  security: SecurityRequirement[];
}

/**
 * Left-side: per-operation security requirements.
 */
export function SecurityCopy({ security }: SecurityProps) {
  const spec = useContext(SpecContext);

  if (!security.length) return null;

  const hasEntries = security.some((req) => Object.keys(req).length > 0);
  if (!hasEntries) return null;

  return (
    <div class="content-section">
      <SectionLabel>Authorization</SectionLabel>
      <div class="params-list">
        {security.map((req, i) => (
          <div key={i}>
            {Object.entries(req).map(([name, scopes]) => {
              const scheme = spec.securitySchemes[name];
              return (
                <div key={name} class="param-item">
                  <div class="param-header">
                    <code class="param-name">{name}</code>
                    {scheme && (
                      <span class="param-type">
                        {scheme.type}
                        {scheme.scheme && ` (${scheme.scheme})`}
                        {scheme.in && ` in ${scheme.in}`}
                      </span>
                    )}
                  </div>
                  {(scheme?.description || scopes.length > 0) && (
                    <div class="param-description">
                      {scheme?.description && <p>{scheme.description}</p>}
                      {scopes.length > 0 && (
                        <p>Scopes: <code class="param-name">{scopes.join(", ")}</code></p>
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
    <div id="authentication" class="auth-section" data-traverse-target="authentication">
      <div class="auth-header">
        <h2>Authentication</h2>
      </div>
      <div class="doc-row">
        <div class="doc-copy">
          <div class="params-list">
            {schemes.map(([name, scheme]) => (
              <div key={name} class="param-item">
                <div class="param-header">
                  <code class="param-name">{name}</code>
                  <span class="param-type">{scheme.type}</span>
                </div>
                <div class="param-description">
                  {scheme.description && <p>{scheme.description}</p>}
                  {scheme.type === "apiKey" && (
                    <p>
                      API Key: <code class="param-name">{scheme.name}</code> in {scheme.in}
                    </p>
                  )}
                  {scheme.type === "http" && (
                    <p>
                      Scheme: {scheme.scheme}
                      {scheme.bearerFormat && ` (${scheme.bearerFormat})`}
                    </p>
                  )}
                  {scheme.type === "oauth2" && scheme.flows && (
                    <div>
                      {Object.entries(scheme.flows).map(([flowType, flow]) => (
                        <div key={flowType}>
                          <strong>{flowType}</strong>
                          {flow?.authorizationUrl && (
                            <p>Authorization: <code class="param-name">{flow.authorizationUrl}</code></p>
                          )}
                          {flow?.tokenUrl && (
                            <p>Token: <code class="param-name">{flow.tokenUrl}</code></p>
                          )}
                          {flow?.scopes && Object.keys(flow.scopes).length > 0 && (
                            <p>
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
                    <p>
                      OpenID Connect:{" "}
                      <a href={scheme.openIdConnectUrl}>{scheme.openIdConnectUrl}</a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
