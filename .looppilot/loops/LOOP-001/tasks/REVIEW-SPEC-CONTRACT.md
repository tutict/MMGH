# Delegated Review Contract: Spec Axis

- Parent: `MMGH-REFACTOR-EXP-001 / LOOP-001 / TASK-005`
- Role: independent Reviewer; assignment occurs after Integration Barrier.
- Allowed: read contracts, audit, ADR, diff, Deliveries, Integration Record, tests; write only
  `.looppilot/loops/LOOP-001/reviews/SPEC-REVIEW.md`.
- Forbidden: implementation edits, Ledgers, Scope/status/authority changes, commit/push,
  accepting risk, or announcing Loop/Project completion.
- Required: judge included/excluded scope, seven invariants, desktop/mobile/Web/Tauri behavior,
  three acceptance layers, and evidence gaps. Preserve every Finding's evidence/severity.
- Verification: inspect actual diff and current test evidence; state limitations.
- Verdict: `pass`, `pass-with-findings`, `rework-required`, or `blocked`.
