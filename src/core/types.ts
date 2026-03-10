/**
 * Internal normalized representation of an API specification.
 * All OpenAPI 2.0/3.0/3.1 specs are converted to this format
 * before rendering, so components never need to know the source format.
 */

// ── Top-level normalized spec ──────────────────────────────────────

export interface NormalizedSpec {
  info: ApiInfo;
  servers: ServerDefinition[];
  tags: NormalizedTag[];
  operations: NormalizedOperation[];
  schemas: Record<string, NormalizedSchema>;
  securitySchemes: Record<string, SecurityScheme>;
  webhooks: NormalizedOperation[];
  externalDocs?: ExternalDocs;
}

// ── API Info ───────────────────────────────────────────────────────

export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactInfo;
  license?: LicenseInfo;
  logo?: string;
  favicon?: string;
}

export interface ContactInfo {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseInfo {
  name: string;
  url?: string;
  identifier?: string;
}

// ── Server ─────────────────────────────────────────────────────────

export interface ServerDefinition {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  default: string;
  description?: string;
  enum?: string[];
}

// ── Tags ───────────────────────────────────────────────────────────

export interface NormalizedTag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocs;
  operations: NormalizedOperation[];
  /** Vendor extension: hide this tag from navigation */
  hidden?: boolean;
}

// ── Operations ─────────────────────────────────────────────────────

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "trace";

export interface NormalizedOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  method: HttpMethod;
  path: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responses: NormalizedResponse[];
  security: SecurityRequirement[];
  deprecated: boolean;
  servers?: ServerDefinition[];
  externalDocs?: ExternalDocs;
  callbacks?: Record<string, NormalizedCallback>;
  /** Vendor extension: hide this operation from docs */
  hidden?: boolean;
  /** Vendor extension: custom code samples */
  codeSamples?: CodeSample[];
}

export interface NormalizedParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required: boolean;
  deprecated: boolean;
  schema?: NormalizedSchema;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
}

export interface NormalizedRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, MediaTypeContent>;
}

export interface MediaTypeContent {
  schema?: NormalizedSchema;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
}

export interface NormalizedResponse {
  statusCode: string;
  description: string;
  content?: Record<string, MediaTypeContent>;
  headers?: Record<string, NormalizedParameter>;
  links?: Record<string, LinkObject>;
}

export interface NormalizedCallback {
  expression: string;
  operations: NormalizedOperation[];
}

// ── Schema ─────────────────────────────────────────────────────────

export interface NormalizedSchema {
  /** Original schema name (from components/schemas key or definition name) */
  name?: string;
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;

  // Object
  properties?: Record<string, NormalizedSchema>;
  additionalProperties?: boolean | NormalizedSchema;
  required?: string[];

  // Array
  items?: NormalizedSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Numeric
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;

  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Composition
  allOf?: NormalizedSchema[];
  anyOf?: NormalizedSchema[];
  oneOf?: NormalizedSchema[];
  not?: NormalizedSchema;
  discriminator?: DiscriminatorObject;

  // Metadata
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  example?: unknown;
  examples?: unknown[];
  externalDocs?: ExternalDocs;

  /** Reference name for display linking (e.g. "User", "Pet") */
  refName?: string;
}

export interface DiscriminatorObject {
  propertyName: string;
  mapping?: Record<string, string>;
}

// ── Security ───────────────────────────────────────────────────────

export type SecuritySchemeType = "apiKey" | "http" | "oauth2" | "openIdConnect" | "mutualTLS";

export interface SecurityScheme {
  type: SecuritySchemeType;
  name?: string;
  description?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export type SecurityRequirement = Record<string, string[]>;

// ── Shared ─────────────────────────────────────────────────────────

export interface ExternalDocs {
  url: string;
  description?: string;
}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

export interface LinkObject {
  operationId?: string;
  operationRef?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  server?: ServerDefinition;
}

export interface CodeSample {
  lang: string;
  label?: string;
  source: string;
}

// ── Loader / Pipeline types ────────────────────────────────────────

export type SpecFormat = "json" | "yaml";
export type SpecVersion = "swagger-2.0" | "openapi-3.0" | "openapi-3.1";

export interface LoadedSpec {
  /** Raw parsed object (before dereferencing) */
  raw: Record<string, unknown>;
  /** Detected format */
  format: SpecFormat;
  /** Detected spec version */
  version: SpecVersion;
  /** Resolved file path or URL the spec was loaded from */
  source: string;
}

export interface ParsedSpec {
  /** Fully dereferenced OpenAPI 3.x document */
  document: OpenApiDocument;
  /** Original source path/URL */
  source: string;
}

/**
 * Minimal typed shape of an OpenAPI 3.x document after dereferencing.
 * We use this rather than a full OpenAPI type to keep things lightweight;
 * the normalizer handles the detailed field extraction.
 */
export interface OpenApiDocument {
  openapi: string;
  info: Record<string, unknown>;
  servers?: Record<string, unknown>[];
  paths?: Record<string, Record<string, unknown>>;
  webhooks?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    [key: string]: unknown;
  };
  security?: Record<string, string[]>[];
  tags?: Record<string, unknown>[];
  externalDocs?: Record<string, unknown>;
  [key: string]: unknown;
}
