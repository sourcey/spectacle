import { loadSpec } from "./core/loader.js";
import { convertToOpenApi3 } from "./core/converter.js";
import { parseSpec } from "./core/parser.js";
import { normalizeSpec } from "./core/normalizer.js";
import { buildHtml } from "./renderer/html-builder.js";
import type { NormalizedSpec } from "./core/types.js";

export interface ThemeOverrides {
  /** CSS custom property overrides, e.g. { "--color-accent": "#e11d48" } */
  [key: string]: string;
}

export interface BuildOptions {
  /** Path or URL to the OpenAPI/Swagger spec file */
  specSource: string;
  /** Output directory (default: "dist") */
  outputDir?: string;
  /** Path to a custom logo file */
  logo?: string;
  /** Path to a custom favicon */
  favicon?: string;
  /** Embed all assets into a single HTML file */
  singleFile?: boolean;
  /** Generate embeddable output (no <html>/<body> tags) */
  embeddable?: boolean;
  /** Skip writing files to disk (useful for programmatic API) */
  skipWrite?: boolean;
  /** CSS custom property overrides for theming */
  themeOverrides?: ThemeOverrides;
}

export interface BuildResult {
  /** The normalized spec that was processed */
  spec: NormalizedSpec;
  /** Output directory where files were written */
  outputDir: string;
  /** Path to the generated index.html (if written) */
  htmlPath?: string;
}

/**
 * Build API documentation from an OpenAPI/Swagger spec.
 *
 * This is the main programmatic API entry point.
 */
export async function buildDocs(options: BuildOptions): Promise<BuildResult> {
  const outputDir = options.outputDir ?? "dist";

  // 1. Load the spec file
  const loaded = await loadSpec(options.specSource);

  // 2. Dereference all $refs (using original file path for relative ref resolution)
  const parsed = await parseSpec(loaded);

  // 3. Convert Swagger 2.0 → OpenAPI 3.x if needed (after dereferencing)
  const openapi3 = await convertToOpenApi3(parsed);

  // 4. Normalize into internal representation
  const spec = normalizeSpec(openapi3);

  // Override branding if provided via options
  if (options.logo) {
    spec.info.logo = options.logo;
  }
  if (options.favicon) {
    spec.info.favicon = options.favicon;
  }

  // 5. Render components → HTML and write output files
  if (!options.skipWrite) {
    const output = await buildHtml(spec, outputDir, {
      embeddable: options.embeddable,
      singleFile: options.singleFile,
      themeOverrides: options.themeOverrides,
    });
    return { spec, outputDir, htmlPath: output.htmlPath };
  }

  return { spec, outputDir };
}

// Re-export types for consumers
export type {
  NormalizedSpec,
  NormalizedOperation,
  NormalizedTag,
  NormalizedSchema,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
} from "./core/types.js";
