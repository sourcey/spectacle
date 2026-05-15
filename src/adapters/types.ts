import type { MarkdownPreprocessor } from "../core/markdown-loader.js";
import type {
  DoxygenConfig,
  GodocConfig,
  GroupConfig,
  ResolvedDoxygenConfig,
  ResolvedGodocConfig,
  ResolvedGroup,
} from "../config.js";

export interface SourceAdapterContext {
  configDir: string;
  tabName: string;
  tabSlug: string;
  resolvePath(path: string): string;
  assertExists(path: string, label: string): Promise<void>;
  isUrl(source: string): boolean;
}

export interface SourceAdapter<TResolved extends ResolvedTabSource = ResolvedTabSource> {
  name: string;
  resolve(ctx: SourceAdapterContext): Promise<TResolved>;
}

export interface ResolvedSourceAsset {
  /** Absolute source file path. */
  file: string;
  /** Output path relative to the adapter tab root. */
  outputPath: string;
}

export interface ResolvedOpenApiSource {
  kind: "openapi";
  spec: string;
  watchPaths?: string[];
}

export interface ResolvedMcpSource {
  kind: "mcp";
  spec: string;
  watchPaths?: string[];
}

export interface ResolvedMarkdownSource {
  kind: "markdown";
  adapter?: string;
  configPath?: string;
  groups: ResolvedGroup[];
  assets?: ResolvedSourceAsset[];
  watchPaths?: string[];
}

export interface ResolvedDoxygenSource {
  kind: "doxygen";
  config: ResolvedDoxygenConfig;
  watchPaths?: string[];
}

export interface ResolvedGodocSource {
  kind: "godoc";
  config: ResolvedGodocConfig;
  watchPaths?: string[];
}

export type ResolvedTabSource =
  | ResolvedOpenApiSource
  | ResolvedMcpSource
  | ResolvedMarkdownSource
  | ResolvedDoxygenSource
  | ResolvedGodocSource;

export interface MarkdownSourceOptions {
  groups: GroupConfig[];
}

export interface OpenApiSourceOptions {
  spec: string;
}

export interface McpSourceOptions {
  spec: string;
}

export interface MkDocsSourceOptions {
  config: string;
}

export type DoxygenSourceOptions = DoxygenConfig;
export type GodocSourceOptions = GodocConfig | string;

export interface PageMarkdownOptions {
  sourceRoot?: string;
  preprocess?: MarkdownPreprocessor[];
}
