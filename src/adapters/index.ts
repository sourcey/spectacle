import type {
  DoxygenSourceOptions,
  GodocSourceOptions,
  MarkdownSourceOptions,
  McpSourceOptions,
  MkDocsSourceOptions,
  OpenApiSourceOptions,
  RustdocSourceOptions,
  SourceAdapter,
} from "./types.js";
import { assertLocalPath, resolveMarkdownGroups, toWatchPaths } from "./shared.js";
import { mkdocs as mkdocsAdapter } from "./mkdocs.js";

export function openapi(specOrOptions: string | OpenApiSourceOptions): SourceAdapter {
  const spec = typeof specOrOptions === "string" ? specOrOptions : specOrOptions.spec;
  return {
    name: "openapi",
    async resolve(ctx) {
      if (ctx.isUrl(spec)) {
        return { kind: "openapi", spec };
      }
      const absPath = ctx.resolvePath(spec);
      await ctx.assertExists(absPath, `OpenAPI spec "${spec}" in tab "${ctx.tabName}"`);
      return { kind: "openapi", spec: absPath, watchPaths: [absPath] };
    },
  };
}

export function mcp(specOrOptions: string | McpSourceOptions): SourceAdapter {
  const spec = typeof specOrOptions === "string" ? specOrOptions : specOrOptions.spec;
  return {
    name: "mcp",
    async resolve(ctx) {
      if (ctx.isUrl(spec)) {
        return { kind: "mcp", spec };
      }
      const absPath = ctx.resolvePath(spec);
      await ctx.assertExists(absPath, `MCP spec "${spec}" in tab "${ctx.tabName}"`);
      return { kind: "mcp", spec: absPath, watchPaths: [absPath] };
    },
  };
}

export function markdown(options: MarkdownSourceOptions): SourceAdapter {
  return {
    name: "markdown",
    async resolve(ctx) {
      return {
        kind: "markdown",
        adapter: "markdown",
        groups: await resolveMarkdownGroups(options.groups, ctx.tabName, ctx.configDir),
      };
    },
  };
}

export function mkdocs(configOrOptions: string | MkDocsSourceOptions): SourceAdapter {
  const options =
    typeof configOrOptions === "string" ? { config: configOrOptions } : configOrOptions;
  return mkdocsAdapter(options);
}

export function doxygen(options: DoxygenSourceOptions): SourceAdapter {
  return {
    name: "doxygen",
    async resolve(ctx) {
      const absXml = assertLocalPath(ctx, options.xml, "Doxygen XML directory");
      await ctx.assertExists(
        absXml,
        `Doxygen XML directory "${options.xml}" in tab "${ctx.tabName}"`,
      );
      return {
        kind: "doxygen",
        config: {
          xml: absXml,
          language: options.language ?? "cpp",
          groups: options.groups ?? false,
          index: options.index === false ? "none" : (options.index ?? "auto"),
          sourceUrl: options.sourceUrl,
        },
        watchPaths: [absXml],
      };
    },
  };
}

export function godoc(configOrPath: GodocSourceOptions): SourceAdapter {
  return {
    name: "godoc",
    async resolve(ctx) {
      const cfg = typeof configOrPath === "string" ? { module: configOrPath } : configOrPath;
      const moduleAbs = assertLocalPath(ctx, cfg.module ?? ".", "Go module directory");
      await ctx.assertExists(
        moduleAbs,
        `Go module directory "${cfg.module ?? "."}" in tab "${ctx.tabName}"`,
      );
      const snapshotAbs = cfg.snapshot ? ctx.resolvePath(cfg.snapshot) : undefined;
      return {
        kind: "godoc",
        config: {
          module: moduleAbs,
          packages: cfg.packages?.length ? cfg.packages : ["./..."],
          snapshot: snapshotAbs,
          mode: cfg.mode ?? "auto",
          includeTests: cfg.includeTests ?? true,
          includeUnexported: cfg.includeUnexported ?? false,
          hideUndocumented: cfg.hideUndocumented ?? false,
          exclude: cfg.exclude ?? [],
          goEnv: cfg.goEnv,
          sourceBasePath: trimSlashes(cfg.sourceBasePath ?? ""),
        },
        watchPaths: toWatchPaths([snapshotAbs]),
      };
    },
  };
}

export function rustdoc(configOrPath: RustdocSourceOptions): SourceAdapter {
  return {
    name: "rustdoc",
    async resolve(ctx) {
      const cfg = typeof configOrPath === "string" ? { manifest: configOrPath } : configOrPath;
      const manifestAbs = assertLocalPath(ctx, cfg.manifest ?? ".", "Cargo manifest");
      await ctx.assertExists(
        manifestAbs,
        `Cargo manifest "${cfg.manifest ?? "."}" in tab "${ctx.tabName}"`,
      );
      const snapshotAbs = cfg.snapshot ? ctx.resolvePath(cfg.snapshot) : undefined;
      const features = {
        default: cfg.features?.default ?? true,
        list: cfg.features?.list ?? [],
        all: cfg.features?.all ?? false,
      };
      return {
        kind: "rustdoc",
        config: {
          manifest: manifestAbs,
          crates: cfg.crates?.length ? cfg.crates : [],
          snapshot: snapshotAbs,
          mode: cfg.mode ?? "auto",
          features,
          includePrivate: cfg.includePrivate ?? false,
          includeHidden: cfg.includeHidden ?? false,
          target: cfg.target,
          toolchain: cfg.toolchain ?? "nightly",
          sourceBasePath: trimSlashes(cfg.sourceBasePath ?? ""),
          doctestsIndex: cfg.doctestsIndex ?? true,
        },
        watchPaths: toWatchPaths([snapshotAbs]),
      };
    },
  };
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

export { assertLocalPath };
export type {
  DoxygenSourceOptions,
  GodocSourceOptions,
  MarkdownSourceOptions,
  McpSourceOptions,
  MkDocsSourceOptions,
  OpenApiSourceOptions,
  PageMarkdownOptions,
  ResolvedTabSource,
  RustdocSourceOptions,
  SourceAdapter,
  SourceAdapterContext,
} from "./types.js";
