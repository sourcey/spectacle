import type {
  OpenApiDocument,
  ParsedSpec,
  NormalizedSpec,
  NormalizedTag,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedSchema,
  NormalizedCallback,
  MediaTypeContent,
  SecurityScheme,
  SecuritySchemeType,
  ServerDefinition,
  ServerVariable,
  HttpMethod,
  ExternalDocs,
  OAuthFlows,
  OAuthFlow,
  LinkObject,
  ExampleObject,
  CodeSample,
  DiscriminatorObject,
} from "./types.js";

const HTTP_METHODS: HttpMethod[] = [
  "get", "post", "put", "delete", "patch", "options", "head", "trace",
];

/**
 * Transform a fully dereferenced OpenAPI 3.x document into a NormalizedSpec.
 * This is the single point where spec-format-specific logic lives.
 */
export function normalizeSpec(parsed: ParsedSpec): NormalizedSpec {
  const doc = parsed.document;

  const schemas = normalizeSchemas(doc.components?.schemas);
  const securitySchemes = normalizeSecuritySchemes(doc.components?.securitySchemes);
  const servers = normalizeServers(doc.servers);
  const operations = normalizeOperations(doc.paths, doc.security);
  const webhooks = normalizeWebhooks(doc.webhooks);
  const tags = normalizeTags(doc.tags, operations);

  return {
    info: normalizeInfo(doc),
    servers,
    tags,
    operations,
    schemas,
    securitySchemes,
    webhooks,
    externalDocs: normalizeExternalDocs(doc.externalDocs),
  };
}

// ── Info ───────────────────────────────────────────────────────────

function normalizeInfo(doc: OpenApiDocument) {
  const info = doc.info ?? {};
  return {
    title: str(info.title, "Untitled API"),
    version: str(info.version, "0.0.0"),
    description: optStr(info.description),
    termsOfService: optStr(info.termsOfService),
    contact: info.contact
      ? {
          name: optStr((info.contact as Record<string, unknown>).name),
          url: optStr((info.contact as Record<string, unknown>).url),
          email: optStr((info.contact as Record<string, unknown>).email),
        }
      : undefined,
    license: info.license
      ? {
          name: str((info.license as Record<string, unknown>).name, ""),
          url: optStr((info.license as Record<string, unknown>).url),
          identifier: optStr((info.license as Record<string, unknown>).identifier),
        }
      : undefined,
    logo: optStr((info as Record<string, unknown>)["x-logo"]),
  };
}

// ── Servers ────────────────────────────────────────────────────────

function normalizeServers(
  servers?: Record<string, unknown>[],
): ServerDefinition[] {
  if (!servers?.length) return [{ url: "/" }];
  return servers.map((s) => ({
    url: str(s.url, "/"),
    description: optStr(s.description),
    variables: s.variables
      ? normalizeServerVariables(s.variables as Record<string, Record<string, unknown>>)
      : undefined,
  }));
}

function normalizeServerVariables(
  vars: Record<string, Record<string, unknown>>,
): Record<string, ServerVariable> {
  const result: Record<string, ServerVariable> = {};
  for (const [key, v] of Object.entries(vars)) {
    result[key] = {
      default: str(v.default, ""),
      description: optStr(v.description),
      enum: Array.isArray(v.enum) ? v.enum.map(String) : undefined,
    };
  }
  return result;
}

// ── Tags ───────────────────────────────────────────────────────────

function normalizeTags(
  rawTags: Record<string, unknown>[] | undefined,
  operations: NormalizedOperation[],
): NormalizedTag[] {
  // Build a map of defined tags
  const tagMap = new Map<string, NormalizedTag>();
  if (rawTags) {
    for (const t of rawTags) {
      const name = str(t.name, "");
      if (name) {
        tagMap.set(name, {
          name,
          description: optStr(t.description),
          externalDocs: normalizeExternalDocs(
            t.externalDocs as Record<string, unknown> | undefined,
          ),
          operations: [],
          hidden: t["x-spectacle-hide"] === true,
        });
      }
    }
  }

  // Assign operations to tags, creating implicit tags as needed
  for (const op of operations) {
    if (op.hidden) continue;
    const opTags = op.tags.length > 0 ? op.tags : ["default"];
    for (const tagName of opTags) {
      if (!tagMap.has(tagName)) {
        // Implicit tag creation (legacy behavior from preprocessor.js)
        tagMap.set(tagName, {
          name: tagName,
          operations: [],
        });
      }
      tagMap.get(tagName)!.operations.push(op);
    }
  }

  // Filter out tags with no operations (unless they have a description)
  return Array.from(tagMap.values()).filter(
    (t) => t.operations.length > 0 || t.description,
  );
}

// ── Operations ─────────────────────────────────────────────────────

