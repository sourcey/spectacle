import { defineCommand } from "citty";
import consola from "consola";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const init = defineCommand({
  meta: {
    name: "init",
    description: "Scaffold a new Sourcey docs project in the current directory",
  },
  async run() {
    const cwd = process.cwd();

    if (existsSync(resolve(cwd, "sourcey.config.ts"))) {
      consola.error("sourcey.config.ts already exists in this directory.");
      process.exit(1);
    }

    consola.log("");

    const name = (await consola.prompt("Project name:", {
      type: "text",
      default: "My Docs",
    })) as string;

    if (typeof name === "symbol") process.exit(0);

    const preset = (await consola.prompt("Theme preset:", {
      type: "select",
      options: ["default", "minimal", "api-first"],
    })) as string;

    if (typeof preset === "symbol") process.exit(0);

    const withExample = (await consola.prompt("Include example content?", {
      type: "confirm",
      initial: true,
    })) as boolean;

    if (typeof withExample === "symbol") process.exit(0);

    // -- Generate files --

    const pages = withExample
      ? `["introduction", "quickstart"]`
      : `["introduction"]`;

    const config = `import { defineConfig } from "sourcey";

export default defineConfig({
  name: "${name}",
  theme: {
    preset: "${preset}",
  },
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        slug: "",
        groups: [
          {
            group: "Getting Started",
            pages: ${pages},
          },
        ],
      },
    ],
  },
});
`;

    const intro = `---
title: Introduction
description: Welcome to ${name}
---

Welcome to **${name}**. Start writing your docs here.
`;

    const quickstart = `---
title: Quick Start
description: Get up and running
---

Install the package:

\`\`\`bash
npm install my-package
\`\`\`

Then import it:

\`\`\`typescript
import { myFunction } from "my-package";
\`\`\`
`;

    writeFileSync(resolve(cwd, "sourcey.config.ts"), config);
    consola.log("  Created sourcey.config.ts");

    writeFileSync(resolve(cwd, "introduction.md"), intro);
    consola.log("  Created introduction.md");

    if (withExample) {
      writeFileSync(resolve(cwd, "quickstart.md"), quickstart);
      consola.log("  Created quickstart.md");
    }

    if (!existsSync(resolve(cwd, "package.json"))) {
      const pkg = JSON.stringify(
        {
          name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          private: true,
          type: "module",
          scripts: {
            dev: "sourcey dev",
            build: "sourcey build",
          },
          dependencies: {
            sourcey: "^3.3.0",
          },
        },
        null,
        2,
      );
      writeFileSync(resolve(cwd, "package.json"), pkg + "\n");
      consola.log("  Created package.json");
    } else {
      consola.log("  Skipped package.json (already exists)");
    }

    if (!existsSync(resolve(cwd, ".gitignore"))) {
      writeFileSync(resolve(cwd, ".gitignore"), "node_modules\ndist\n");
      consola.log("  Created .gitignore");
    }

    consola.log("");
    consola.success("Created sourcey project in ./");
    consola.log("");
    consola.log("  Next steps:");
    consola.log("    npm install");
    consola.log("    npx sourcey dev");
    consola.log("");
  },
});
