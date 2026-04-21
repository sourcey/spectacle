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

function rgbaCss(triplet: string, alpha: number): string {
  return `rgba(${triplet.replace(/ /g, ", ")}, ${alpha})`;
}

function ogCard({ title, description, siteName, theme, logo }: OgImageOptions) {
  const primary = rgbCss(theme.colors.primary);
  const primaryGlow = rgbaCss(theme.colors.primary, 0.18);

  const displayTitle = title.length > 90 ? title.slice(0, 87) + "..." : title;
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
        backgroundColor: "#0f172a",
        padding: "72px",
        fontFamily: "Inter",
        backgroundImage: `radial-gradient(ellipse 70% 50% at 20% 70%, ${primaryGlow}, transparent 70%)`,
      },
      children: [
        // Brand block: logo (or coloured mark) + site name, top-left
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "14px" },
            children: [
              logo
                ? {
                    type: "img",
                    props: {
                      src: logo,
                      width: 48,
                      height: 48,
                      style: { borderRadius: "8px" },
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        width: "14px",
                        height: "14px",
                        backgroundColor: primary,
                        borderRadius: "4px",
                      },
                    },
                  },
              ...(siteName
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#ffffff",
                          letterSpacing: "-0.02em",
                        },
                        children: siteName,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        // Middle: vertical accent bar + title + description
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flex: 1,
              alignItems: "center",
              marginTop: "48px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "4px",
                    alignSelf: "stretch",
                    backgroundColor: primary,
                    borderRadius: "2px",
                    marginRight: "32px",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", flex: 1 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 64,
                          fontWeight: 700,
                          color: "#ffffff",
                          lineHeight: 1.1,
                          letterSpacing: "-0.02em",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
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
                                fontSize: 26,
                                fontWeight: 400,
                                color: "#cbd5e1",
                                marginTop: "24px",
                                lineHeight: 1.4,
                                letterSpacing: "-0.005em",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              },
                              children: displayDesc,
                            },
                          },
                        ]
                      : []),
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
