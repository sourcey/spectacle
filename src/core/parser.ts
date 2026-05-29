import { $RefParser } from "@apidevtools/json-schema-ref-parser";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
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
      {
        dereference: {
          circular: "ignore",
          onDereference(ref: string, value: unknown) {
            const refName = refNameFromRef(ref);
            if (refName && isRecord(value) && typeof value["x-ref-name"] !== "string") {
              value["x-ref-name"] = refName;
            }
          },
        },
        resolve: {
          http: false,
          file: createConfinedFileResolver(loaded),
        },
      },
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

function createConfinedFileResolver(loaded: LoadedSpec):
  | false
  | {
      order: number;
      canRead(file: { url: string }): boolean;
      read(file: { url: string }): Promise<Buffer>;
    } {
  const root = localSpecRoot(loaded.source);
  if (!root) return false;

  return {
    order: 1,
    canRead(file) {
      return filePathFromRef(file.url) !== null;
    },
    async read(file) {
      const filePath = filePathFromRef(file.url);
      if (!filePath) throw new Error(`Unsupported external $ref URI: ${file.url}`);
      const resolved = resolve(filePath);
      if (!isWithinRoot(root, resolved)) {
        throw new Error(`External $ref resolves outside the spec directory: ${file.url}`);
      }
      return readFile(resolved);
    },
  };
}

function localSpecRoot(source: string): string | null {
  if (source.startsWith("http://") || source.startsWith("https://")) return null;
  return dirname(resolve(source));
}

function filePathFromRef(refUrl: string): string | null {
  const withoutHash = refUrl.split("#", 1)[0];
  if (!withoutHash) return null;
  if (/^file:/i.test(withoutHash)) {
    try {
      return fileURLToPath(withoutHash);
    } catch {
      return null;
    }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(withoutHash)) return null;
  return resolve(withoutHash);
}

function isWithinRoot(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function refNameFromRef(ref: string): string | null {
  const pointer = ref.includes("#") ? ref.slice(ref.indexOf("#") + 1) : ref;
  const segments = pointer.split("/").filter(Boolean);
  const raw = segments.at(-1);
  if (!raw) return null;
  return raw.replace(/~1/g, "/").replace(/~0/g, "~");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveDocumentUri(loaded: LoadedSpec): string {
  const self = typeof loaded.raw["$self"] === "string" ? loaded.raw["$self"] : undefined;
  if (!self) return loaded.source;

  try {
    if (loaded.source.startsWith("http://") || loaded.source.startsWith("https://")) {
      return new URL(self, loaded.source).toString();
    }

    const resolved = new URL(self, pathToFileURL(loaded.source));
    return resolved.protocol === "file:" ? fileURLToPath(resolved) : resolved.toString();
  } catch {
    return loaded.source;
  }
}
