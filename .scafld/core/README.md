# scafld Runtime

scafld builds long-running AI coding work under adversarial review.

## Core Model

- `spec`: reviewed contract
- `session`: durable run ledger
- `handoff`: generated transport for the next voice

The taught surface is deliberately small:

```text
plan -> harden -> approve -> build -> review -> complete
```

## Directory Layout

```text
.scafld/
  config.yaml
  config.local.yaml
  prompts/
    plan.md
    exec.md
    recovery.md
    review.md
    harden.md
  runs/
    {task-id}/
      handoffs/
      diagnostics/
      session.json
    archive/{YYYY-MM}/{task-id}/
  reviews/
  specs/
  core/
    prompts/
    schemas/
    scripts/
```

Prompt ownership:

- `.scafld/prompts/*` is the active template layer
- `.scafld/core/prompts/*` is the managed reset copy

## Handoffs

Each handoff is a sibling pair:

- `*.md` for the model
- `*.json` for the harness

Current runtime handoffs:

- `executor-phase-*`
- `executor-recovery-*`
- `challenger-review`

The handoff is one-way. scafld emits it; the system observes outcomes through
the filesystem and criteria runs.

## Default Integrations

When the workspace includes them, prefer:

- `.scafld/core/scripts/scafld-codex-build.sh <task-id>`
- `.scafld/core/scripts/scafld-codex-review.sh <task-id>`
- `.scafld/core/scripts/scafld-claude-build.sh <task-id>`
- `.scafld/core/scripts/scafld-claude-review.sh <task-id>`

They resolve the current scafld handoff first, then pass it to the external
agent runtime. That keeps handoff consumption as the default path instead of a
manual convention.

## Adversarial Review

Challenge fires at `review`.

That means:

- one challenger handoff per task
- one completion gate that matters
- one attribution metric that stays honest: `challenge_override_rate`

## Metrics

`report` surfaces:

- `first_attempt_pass_rate`
- `recovery_convergence_rate`
- `challenge_override_rate`

Use `scafld report` to inspect workspace-wide task state.
