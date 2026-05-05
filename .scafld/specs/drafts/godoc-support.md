---
spec_version: '2.0'
task_id: godoc-support
created: '2026-05-04T12:55:31Z'
updated: '2026-05-04T13:57:52Z'
status: review
harden_status: passed
size: large
risk_level: medium
---

# Native Go Documentation Support

## Current State

Status: review
Current phase: none
Next: approve
Reason: hardening passed
Blockers: none
Allowed follow-up command: `scafld approve godoc-support`
Latest runner update: 2026-05-04T12:58:37Z
Review gate: not_started

## Summary

Turn Sourcey's ignored local plan at `.plans/godoc-support.md` into an executable scafld plan spec. The plan defines native Go package documentation support for Sourcey: Go source and doc comments remain authoritative, Sourcey extracts a Go-shaped documentation model directly from the Go toolchain, and rendered output participates in navigation, search, sitemap, `llms.txt`, and `llms-full.txt` without routing Go through Doxygen or moxygen.

## Objectives

- Preserve the product decision that Go support is native godoc support, not a Doxygen or moxygen pipeline.
- Specify the public `godoc` config surface and data model in enough detail for implementation.
- Cover live and snapshot modes so Sourcey can build Go docs with or without Go installed on the docs host.
- Make Go package documentation visible to developers and agents through rendered pages, search, `llms.txt`, and `llms-full.txt`.
- Keep the plan grounded in Sourcey's current TypeScript architecture and validation commands.

## Scope

- In scope: plan quality, scafld lifecycle setup, hardening, and executable validation of the godoc support plan.
- In scope: Sourcey config model, Go introspector, snapshot format, loader, navigation, rendering, search, llms output, CLI, tests, documentation, and dogfood strategy.
- Out of scope for this spec execution: implementing the godoc feature itself.
- Out of scope: Doxygen XML for Go, moxygen as an intermediate representation, hosted package indexing, call graphs, and GOPATH-only projects.

## Dependencies

- Sourcey plan artifact: `.plans/godoc-support.md`
- Sourcey package scripts: `npm run typecheck`
- Local scafld Go binary: `.sourcey/bin/scafld`
- Local Node dependencies already installed under `node_modules/`

## Assumptions

- The `.plans/` directory is intentionally ignored by Sourcey's git configuration.
- The scafld task spec is the lifecycle wrapper around the local plan artifact, not a replacement for the plan itself.
- TypeScript typechecking is a useful smoke gate for the current Sourcey repo while the godoc work is still only planned.
- Future implementation specs can decompose this plan into code phases.

## Touchpoints

- `.plans/godoc-support.md`
- `src/config.ts`
- `src/site-assembly.ts`
- `src/dev-server.ts`
- `src/core/godoc-types.ts`
- `src/core/godoc-introspector.ts`
- `src/core/godoc-loader.ts`
- `src/core/search-indexer.ts`
- `src/renderer/llms.ts`
- `src/cli.ts`
- `docs/`
- `test/fixtures/godoc/`

## Risks

- none

## Acceptance

Profile: standard

Validation:
- [x] `v1` command - Sourcey still typechecks before implementation begins.
  - Command: `npm run typecheck`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-22
- [x] `v2` command - The source plan artifact exists and has the godoc support title.
  - Command: `bash -lc 'test -f .plans/godoc-support.md && rg -q "Native Go Documentation Support" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-23

## Phase 1: Contract and Config

Status: completed
Dependencies: none

Objective: Confirm the plan defines the public configuration contract and the first implementation boundary.

Changes:
- Add a `godoc` source to the Sourcey tab model.
- Define `GodocConfig`, string shorthand, defaults, source exclusivity, and path resolution.
- Keep Go docs as a distinct source type rather than forcing them through OpenAPI or Doxygen models.

Acceptance:
- [x] `ac1_1` command - The plan defines the config and tab contract.
  - Command: `bash -lc 'rg -q "GodocConfig" .plans/godoc-support.md && rg -q "TabConfig" .plans/godoc-support.md && rg -q "String shorthand" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-24
