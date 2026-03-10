#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { buildDocs } from "./index.js";
import { loadConfig } from "./config.js";

const build = defineCommand({
  meta: {
    name: "build",
    description: "Build API documentation from an OpenAPI/Swagger spec",
  },
  args: {
    spec: {
      type: "positional",
      description: "Path or URL to the OpenAPI/Swagger spec file",
      required: true,
    },
    output: {
      type: "string",
      alias: ["o", "t"],
      description: "Output directory",
      default: "dist",
    },
    logo: {
      type: "string",
      alias: ["l"],
      description: "Path to a custom logo file",
    },
    "single-file": {
      type: "boolean",
      alias: ["1"],
      description: "Embed all assets into a single HTML file",
      default: false,
    },
    embed: {
      type: "boolean",
      alias: ["e"],
      description: "Generate embeddable output (no <html>/<body> tags)",
      default: false,
    },
    quiet: {
      type: "boolean",
      alias: ["q"],
      description: "Suppress output",
      default: false,
    },
  },
  async run({ args }) {
    const startTime = Date.now();
    const config = await loadConfig();

    if (!args.quiet) {
      console.log(`\nSpectacle — generating API docs from ${args.spec}\n`);
    }

    try {
      const result = await buildDocs({
        specSource: args.spec,
        outputDir: args.output,
        logo: args.logo || config.logo,
        favicon: config.favicon,
        singleFile: args["single-file"],
        embeddable: args.embed,
        themeOverrides: config.theme,
      });

      if (!args.quiet) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  Spec:       ${result.spec.info.title} v${result.spec.info.version}`);
        console.log(`  Operations: ${result.spec.operations.length}`);
        console.log(`  Schemas:    ${Object.keys(result.spec.schemas).length}`);
        console.log(`  Time:       ${elapsed}s\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\nError: ${message}\n`);
      process.exit(1);
    }
  },
});

const dev = defineCommand({
  meta: {
    name: "dev",
    description: "Start a dev server with live reload on spec changes",
  },
  args: {
    spec: {
      type: "positional",
      description: "Path to the OpenAPI/Swagger spec file",
      required: true,
    },
    port: {
      type: "string",
      alias: ["p"],
      description: "Port to listen on",
      default: "4400",
    },
    output: {
      type: "string",
      alias: ["o"],
      description: "Output directory for built files",
      default: ".preview",
    },
    logo: {
      type: "string",
      alias: ["l"],
      description: "Path to a custom logo file",
    },
  },
  async run({ args }) {
    const config = await loadConfig();
    const { startDevServer } = await import("./dev-server.js");
    await startDevServer({
      specSource: args.spec,
      outputDir: args.output,
      port: parseInt(args.port, 10),
      logo: args.logo || config.logo,
      favicon: config.favicon,
      themeOverrides: config.theme,
    });
  },
});

const validate = defineCommand({
  meta: {
    name: "validate",
    description: "Validate an OpenAPI/Swagger spec file",
  },
  args: {
    spec: {
      type: "positional",
      description: "Path or URL to the OpenAPI/Swagger spec file",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const result = await buildDocs({
        specSource: args.spec,
        skipWrite: true,
      });

      console.log(`\n  ✓ Valid: ${result.spec.info.title} v${result.spec.info.version}`);
      console.log(`  Operations: ${result.spec.operations.length}`);
      console.log(`  Schemas:    ${Object.keys(result.spec.schemas).length}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n  ✗ Invalid: ${message}\n`);
      process.exit(1);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "spectacle",
    version: "2.0.0-alpha.1",
    description: "Generate beautiful static API documentation from OpenAPI/Swagger specifications",
  },
  subCommands: {
    build,
    dev,
    validate,
  },
  // Default behavior: if called with a positional arg and no subcommand, treat as "build"
  args: {
    spec: {
      type: "positional",
      description: "Path or URL to the OpenAPI/Swagger spec file (shorthand for 'spectacle build')",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
    // Skip if a subcommand was matched (citty still calls parent run)
    if (rawArgs.includes("build") || rawArgs.includes("dev") || rawArgs.includes("validate")) return;

    if (args.spec) {
      // Legacy compatibility: `spectacle <specfile>` → `spectacle build <specfile>`
      await build.run!({
        args: { _: [], spec: args.spec, output: "dist", logo: "", quiet: false, "single-file": false, embed: false },
        rawArgs: [],
        cmd: build,
      });
    }
  },
});

runMain(main);
