#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const moxygenRoot = resolve(root, "..", "engines", "moxygen");
const iceyRoot = process.env.ICEY_ROOT ?? "/Users/kam/dev/0state/icey";
const failures = [];
const lanes = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function collectFiles(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, predicate, out);
    } else if (predicate(full, entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function lane(name, metrics) {
  lanes.push({ name, ...metrics });
  for (const [key, value] of Object.entries(metrics)) {
    if (value === false || value === 0) {
      failures.push(`${name}: ${key}`);
    }
  }
}

const moxygenIntegration = read(join(moxygenRoot, "test", "integration.test.ts"));
const moxygenTemplates = read(join(moxygenRoot, "test", "templates.test.ts"));
const moxygenHelpers = read(join(moxygenRoot, "test", "helpers.test.ts"));
const moxygenClassTemplate = read(join(moxygenRoot, "templates", "cpp", "class.md"));

lane("fmt-modern-signatures", {
  conditionalNoexcept: moxygenIntegration.includes("noexcept(noexcept(std::declval<T>()))"),
  requiresClause: moxygenIntegration.includes("requires std::integral<T>"),
  nodiscardConstexpr: moxygenIntegration.includes("[[nodiscard]] constexpr"),
  specializationSafePaths: moxygenHelpers.includes("sanitizes template specialization names"),
});

lane("opencv-relationships", {
  inheritedMembers: moxygenClassTemplate.includes("Inherited from"),
  allMembersIndex: moxygenClassTemplate.includes("List of all members"),
  relationshipSections: ["Referenced by", "References", "Reimplements"].every((text) => moxygenClassTemplate.includes(text)),
});

lane("ffmpeg-source-search", {
  sourceRouteMaps: read(join(moxygenRoot, "src", "types.ts")).includes("SourceUrlRoute"),
  sourceFullPathTemplate: read(join(moxygenRoot, "src", "templates.ts")).includes("{fullPath}"),
  exactSearchMetadata: read(join(root, "src", "core", "search-indexer.ts")).includes("qualifiedName"),
  clientRanking: read(join(root, "src", "client", "search.js")).includes("scoreEntry"),
});

lane("nlohmann-mkdocs", {
  mkdocsAdapter: existsSync(join(root, "src", "adapters", "mkdocs.ts")),
  mkdocsConfigCoverage: read(join(root, "test", "config.test.ts")).includes("mkdocs"),
});

const iceyDist = join(iceyRoot, "dist");
const iceyApiDir = join(iceyDist, "api-reference");
const iceySearch = join(iceyDist, "search-index.json");
const iceyApiPages = collectFiles(iceyApiDir, (_full, name) => name.endsWith(".html"));
const iceySearchEntries = existsSync(iceySearch) ? JSON.parse(read(iceySearch)) : [];
const iceyCombined = iceyApiPages.map(read).join("\n");
const unsafeIceyFilenames = iceyApiPages
  .map((file) => relative(iceyApiDir, file))
  .filter((name) => /[() ]/.test(name));

lane("icey-dogfood", {
  pageCount: iceyApiPages.length >= 400,
  searchEntries: iceySearchEntries.length >= 7500,
  exactMemberSearch: iceySearchEntries.some((entry) => entry.qualifiedName === "icy::graft::Library::requireSymbol"),
  sourceLocations: iceyCombined.includes("Defined in src/base/include/icy/queue.h:"),
  examples: iceyCombined.includes("waitForShutdown"),
  relationships: iceyCombined.includes("Inherited from") && iceyCombined.includes("List of all members"),
  noUnsafeFilenames: unsafeIceyFilenames.length === 0,
  noPlugaSearch: !JSON.stringify(iceySearchEntries).toLowerCase().includes("pluga"),
  noGraftPublicLinks: !iceyCombined.includes("github.com/nilstate/icey/blob/main/src/graft/"),
});

const report = {
  checkedAt: new Date().toISOString(),
  root,
  moxygenRoot,
  iceyRoot,
  lanes,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length) {
  console.error("C++ reference quality gate failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
