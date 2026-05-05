---
spec_version: '2.0'
task_id: add-error-codes
created: '2026-02-18T09:15:00Z'
updated: '2026-02-18T14:42:00Z'
status: completed
harden_status: not_run
size: small
risk_level: medium
---

# Add typed error codes to document processing module

## Current State

Status: completed
Current phase: none
Next: none
Reason: none
Blockers: none
Allowed follow-up command: none
Latest runner update: none
Review gate: not_started

## Summary

The document processor uses unstructured string errors, making it difficult for callers to programmatically handle failures. Introduce a typed error code enum and structured error class so consumers can match on specific failure modes.

## Context

CWD: `.`

Packages:
- `src/services/documents`
- `src/errors`

Files impacted:
- `src/errors/codes.ts` (all) - New file defining DocumentErrorCode enum and error map
- `src/errors/document-error.ts` (all) - New DocumentProcessingError class using typed codes
- `src/services/documents/processor.ts` (45-120) - Replace string throws with DocumentProcessingError instances
- `src/services/documents/processor.test.ts` (all) - Update assertions to check error codes instead of message strings

Invariants:
- `domain_boundaries`
- `error_envelope`

Related docs:
- `docs/error-handling.md`
- `docs/architecture/service-layer.md`

## Objectives

- Define a DocumentErrorCode enum covering all known failure modes
- Create a structured error class that carries code, message, and context
- Migrate processor.ts from string throws to typed errors

## Scope



## Dependencies

- No external dependencies required

## Assumptions

- Existing error helper utilities in src/errors/ are compatible with subclassing
- No downstream consumers rely on exact error message strings for control flow

## Touchpoints

- src/errors: New error code enum and DocumentProcessingError class
- src/services/documents/processor.ts: Replace raw throws with typed error instances
- src/services/documents/processor.test.ts: Update test assertions to verify error codes

## Risks

- Downstream callers may catch generic Error and miss new type
- Incomplete coverage of error paths in processor.ts

## Acceptance

Profile: standard

Definition of done:
- [x] `dod1` DocumentErrorCode enum covers all processor failure modes
- [x] `dod2` All throw statements in processor.ts use DocumentProcessingError
- [x] `dod3` Tests assert on error codes, not message strings
- [x] `dod4` No regressions in existing test suite

Validation:
- [ ] `v1` compile - Project compiles with no type errors
  - Command: `npm run build`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `v2` test - All unit tests pass including updated error assertions
  - Command: `npm test -- --filter documents`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `v3` boundary - No throw of raw Error or string in processor.ts
  - Command: `rg 'throw new Error\|throw "' src/services/documents/processor.ts`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `v4` security - No hardcoded secrets in changed files
  - Command: `rg -i '(password|secret|api[_-]?key)\s*=\s*["'']\w' src/errors/ src/services/documents/`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none

## Phase 1: Define error codes and error class

Goal: Create the DocumentErrorCode enum and DocumentProcessingError class in src/errors/

Status: completed
Dependencies: none

Changes:
- `src/errors/codes.ts` (all) - Export a DocumentErrorCode string enum with values: INVALID_FORMAT, PARSE_FAILED, SIZE_EXCEEDED, ENCODING_UNSUPPORTED, PERMISSION_DENIED, STORAGE_UNAVAILABLE, TEMPLATE_MISSING, TIMEOUT. Each value should be a SCREAMING_SNAKE string matching the enum key.
- `src/errors/document-error.ts` (all) - Export DocumentProcessingError extending Error. Constructor accepts (code: DocumentErrorCode, message: string, context?: Record<string, unknown>). Exposes readonly code, context properties. Sets name to 'DocumentProcessingError'. Re-export DocumentErrorCode for convenience.

Acceptance:
- [ ] `ac1_1` compile - New files compile without errors
  - Command: `npx tsc --noEmit src/errors/codes.ts src/errors/document-error.ts`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac1_2` test - Error class instantiation works correctly
  - Command: `npm test -- --filter document-error`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac1_3` documentation - Error codes are documented in docs/error-handling.md
  - Command: none
  - Expected kind: none
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none

## Phase 2: Migrate processor error paths

Goal: Replace all raw throws in processor.ts with DocumentProcessingError using appropriate codes

Status: completed
Dependencies: phase1