function normalizeOperations(
  paths?: Record<string, Record<string, unknown>>,
  globalSecurity?: Record<string, string[]>[],
): NormalizedOperation[] {
  if (!paths) return [];
  const operations: NormalizedOperation[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    const pathParams = normalizeParameters(
      pathItem.parameters as Record<string, unknown>[] | undefined,
    );

    for (const method of HTTP_METHODS) {
      const opRaw = pathItem[method] as Record<string, unknown> | undefined;
      if (!opRaw) continue;

      const opParams = normalizeParameters(
        opRaw.parameters as Record<string, unknown>[] | undefined,
      );

      // Merge path-level + operation-level params, deduping by name+in
      const mergedParams = deduplicateParameters([...pathParams, ...opParams]);

      const op: NormalizedOperation = {
        operationId: optStr(opRaw.operationId),
        summary: optStr(opRaw.summary),
        description: optStr(opRaw.description),
        method,
        path,
        tags: Array.isArray(opRaw.tags) ? opRaw.tags.map(String) : [],
        parameters: mergedParams,
        requestBody: normalizeRequestBody(
          opRaw.requestBody as Record<string, unknown> | undefined,
        ),
        responses: normalizeResponses(
          opRaw.responses as Record<string, Record<string, unknown>> | undefined,
        ),
        security: normalizeSecurityRequirements(
          opRaw.security as Record<string, string[]>[] | undefined,
          globalSecurity,
        ),
        deprecated: opRaw.deprecated === true,
        servers: opRaw.servers
          ? normalizeServers(opRaw.servers as Record<string, unknown>[])
          : undefined,
        externalDocs: normalizeExternalDocs(
          opRaw.externalDocs as Record<string, unknown> | undefined,
        ),
        callbacks: normalizeCallbacks(
          opRaw.callbacks as Record<string, Record<string, unknown>> | undefined,
        ),
        hidden: opRaw["x-spectacle-hide"] === true,
        codeSamples: normalizeCodeSamples(
          opRaw["x-spectacle-code-samples"] as Record<string, unknown>[] | undefined,
          opRaw["x-code-samples"] as Record<string, unknown>[] | undefined,
        ),
      };

      operations.push(op);
    }
  }

  return operations;
}

/**
 * Deduplicate parameters by (name, in) — operation-level params
 * override path-level params with the same identity.
 */
function deduplicateParameters(params: NormalizedParameter[]): NormalizedParameter[] {
  const seen = new Map<string, NormalizedParameter>();
  // Process in order: path-level first, then operation-level.
  // Later entries (operation-level) override earlier ones (path-level).
  for (const p of params) {
    seen.set(`${p.in}:${p.name}`, p);
  }
  return Array.from(seen.values());
}

function normalizeParameters(
  params?: Record<string, unknown>[],
): NormalizedParameter[] {
  if (!params) return [];
  return params.map((p) => ({
    name: str(p.name, ""),
    in: str(p.in, "query") as NormalizedParameter["in"],
    description: optStr(p.description),
    required: p.required === true,
    deprecated: p.deprecated === true,
    schema: p.schema
      ? normalizeSchema(p.schema as Record<string, unknown>)
      : undefined,
    example: p.example,
    examples: p.examples
      ? normalizeExamples(p.examples as Record<string, Record<string, unknown>>)
      : undefined,
  }));
}

function normalizeRequestBody(
  body?: Record<string, unknown>,
): NormalizedRequestBody | undefined {
  if (!body) return undefined;
  return {
    description: optStr(body.description),
    required: body.required === true,
    content: normalizeContent(
      body.content as Record<string, Record<string, unknown>> | undefined,
    ),
  };
}

function normalizeContent(
  content?: Record<string, Record<string, unknown>>,
): Record<string, MediaTypeContent> {
  if (!content) return {};
  const result: Record<string, MediaTypeContent> = {};
  for (const [mediaType, value] of Object.entries(content)) {
    result[mediaType] = {
      schema: value.schema
        ? normalizeSchema(value.schema as Record<string, unknown>)
        : undefined,
      example: value.example,
      examples: value.examples
        ? normalizeExamples(value.examples as Record<string, Record<string, unknown>>)
        : undefined,
    };
  }
  return result;
}

function normalizeResponses(
  responses?: Record<string, Record<string, unknown>>,
): NormalizedResponse[] {
  if (!responses) return [];
  return Object.entries(responses).map(([statusCode, r]) => ({
    statusCode,
    description: str(r.description, ""),
    content: r.content
      ? normalizeContent(r.content as Record<string, Record<string, unknown>>)
      : undefined,
    headers: r.headers
      ? normalizeResponseHeaders(r.headers as Record<string, Record<string, unknown>>)
      : undefined,
    links: r.links
      ? normalizeLinks(r.links as Record<string, Record<string, unknown>>)
      : undefined,
  }));
}

