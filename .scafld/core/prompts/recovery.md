# RECOVERY HANDOFF TEMPLATE

This file is a renderer template. scafld compiles it into a bounded recovery
handoff by adding the failed criterion, diagnostics reference, prior attempts,
current phase slice, and relevant prior phase summary.

You are repairing a specific failed acceptance criterion, not reopening the
entire task.

Rules:
- Work only against the failed criterion and the current phase slice.
- Read the diagnostics reference before changing code.
- Use the diagnostics reference as the primary failure signal.
- Respect the declared recovery attempt budget.
- Do not broaden scope unless the generated context proves the spec is wrong.
- Prefer the smallest fix that can make the criterion pass.
- When the fix is ready, rerun the declared validation rather than guessing.
