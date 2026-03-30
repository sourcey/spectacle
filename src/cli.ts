#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { buildDocs, buildSiteDocs } from "./index.js";
import { loadConfig } from "./config.js";
import { init } from "./init.js";
import pkg from "../package.json" with { type: "json" };

const build = defineCommand({
  meta: {
    name: "build",
    description: "Build documentation from sourcey.config.ts or a standalone OpenAPI spec",
  },
  args: {
    spec: {
      type: "positional",
      description: "Path to an OpenAPI spec (quick mode; skips config)",
      required: false,
    },
    output: {
      type: "string",
      alias: ["o"],
      description: "Output directory",
      default: "dist",
    },
    embed: {
      type: "boolean",
      alias: ["e"],
      description: "Embeddable output (no html/body wrapper)",
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

    try {
      if (args.spec) {
        if (!args.quiet) console.log(`\nSourcey — generating docs from ${args.spec}\n`);

        const result = await buildDocs({
          specSource: args.spec,
          outputDir: args.output,
          embeddable: args.embed,
        });

        if (!args.quiet) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  Spec:       ${result.spec.info.title} v${result.spec.info.version}`);
          console.log(`  Operations: ${result.spec.operations.length}`);
          console.log(`  Schemas:    ${Object.keys(result.spec.schemas).length}`);
          console.log(`  Time:       ${elapsed}s\n`);
        }
      } else {
        const config = await loadConfig();
        if (!args.quiet) console.log(`\nSourcey — building documentation site\n`);

        const result = await buildSiteDocs({
          config,
          outputDir: args.output,
          embeddable: args.embed,
        });

        if (!args.quiet) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  Pages:  ${result.pageCount}`);
          console.log(`  Output: ${result.outputDir}`);
          console.log(`  Time:   ${elapsed}s\n`);
        }
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
    description: "Start a dev server with live reload (reads sourcey.config.ts)",
  },
  args: {
    port: {
      type: "string",
      alias: ["p"],
      description: "Port to listen on",
      default: "4400",
    },
  },
  async run({ args }) {
    const { startDevServer } = await import("./dev-server.js");
    await startDevServer({
      port: parseInt(args.port, 10),
    });
  },
});

const validate = defineCommand({
  meta: {
    name: "validate",
    description: "Validate an OpenAPI spec file",
  },
  args: {
    spec: {
      type: "positional",
      description: "Path or URL to the OpenAPI spec",
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
    name: "sourcey",
    version: pkg.version,
    description: "Open source documentation platform for OpenAPI specs and markdown guides",
  },
  subCommands: {
    init,
    build,
    dev,
    validate,
  },
  args: {
    spec: {
      type: "positional",
      description: "Path to an OpenAPI spec (shorthand for 'sourcey build <spec>')",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
    if (rawArgs.includes("init") || rawArgs.includes("build") || rawArgs.includes("dev") || rawArgs.includes("validate")) return;

    if (args.spec) {
      await build.run!({
        args: { _: [], spec: args.spec, output: "dist", embed: false, quiet: false },
        rawArgs: [],
        cmd: build,
      });
    }
  },
});

runMain(main);