- [x] `ac1_2` command - The plan states the native-source contract.
  - Command: `bash -lc 'rg -q "Native source of truth" .plans/godoc-support.md && rg -q "No lossy translation to OpenAPI" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-25

## Phase 2: Introspection and Snapshot

Status: completed
Dependencies: phase1

Objective: Confirm the plan defines a native Go introspection path and a stable snapshot artifact.

Changes:
- Introduce a TypeScript loader that invokes a Go helper in live mode.
- Use `go list -json`, `go/parser`, `go/ast`, `go/doc`, `go/printer`, and `go/token`.
- Define a JSON-serializable `GodocSpec` snapshot.

Acceptance:
- [x] `ac2_1` command - The plan uses the Go toolchain and standard library for introspection.
  - Command: `bash -lc 'rg -q "go list -json" .plans/godoc-support.md && rg -q "go/parser" .plans/godoc-support.md && rg -q "go/doc" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-26
- [x] `ac2_2` command - The plan defines a snapshot command and schema artifact.
  - Command: `bash -lc 'rg -q "sourcey godoc --module" .plans/godoc-support.md && rg -q "godoc.json" .plans/godoc-support.md && rg -q "schema_version" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-27

## Phase 3: Loader and Navigation

Status: completed
Dependencies: phase2

Objective: Confirm the plan explains how Sourcey turns godoc data into site pages and navigation.

Changes:
- Add a godoc loader beside existing Sourcey source loaders.
- Build module and package pages without symbol spam in the main navigation.
- Define actionable diagnostics for missing Go, missing modules, bad snapshots, empty packages, and undocumented packages.

Acceptance:
- [x] `ac3_1` command - Loader responsibilities and diagnostics are explicit.
  - Command: `bash -lc 'rg -q "src/core/godoc-loader.ts" .plans/godoc-support.md && rg -q "Go not installed" .plans/godoc-support.md && rg -q "package pattern matching zero packages" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-28
- [x] `ac3_2` command - Navigation stays package-oriented.
  - Command: `bash -lc 'rg -q "Module index" .plans/godoc-support.md && rg -q "Packages grouped by import path prefix" .plans/godoc-support.md && rg -q "listing every symbol in the sidebar" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-29

## Phase 4: Rendering

Status: completed
Dependencies: phase3

Objective: Confirm the plan defines Go-native rendered pages that feel like Sourcey and remain faithful to Go conventions.

Changes:
- Render module and package pages.
- Render package comments, import paths, declarations, constants, variables, functions, types, fields, methods, and examples.
- Keep the visual language quiet, dense, source-oriented, and scannable.

Acceptance:
- [x] `ac4_1` command - Rendering components and content rules are present.
  - Command: `bash -lc 'rg -q "GodocPackagePage" .plans/godoc-support.md && rg -q "Declarations rendered as Go code" .plans/godoc-support.md && rg -q "Examples rendered as Go code" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-30
- [x] `ac4_2` command - The visual target is Go-native and scannable.
  - Command: `bash -lc 'rg -q "pkg.go.dev" .plans/godoc-support.md && rg -q "quiet, dense, source-oriented" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-31

## Phase 5: Search, llms, and Sitemap

Status: completed
Dependencies: phase4

Objective: Confirm Go package documentation becomes visible to Sourcey's agent and discovery surfaces.

Changes:
- Add package and symbol entries to search.
- Add package links to `llms.txt`.
- Add compact declarations, docs, and examples to `llms-full.txt`.
- Include Go package pages in the sitemap.

Acceptance:
- [x] `ac5_1` command - Search and llms outputs are part of the plan.
  - Command: `bash -lc 'rg -q "search-index.json" .plans/godoc-support.md && rg -q "llms.txt" .plans/godoc-support.md && rg -q "llms-full.txt" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-32
- [x] `ac5_2` command - Full llms content is compact and does not embed full source.
  - Command: `bash -lc 'rg -q "Full source files do not belong" .plans/godoc-support.md && rg -q "symbol declarations" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-33

## Phase 6: Documentation and Dogfood

Status: completed
Dependencies: phase5

Objective: Confirm the plan includes operator docs and proof against a real Go project.

Changes:
- Update README and Sourcey docs.
- Document live and snapshot modes with real configuration examples.
- Dogfood against a real Go project, ideally scafld.

Acceptance:
- [x] `ac6_1` command - The plan includes docs and live/snapshot examples.
  - Command: `bash -lc 'rg -q "Docs explain live and snapshot modes" .plans/godoc-support.md && rg -q "Snapshot example" .plans/godoc-support.md && rg -q "README feature list includes Go/godoc" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-34
