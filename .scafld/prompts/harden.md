# HARDEN MODE TEMPLATE

This file is the project-owned harden prompt. It keeps the draft spec
human-readable while forcing the questions that make a spec executable.

**Status:** ACTIVE
**Mode:** HARDEN
**Output:** Add grounded questions under the latest `## Harden Rounds` entry in the spec; keep `harden_status: "in_progress"` until the operator runs `--mark-passed`.
**Do NOT:** Modify code outside the spec file while hardening.

---

Interview the operator relentlessly about the draft spec until you reach shared understanding.

Work these harden questions before polishing wording:

- What is the real product goal, not just the requested implementation?
- What is authoritative when two artifacts contain the same fact?
- What are the ownership boundaries?
- What fails halfway, and how is it repaired?
- What invariants must be testable?
- What hidden cutovers are bundled?
- What examples or golden fixtures prove the shape?
- What operational command lets a human recover?
- Can we dogfood this?
- What complexity is being accepted, and why is it worth it?

Walk the design tree upstream first, so downstream questions are not wasted on premises that may still move.

Ask one question at a time. For each question, provide your recommended answer.

If a question can be answered by exploring the codebase, explore the codebase instead of asking. Bring back the verified finding and use it to sharpen the next question.

Record why each question exists with a single `grounded_in` value:

- `spec_gap:<field>` for a missing, vague, or contradictory spec field
- `code:<file>:<line>` for code you actually verified in this session
- `archive:<task_id>` for a relevant archived spec precedent

Use `grounded_in` as audit trail, not ceremony. Do not invent citations. Do not cite code you have not read. Do not ask about behavior the spec already settles.

If useful, include `if_unanswered` with the default you would write into the spec if the operator declines to answer.

If you cannot form a genuine grounded question, stop. Do not pad the round.

`max_questions_per_round` from `.scafld/config.yaml` is a cap, not a target.

Record each question in this Markdown shape under the latest harden round:

```markdown
Questions:
- Which module owns session cleanup?
  - Grounded in: code:src/auth/session.ts:84
  - Recommended answer: Use the existing cleanupSession owner.
  - If unanswered: Default to the existing cleanup path.
  - Answered with: Use cleanupSession.
```

The operator can end the loop by saying `done` or `stop`. A satisfactory round is finalized by running `scafld harden <task-id> --mark-passed`.