function normalizeResponseHeaders(
  headers: Record<string, Record<string, unknown>>,
): Record<string, NormalizedParameter> {
  const result: Record<string, NormalizedParameter> = {};
  for (const [name, h] of Object.entries(headers)) {
    result[name] = {
      name,
      in: "header",
      description: optStr(h.description),
      required: h.required === true,
      deprecated: h.deprecated === true,
      schema: h.schema
        ? normalizeSchema(h.schema as Record<string, unknown>)
        : undefined,
    };
  }
  return result;
}

function normalizeLinks(
  links: Record<string, Record<string, unknown>>,
): Record<string, LinkObject> {
  const result: Record<string, LinkObject> = {};
  for (const [name, l] of Object.entries(links)) {
    result[name] = {
      operationId: optStr(l.operationId),
      operationRef: optStr(l.operationRef),
      description: optStr(l.description),
      parameters: l.parameters as Record<string, unknown> | undefined,
      requestBody: l.requestBody,
      server: l.server
        ? normalizeServers([l.server as Record<string, unknown>])[0]
        : undefined,
    };
  }
  return result;
}

function normalizeCallbacks(
  callbacks?: Record<string, Record<string, unknown>>,
): Record<string, NormalizedCallback> | undefined {
  if (!callbacks) return undefined;
  const result: Record<string, NormalizedCallback> = {};
  for (const [expression, pathItem] of Object.entries(callbacks)) {
    result[expression] = {
      expression,
      operations: normalizeOperations({ [expression]: pathItem }),
    };
  }
  return result;
}

function normalizeSecurityRequirements(
  opSecurity?: Record<string, string[]>[],
  globalSecurity?: Record<string, string[]>[],
): Record<string, string[]>[] {
  // Operation security overrides global
  return (opSecurity ?? globalSecurity ?? []) as Record<string, string[]>[];
}

function normalizeCodeSamples(
  spectacleSamples?: Record<string, unknown>[],
  genericSamples?: Record<string, unknown>[],
): CodeSample[] | undefined {
  const samples = spectacleSamples ?? genericSamples;
  if (!samples?.length) return undefined;
  return samples.map((s) => ({
    lang: str(s.lang, "text"),
    label: optStr(s.label),
    source: str(s.source, ""),
  }));
}

// ── Schemas ────────────────────────────────────────────────────────

function normalizeSchemas(
  schemas?: Record<string, unknown>,
): Record<string, NormalizedSchema> {
  if (!schemas) return {};
  const result: Record<string, NormalizedSchema> = {};
  for (const [name, s] of Object.entries(schemas)) {
    result[name] = normalizeSchema(s as Record<string, unknown>, name);
  }
  return result;
}

