---
name: sourcey-operator-bringup-workflow
description: Agent-readable workflow guidance for sourcey/sourcey.
---

# Sourcey Operator Bringup Workflow

This is a portable skill document for agents working in `sourcey/sourcey`.

## Evidence Sources

- `.github/workflows/ci.yml`
- `README.md`
- `package.json`

## Workflow

Use this skill when working on the `operator-bringup` workflow. Inspect the evidence sources before editing, preserve existing validation commands, and report any skipped checks explicitly.

## Safe Operating Rules

- Prefer repo-documented commands over invented commands.
- Do not claim support that the repo docs or CI do not validate.
- Keep mutation boundaries explicit and ask for approval before publishing external changes.

## Optional Compatible Tooling Note

This file is a portable `SKILL.md`. Agents and tools that understand `SKILL.md` can use it as repo workflow context. runx can optionally pair it with a registry binding for execution, verification, and receipts, but this repo does not require runx to use the file.

