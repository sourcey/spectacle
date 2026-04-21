import { $RefParser } from "@apidevtools/json-schema-ref-parser";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { LoadedSpec, OpenApiDocument, ParsedSpec } from "./types.js";

/**
 * Dereference a loaded spec document.
 * All $ref pointers are resolved (local, remote, circular).
 *
 * Uses the document source as the base URI, but honors OpenAPI 3.2's
 * `$self` field when present so relative references resolve canonically.
 */
export async function parseSpec(loaded: LoadedSpec): Promise<ParsedSpec> {
  try {
    const parser = new $RefParser();
    const dereferenced = await parser.dereference(
      resolveDocumentUri(loaded),
      structuredClone(loaded.raw) as never,
      { dereference: { circular: "ignore" } },
    );

    return {
      document: dereferenced as unknown as OpenApiDocument,
      source: loaded.source,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse OpenAPI spec: ${message}`);
  }
}

function resolveDocumentUri(loaded: LoadedSpec): string {
  const self = typeof loaded.raw["$self"] === "string" ? loaded.raw["$self"] : undefined;
  if (!self) return loaded.source;

  try {
    if (loaded.source.startsWith("http://") || loaded.source.startsWith("https://")) {
      return new URL(self, loaded.source).toString();
    }

    const resolved = new URL(self, pathToFileURL(loaded.source));
    return resolved.protocol === "file:"
      ? fileURLToPath(resolved)
      : resolved.toString();
  } catch {
    return loaded.source;
  }
}
