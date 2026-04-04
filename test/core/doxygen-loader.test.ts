import { describe, it, expect } from "vitest";
import { normalizeDoxygenDescription } from "../../src/core/doxygen-loader.js";

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
      "Session type documented in a different group from [PacketStream](demo-PacketStream.html#packetstream).",
    );
  });

  it("keeps existing descriptions when no placeholder refs remain", () => {
    const description = "Packet pipeline primitive owned by the base module.";

    expect(normalizeDoxygenDescription(description, "## PacketStream")).toBe(description);
  });
});
