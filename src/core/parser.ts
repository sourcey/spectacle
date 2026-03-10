import { dereference } from "@readme/openapi-parser";
import type { LoadedSpec, OpenApiDocument, ParsedSpec } from "./types.js";

/**
 * Dereference a loaded spec document.
 * All $ref pointers are resolved (local, remote, circular).
 *
 * For local files, dereferences from the file path directly so
 * relative $refs resolve correctly against the file's directory.
 */
export async function parseSpec(loaded: LoadedSpec): Promise<ParsedSpec> {
  try {
    const isLocalFile =
      !loaded.source.startsWith("http://") && !loaded.source.startsWith("https://");

    let dereferenced: unknown;
    if (isLocalFile) {
      // Dereference from file path so relative $refs resolve correctly
      dereferenced = await dereference(loaded.source, {
        dereference: { circular: "ignore" },
      });
    } else {
      dereferenced = await dereference(structuredClone(loaded.raw) as never, {
        dereference: { circular: "ignore" },
      });
    }

    return {
      document: dereferenced as unknown as OpenApiDocument,
      source: loaded.source,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse OpenAPI spec: ${message}`);
  }
}