function normalizeSchema(
  schema: Record<string, unknown>,
  name?: string,
): NormalizedSchema {
  // Handle nullable: OpenAPI 3.0 uses x-nullable or nullable,
  // OpenAPI 3.1 uses type: ["string", "null"]
  let type = schema.type as string | string[] | undefined;
  let nullable = schema.nullable === true || schema["x-nullable"] === true;

  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((t) => t !== "null");
    if (nonNullTypes.length < type.length) {
      nullable = true;
    }
    type = nonNullTypes.length === 1 ? nonNullTypes[0] : nonNullTypes;
  }

  const result: NormalizedSchema = {
    name,
    type,
    format: optStr(schema.format),
    title: optStr(schema.title),
    description: optStr(schema.description),
    default: schema.default,
    enum: Array.isArray(schema.enum) ? schema.enum : undefined,
    const: schema.const,
    nullable,
    readOnly: schema.readOnly === true,
    writeOnly: schema.writeOnly === true,
    deprecated: schema.deprecated === true,
    example: schema.example,
    examples: Array.isArray(schema.examples) ? schema.examples : undefined,
    refName: optStr(schema["x-ref-name"]),
  };

  // Object properties
  if (schema.properties) {
    result.properties = {};
    for (const [key, val] of Object.entries(
      schema.properties as Record<string, Record<string, unknown>>,
    )) {
      result.properties[key] = normalizeSchema(val);
    }
  }
  if (schema.additionalProperties !== undefined) {
    result.additionalProperties =
      typeof schema.additionalProperties === "boolean"
        ? schema.additionalProperties
        : normalizeSchema(schema.additionalProperties as Record<string, unknown>);
  }
  if (Array.isArray(schema.required)) {
    result.required = schema.required.map(String);
  }

  // Array items
  if (schema.items) {
    result.items = normalizeSchema(schema.items as Record<string, unknown>);
  }
  if (schema.minItems !== undefined) result.minItems = Number(schema.minItems);
  if (schema.maxItems !== undefined) result.maxItems = Number(schema.maxItems);
  if (schema.uniqueItems === true) result.uniqueItems = true;

  // Numeric constraints
  if (schema.minimum !== undefined) result.minimum = Number(schema.minimum);
  if (schema.maximum !== undefined) result.maximum = Number(schema.maximum);
  if (schema.exclusiveMinimum !== undefined) {
    result.exclusiveMinimum = schema.exclusiveMinimum as number | boolean;
  }
  if (schema.exclusiveMaximum !== undefined) {
    result.exclusiveMaximum = schema.exclusiveMaximum as number | boolean;
  }
  if (schema.multipleOf !== undefined) result.multipleOf = Number(schema.multipleOf);

  // String constraints
  if (schema.minLength !== undefined) result.minLength = Number(schema.minLength);
  if (schema.maxLength !== undefined) result.maxLength = Number(schema.maxLength);
  if (schema.pattern !== undefined) result.pattern = String(schema.pattern);

  // Composition
  if (Array.isArray(schema.allOf)) {
    result.allOf = schema.allOf.map((s) =>
      normalizeSchema(s as Record<string, unknown>),
    );
  }
  if (Array.isArray(schema.anyOf)) {
    result.anyOf = schema.anyOf.map((s) =>
      normalizeSchema(s as Record<string, unknown>),
    );
  }
  if (Array.isArray(schema.oneOf)) {
    result.oneOf = schema.oneOf.map((s) =>
      normalizeSchema(s as Record<string, unknown>),
    );
  }
  if (schema.not) {
    result.not = normalizeSchema(schema.not as Record<string, unknown>);
  }
  if (schema.discriminator) {
    const d = schema.discriminator as Record<string, unknown>;
    result.discriminator = {
      propertyName: str(d.propertyName, ""),
      mapping: d.mapping as Record<string, string> | undefined,
    } satisfies DiscriminatorObject;
  }

  // External docs
  if (schema.externalDocs) {
    result.externalDocs = normalizeExternalDocs(
      schema.externalDocs as Record<string, unknown>,
    );
  }

  return result;
}

// ── Security Schemes ───────────────────────────────────────────────

function normalizeSecuritySchemes(
  schemes?: Record<string, unknown>,
): Record<string, SecurityScheme> {
  if (!schemes) return {};
  const result: Record<string, SecurityScheme> = {};
  for (const [name, s] of Object.entries(schemes)) {
    const raw = s as Record<string, unknown>;
    result[name] = {
      type: str(raw.type, "apiKey") as SecuritySchemeType,
      name: optStr(raw.name),
      description: optStr(raw.description),
      in: optStr(raw.in) as SecurityScheme["in"],
      scheme: optStr(raw.scheme),
      bearerFormat: optStr(raw.bearerFormat),
      flows: raw.flows
        ? normalizeOAuthFlows(raw.flows as Record<string, Record<string, unknown>>)
        : undefined,
      openIdConnectUrl: optStr(raw.openIdConnectUrl),
    };
  }
  return result;
}

function normalizeOAuthFlows(
  flows: Record<string, Record<string, unknown>>,
): OAuthFlows {
  const result: OAuthFlows = {};
  for (const flowType of [
    "implicit",
    "password",
    "clientCredentials",
    "authorizationCode",
  ] as const) {
    if (flows[flowType]) {
      result[flowType] = normalizeOAuthFlow(flows[flowType]);
    }
  }
  return result;
}

function normalizeOAuthFlow(flow: Record<string, unknown>): OAuthFlow {
  return {
    authorizationUrl: optStr(flow.authorizationUrl),
    tokenUrl: optStr(flow.tokenUrl),
    refreshUrl: optStr(flow.refreshUrl),
    scopes: (flow.scopes ?? {}) as Record<string, string>,
  };
}

// ── Webhooks ───────────────────────────────────────────────────────

function normalizeWebhooks(
  webhooks?: Record<string, Record<string, unknown>>,
): NormalizedOperation[] {
  if (!webhooks) return [];
  return normalizeOperations(webhooks);
}

// ── Shared ─────────────────────────────────────────────────────────

function normalizeExternalDocs(
  docs?: Record<string, unknown>,
): ExternalDocs | undefined {
  if (!docs?.url) return undefined;
  return {
    url: str(docs.url, ""),
    description: optStr(docs.description),
  };
}

function normalizeExamples(
  examples: Record<string, Record<string, unknown>>,
): Record<string, ExampleObject> {
  const result: Record<string, ExampleObject> = {};
  for (const [name, e] of Object.entries(examples)) {
    result[name] = {
      summary: optStr(e.summary),
      description: optStr(e.description),
      value: e.value,
      externalValue: optStr(e.externalValue),
    };
  }
  return result;
}

// ── Utility helpers ────────────────────────────────────────────────

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
