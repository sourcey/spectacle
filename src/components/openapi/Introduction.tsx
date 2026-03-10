import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import { Markdown } from "../ui/Markdown.js";

export function Introduction() {
  const spec = useContext(SpecContext);
  const { info, servers } = spec;

  return (
    <div id="introduction" data-traverse-target="introduction">
      <div class="doc-row">
        <div class="doc-copy">
          {info.description && <Markdown content={info.description} />}

          {info.termsOfService && (
            <p class="intro-meta">
              <a href={info.termsOfService}>Terms of Service</a>
            </p>
          )}

          {info.contact?.email && (
            <p class="intro-meta">
              Contact: <a href={`mailto:${info.contact.email}`}>{info.contact.email}</a>
            </p>
          )}
        </div>
        <div class="doc-examples">
          {servers.length > 0 && (
            <div class="example-block">
              <div class="example-block-header">
                Base URL{servers.length > 1 ? "s" : ""}
              </div>
              {servers.map((s, i) => (
                <div key={i} class="server-url-item">
                  <code class="server-url">{s.url}</code>
                  {s.description && (
                    <span class="server-description">{s.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {info.version && (
            <div class="example-block">
              <div class="example-block-header">Version</div>
              <div class="server-url-item">
                <code class="server-url">{info.version}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
