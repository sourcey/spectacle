import { describe, it, expect } from "vitest";
import {
  normalizeDoxygenDescription,
  rewriteGeneratedDoxygenIncludePath,
  rewriteGeneratedDoxygenMarkdown,
  rewriteGeneratedDoxygenHref,
  rewriteGeneratedDoxygenHtmlLinks,
} from "../../src/core/doxygen-loader.js";

describe("normalizeDoxygenDescription", () => {
  it("falls back to the resolved lead paragraph when the summary still contains Doxygen ref placeholders", () => {
    const description =
      "Session type documented in a different group from [PacketStream]({#ref classdemo_1_1PacketStream #}).";
    const markdown = `<a id="peersession"></a>

## PeerSession

\`\`\`cpp
#include <webrtc.h>
\`\`\`

> **Inherits:** \`Base\`

Session type documented in a different group from [PacketStream](demo-PacketStream.html#packetstream).

### Public Methods`;

    expect(normalizeDoxygenDescription(description, markdown)).toBe(
      "Session type documented in a different group from PacketStream.",
    );
  });

  it("returns plain-text descriptions when no placeholder refs remain", () => {
    const description = "Packet pipeline primitive owned by the [base](base.html) module.";

    expect(normalizeDoxygenDescription(description, "## PacketStream")).toBe(
      "Packet pipeline primitive owned by the base module.",
    );
  });

  it("rewrites moxygen api_*.md hrefs to generated html pages", () => {
    expect(rewriteGeneratedDoxygenHref("api_icy--uv.md#defaultloop")).toBe("icy-uv.html#defaultloop");
    expect(rewriteGeneratedDoxygenHref("api_icy.md#slot")).toBe("icy.html#slot");
  });

  it("rewrites code-wrapped markdown links left by moxygen", () => {
    const html = "<p>Use <code>[slot()](api_icy.md#slot)</code> and <a href=\"api_icy--wrtc.md#createvideotrack\">createVideoTrack()</a>.</p>";

    expect(rewriteGeneratedDoxygenHtmlLinks(html)).toBe(
      "<p>Use <a href=\"icy.html#slot\"><code>slot()</code></a> and <a href=\"icy-wrtc.html#createvideotrack\">createVideoTrack()</a>.</p>",
    );
  });

  it("strips machine-local prefixes from generated include paths", () => {
    expect(rewriteGeneratedDoxygenIncludePath("/home/kam/dev/icey/src/graft/include/icy/graft/graft.h")).toBe("icy/graft/graft.h");
    expect(rewriteGeneratedDoxygenIncludePath("/home/kam/dev/icey/src/symple/src/server/detail.h")).toBe("src/symple/src/server/detail.h");
  });

  it("rewrites generated markdown include directives before rendering", () => {
    const markdown = [
      "```cpp",
      "#include </home/kam/dev/icey/src/graft/include/icy/graft/graft.h>",
      "#include </home/kam/dev/icey/src/symple/src/server/detail.h>",
      "```",
    ].join("\n");

    expect(rewriteGeneratedDoxygenMarkdown(markdown)).toBe([
      "```cpp",
      "#include <icy/graft/graft.h>",
      "#include <src/symple/src/server/detail.h>",
      "```",
    ].join("\n"));
  });
});
