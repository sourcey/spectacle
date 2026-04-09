import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedTheme } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface OgImageOptions {
  title: string;
  description?: string;
  siteName: string;
  theme: ResolvedTheme;
  logo?: string; // data URI or URL
}

// ---------------------------------------------------------------------------
// Font loading (cached across all pages)
// ---------------------------------------------------------------------------

let fontsCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (fontsCache) return fontsCache;

  // Works from both src/ (dev) and dist/ (published)
  const fontsDir = resolve(__dirname, "fonts");
  const [regular, bold] = await Promise.all([
    readFile(resolve(fontsDir, "Inter-Regular.ttf")),
    readFile(resolve(fontsDir, "Inter-Bold.ttf")),
  ]);

  fontsCache = {
    regular: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength),
    bold: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength),
  };
  return fontsCache;
}

// ---------------------------------------------------------------------------
// OG card template
// ---------------------------------------------------------------------------

function rgbCss(triplet: string): string {
  return `rgb(${triplet.replace(/ /g, ", ")})`;
}

function ogCard({ title, description, siteName, theme, logo }: OgImageOptions) {
  const primary = rgbCss(theme.colors.primary);
  const primaryLight = rgbCss(theme.colors.light);

  // Truncate long titles/descriptions
  const displayTitle = title.length > 80 ? title.slice(0, 77) + "..." : title;
  const displayDesc = description
    ? description.length > 160 ? description.slice(0, 157) + "..." : description
    : undefined;

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#0b0c10",
        padding: "64px",
        fontFamily: "Inter",
        backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 130%, ${primary}40, transparent)`,
      },
      children: [
        // Top: logo + site name
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "16px",
            },
            children: [
              ...(logo
                ? [
                    {
                      type: "img",
                      props: {
                        src: logo,
                        width: 40,
                        height: 40,
                        style: { borderRadius: "8px" },
                      },
                    },
                  ]
                : []),
              ...(siteName
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 20,
                          fontWeight: 400,
                          color: "#9ca3af",
                          letterSpacing: "-0.01em",
                        },
                        children: siteName,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        // Middle: title + description (pushed to center via flex)
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 56,
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.15,
                    letterSpacing: "-0.03em",
                  },
                  children: displayTitle,
                },
              },
              ...(displayDesc
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 24,
                          fontWeight: 400,
                          color: "#6b7280",
                          marginTop: "20px",
                          lineHeight: 1.4,
                          letterSpacing: "-0.01em",
                        },
                        children: displayDesc,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        // Bottom: accent line + footer
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
            },
            children: [
              // Gradient accent line
              {
                type: "div",
                props: {
                  style: {
                    width: "100%",
                    height: "2px",
                    backgroundImage: `linear-gradient(to right, ${primary}, ${primaryLight}, transparent)`,
                    marginBottom: "20px",
                  },
                },
              },
              // Footer row
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 16,
                          fontWeight: 400,
                          color: "#4b5563",
                        },
                        children: siteName || "",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: 15,
                          fontWeight: 400,
                          color: "#374151",
                        },
                        children: "sourcey.com",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateOgImage(options: OgImageOptions): Promise<Buffer> {
  const fonts = await loadFonts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await satori(ogCard(options) as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Inter", data: fonts.regular, weight: 400, style: "normal" as const },
      { name: "Inter", data: fonts.bold, weight: 700, style: "normal" as const },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width" as const, value: 1200 },
  });
  const png = resvg.render();
  return Buffer.from(png.asPng());
}