- [x] `ac6_2` command - Dogfood against a real Go project is required.
  - Command: `bash -lc 'rg -q "Dogfood against a real Go project" .plans/godoc-support.md && rg -q "ideally" .plans/godoc-support.md && rg -q "scafld" .plans/godoc-support.md'`
  - Expected kind: `exit_code_zero`
  - Status: pass
  - Evidence: exit code was 0
  - Source event: entry-35

## Rollback

- Delete `.scafld/specs/drafts/godoc-support.md` if the scafld wrapper spec is wrong.
- Keep `.plans/godoc-support.md`; it is the source planning artifact.
- Delete `.sourcey/bin/scafld` if the local binary should not remain in the workspace.

## Review

Status: not_started
Verdict: none

## Self Eval

- none

## Deviations

- none

## Metadata

- created_by: scafld
- local_binary: .sourcey/bin/scafld
- source_plan: .plans/godoc-support.md

## Origin

Created by: scafld
Source: local plan import

## Harden Rounds

### round-1

Status: passed
Started: 2026-05-04T12:57:21Z
Ended: 2026-05-04T12:57:55Z

Questions:
- What is authoritative when the scafld spec and `.plans/godoc-support.md` both describe the work?
  - Grounded in: spec_gap:authority
  - Recommended answer: `.plans/godoc-support.md` is the source planning artifact; this scafld spec is the lifecycle and executable-validation wrapper.
  - If unanswered: Treat the scafld spec as authoritative for lifecycle state only.
  - Answered with: `.plans/godoc-support.md` owns product detail; this spec owns harden, approval, execution evidence, and acceptance status.
- What proves the plan rejects the wrong Go documentation architecture?
  - Grounded in: spec_gap:native-go-boundary
  - Recommended answer: Acceptance must check for native godoc language and explicit no-Doxygen or moxygen constraints.
  - If unanswered: Add validation commands that grep the source plan for the native-source and no-lossy-translation contracts.
  - Answered with: `ac1_2`, `ac2_1`, and the summary/scope text validate native Go extraction and no Doxygen or moxygen pipeline.
- What fails halfway, and how does a future implementation recover?
  - Grounded in: spec_gap:recovery
  - Recommended answer: Live mode failure is repaired by snapshot mode; broad implementation risk is repaired by splitting phases into follow-up specs.
  - If unanswered: Require snapshot mode and phase-level implementation specs before coding.
  - Answered with: The plan includes snapshot mode, `sourcey godoc --out`, explicit diagnostics, and a rollback section that preserves the source plan.
- What examples or fixtures prove this feature shape?
  - Grounded in: spec_gap:fixtures
  - Recommended answer: Fixture Go modules and dogfood against a real Go project prove package comments, exported symbols, examples, search, and llms output.
  - If unanswered: Add fixture acceptance before implementation begins.
  - Answered with: Phase 6 requires dogfood against a real Go project, and the source plan's test plan names package comments, functions, values, types, examples, build tags, and nested imports.
- What operational command lets a human recover from a JS-only docs host without Go installed?
  - Grounded in: spec_gap:operator-recovery
  - Recommended answer: `sourcey godoc --module . --packages './...' --out docs/godoc.json`, then configure snapshot mode.
  - If unanswered: Make snapshot mode mandatory before live mode.
  - Answered with: Phase 2 and Phase 6 require the snapshot command and documentation for live vs snapshot mode.

### round-2

Status: passed
Started: 2026-05-04T13:15:38Z
Ended: 2026-05-04T13:57:52Z

Questions:
- How does the Go introspector helper ship to end users?
  - Grounded in: code:package.json:files
  - Recommended answer: Ship the `.go` source under `dist/core/godoc-introspect/` and invoke via `go run` at build time. Live mode already requires Go, so no extra constraint. Snapshot mode bypasses Go entirely. This avoids prebuilt-binary multi-arch CI and keeps the npm tarball small (current `files` is just `["dist", "LICENSE"]`).
  - If unanswered: Default to shipping `.go` source and `go run`.
  - Answered with: Ship `.go` source and invoke via `go run` at build time. No prebuilt binaries; live mode already requires Go.
