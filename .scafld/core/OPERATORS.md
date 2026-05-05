# scafld — Operator Cheat Sheet

The short version:

- `spec` is the contract
- `session` is the ledger
- `review` is the adversarial gate

## Default Commands

```bash
scafld plan my-task --title "My task" --size small --risk low
scafld harden my-task
scafld harden my-task --mark-passed
scafld approve my-task
scafld build my-task
scafld review my-task
scafld complete my-task
scafld status my-task
scafld handoff my-task
scafld report
```

## When To Use What

- `plan`: create the draft
- `harden`: stress-test the draft before approval
- `approve`: human ratifies the contract
- `build`: start approved work and drive validation to the next handoff or block
- `review`: run the adversarial review gate
- `complete`: archive only after the review gate passes

Prompt ownership:

- `.scafld/prompts/*` is the active template layer
- `.scafld/core/prompts/*` is the managed reset copy

## Review Providers

Real review should use an external challenger:

```bash
scafld review my-task --provider codex
scafld review my-task --provider claude
scafld review my-task --provider command --provider-command "./reviewer"
```

`--provider local` is for development smoke tests, not production review.

## Metrics

Use `scafld report` to track:

- first-attempt pass rate
- recovery convergence rate
- challenge override rate

If those do not move, the value layer is not helping enough.