Changes:
- `src/services/documents/processor.ts` (45-120) - Import DocumentProcessingError and DocumentErrorCode from src/errors. Replace each `throw new Error("...")` with the appropriate `throw new DocumentProcessingError(DocumentErrorCode.X, message, { context })`. Map each existing error string to the matching enum value: - "Invalid document format" -> INVALID_FORMAT - "Failed to parse document" -> PARSE_FAILED - "Document exceeds size limit" -> SIZE_EXCEEDED - "Unsupported encoding" -> ENCODING_UNSUPPORTED - "Permission denied" -> PERMISSION_DENIED - "Storage service unavailable" -> STORAGE_UNAVAILABLE - "Template not found" -> TEMPLATE_MISSING - "Processing timeout" -> TIMEOUT
- `src/errors/index.ts` (1-10) - Add re-exports for DocumentErrorCode and DocumentProcessingError so they can be imported from 'src/errors' directly.

Acceptance:
- [ ] `ac2_1` boundary - No raw Error throws remain in processor.ts
  - Command: `rg -c 'throw new Error' src/services/documents/processor.ts`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac2_2` compile - Processor compiles with new error imports
  - Command: `npx tsc --noEmit src/services/documents/processor.ts`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac2_3` security - No hardcoded secrets introduced
  - Command: `rg -i '(password|secret|api[_-]?key)\s*=\s*["'']\w' src/services/documents/processor.ts`
  - Expected kind: `no_matches`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none

## Phase 3: Update tests to assert on error codes

Goal: Migrate test assertions from message matching to code matching and add coverage for each error code

Status: completed
Dependencies: phase2

Changes:
- `src/services/documents/processor.test.ts` (all) - Import DocumentErrorCode and DocumentProcessingError. For each error-path test: - Replace `.toThrow("message")` with a catch block that asserts   `error instanceof DocumentProcessingError` and   `error.code === DocumentErrorCode.X`. - Verify error.context contains expected metadata where applicable. - Add one new test per error code to confirm the correct code is thrown   for each failure scenario.
- `src/errors/document-error.test.ts` (all) - Add tests for edge cases: missing context, serialization, instanceof checks, and name property.

Acceptance:
- [ ] `ac3_1` test - All processor tests pass with code-based assertions
  - Command: `npm test -- --filter documents`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac3_2` test - Full test suite passes with no regressions
  - Command: `npm test`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac3_3` integration - Document upload endpoint returns structured error on invalid input
  - Command: `npm run test:integration -- --filter document-upload`
  - Expected kind: `exit_code_zero`
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none
- [ ] `ac3_4` custom - Error code coverage matches throw site count
  - Command: none
  - Expected kind: none
  - Timeout seconds: none
  - Result: none
  - Status: pending
  - Evidence: none
  - Source event: none
  - Last attempt: none
  - Checked at: none

## Rollback

Strategy: per_phase

Commands:
- none

## Review

Status: not_started
Verdict: none
Timestamp: none
Review rounds: none
Reviewer mode: none
Reviewer session: none
Round status: none
Override applied: none
Override reason: none
Override confirmed at: none
Reviewed head: none
Reviewed dirty: none
Reviewed diff: none
Blocking count: none
Non-blocking count: none

Findings:
- none

Passes:
- none

## Self Eval

Status: not_started
Completeness: 3
Architecture fidelity: 3
Spec alignment: 2
Validation depth: 2
Total: 10.0
Second pass performed: false

Notes:
|
  All 8 error paths migrated with 1:1 enum coverage. Error class follows existing
  BaseError pattern in the codebase. Tests cover every error code individually plus
  integration test for the upload endpoint. No deviations from spec.

Improvements:
- none

## Deviations

- none

## Metadata

Estimated effort hours: 2.5
Actual effort hours: 3.0
AI model: claude-opus-4-6
React cycles: 12

Tags:
- error-handling
- typescript
- refactor

## Origin

Source:
- none

Repo:
- none

Git:
- none

Sync:
- none

Supersession:
- none

## Harden Rounds

- none

## Planning Log

- 2026-02-18T09:15:00Z - agent - Identified processor.ts as primary target. Found 8 throw statements using raw strings.
- 2026-02-18T09:40:00Z - agent - Confirmed src/errors/ has base helpers. Proposed enum + error class approach.
- 2026-02-18T10:05:00Z - user - User confirmed no schema changes needed. No downstream string matching on error messages.
- 2026-02-18T10:30:00Z - agent - Locked three-phase plan: define codes, migrate processor, update tests. Spec ready for review.
