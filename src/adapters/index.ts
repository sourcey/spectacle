import { resolve } from "node:path";
import type {
  DoxygenSourceOptions,
  GodocSourceOptions,
  MarkdownSourceOptions,
  McpSourceOptions,
  MkDocsSourceOptions,
  OpenApiSourceOptions,
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
      const absXml = ctx.resolvePath(options.xml);
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
      const moduleAbs = resolve(ctx.configDir, cfg.module ?? ".");
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
  SourceAdapter,
  SourceAdapterContext,
} from "./types.js";