- The Product Contract says "Go source and doc comments are authoritative," but `mode: "auto"` is defined as "prefers snapshot when present and falls back to live." When both a committed `godoc.json` AND a working Go toolchain are available, a stale snapshot silently masks current source. Which wins in auto mode?
  - Grounded in: spec_gap:auto-mode-policy
  - Recommended answer: Live wins in auto mode. Snapshot is a fallback for hosts without Go, not the canonical artifact. Operators who want pin-to-snapshot semantics set `mode: "snapshot"` explicitly. Auto becomes "use live when Go is available; otherwise read snapshot." This matches the "Go source is authoritative" contract.
  - If unanswered: Flip auto-mode to live-first; snapshot is a fallback only.
  - Answered with: Live wins in auto mode. Snapshot fires only when Go is missing. `mode: "snapshot"` remains the explicit pin-to-snapshot opt-in.
- When a Go symbol is renamed (e.g., `Run` → `Execute`) or removed, deterministic anchors like `func-Run` change or disappear. External links to Sourcey's docs break silently. What's the policy?
  - Grounded in: spec_gap:anchor-rename-policy (Risks > Unstable Anchors covers determinism but not lifecycle)
  - Recommended answer: Match `pkg.go.dev` semantics — anchors track current source. Renamed/removed symbols break links; this is documented as expected behavior, not a bug. Phase 1 ships no alias mechanism. If demand emerges, Phase N+ can add a sidecar `aliases.json` (operator-curated) without changing the anchor scheme.
  - If unanswered: Default to source-tracking anchors with no alias machinery. Document the breakage explicitly in the rendering rules.
  - Answered with: Match `pkg.go.dev` semantics. No alias machinery in Phase 1; document rename breakage as expected.
- Live mode invokes `go list`, which honors `GOOS`/`GOARCH` and `//go:build` constraints from the current process env. A docs build on macOS sees different files than a build on Linux. CI hosts produce different docs from developer laptops. Should Sourcey pin a build environment, or accept host variance?
  - Grounded in: spec_gap:build-tag-determinism (Risks > Build Tags and Generated Files acknowledges `go list` behavior but doesn't address cross-host variance)
  - Recommended answer: Default to the host environment (matches `go doc`; cheap, expected for local use). Add an optional `goEnv?: { GOOS?: string; GOARCH?: string; tags?: string[] }` to `GodocConfig` for projects that want pinned reproducibility. Document the variance risk under "live vs snapshot" so operators choose snapshot mode (or pinned `goEnv`) when CI determinism matters.
  - If unanswered: Default to host env, no `goEnv` knob in Phase 1; document the variance risk only.
  - Answered with: Default to host env. Add `goEnv` config (GOOS, GOARCH, tags) for projects that want pinned reproducibility. Document the variance under live-vs-snapshot.
- When `go list` reports a package with parse or type errors that won't compile, what happens to the docs build?
  - Grounded in: spec_gap:per-package-failure-policy (loader diagnostics list "go list failure" globally but not per-package partial failures)
  - Recommended answer: Per-package soft-fail. Emit a structured diagnostic (severity `error`, code like `GODOC_PACKAGE_PARSE_FAILED`) for the broken package, skip rendering it, and continue with the rest of the build. The CLI snapshot command exits non-zero when any error diagnostics are present (already specified) so CI catches it. A future `--strict` flag could escalate to full-build failure if needed.
  - If unanswered: Per-package soft-fail with diagnostics; keep the rest of the build alive.
  - Answered with: Per-package soft-fail with structured diagnostic; build continues. CLI exits non-zero on error-severity diagnostics. Future `--strict` flag can escalate.
- `internal/` packages render by intent (contributor docs), and `includeUnexported` can opt unexported symbols into rendering. Should those appear in `llms.txt`/`llms-full.txt`/search the same way as public/exported content, or be filtered from agent-facing surfaces by default?
  - Grounded in: spec_gap:agent-surface-privacy (Phase 5 makes search/llms outputs part of the plan but is silent on whether private content propagates equally)
  - Recommended answer: Uniform surface. Whatever renders to HTML also goes to `llms.txt`, `llms-full.txt`, and search. Don't infer privacy policy from path conventions (`internal/`) or export status. Projects shipping public docs use `exclude: ["./internal/..."]` and leave `includeUnexported: false`. Sourcey doesn't second-guess. Document the implication so operators make a deliberate choice. If demand emerges, a future `agentSurfaces?: { excludeInternal?: boolean; excludeUnexported?: boolean }` knob can add per-surface filtering without changing this default.
  - If unanswered: Default to uniform surface; document the privacy implication in the live/snapshot operator notes.
  - Answered with: Uniform surface. Operator uses `exclude` and `includeUnexported` to control what's rendered; agent surfaces follow.


## Planning Log

- none
