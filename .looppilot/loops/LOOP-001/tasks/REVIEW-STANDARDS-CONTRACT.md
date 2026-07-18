# Delegated Review Contract: Standards Axis

- Parent: `MMGH-REFACTOR-EXP-001 / LOOP-001 / TASK-005`
- Role: independent Reviewer; assignment occurs after Integration Barrier.
- Allowed: read contracts, ADR, code/diff, Deliveries, Integration Record, tests; write only
  `.looppilot/loops/LOOP-001/reviews/STANDARDS-REVIEW.md`.
- Reverification exception: after scoped Rework, the original Reviewer may additionally
  write `.looppilot/loops/LOOP-001/reviews/STANDARDS-REVERIFICATION-001.md`; the original
  Review Report must remain unchanged.
- Forbidden: implementation edits, Ledgers, Scope/status/authority changes, commit/push,
  accepting risk, or announcing Loop/Project completion.
- Required: judge module depth/interface, dependency direction, exact semantics, types, React
  call paths, mutation/side effects, test quality, unnecessary abstraction, state/source,
  security/runtime/schema/lockfile non-change, release compatibility, and evidence honesty.
- Verification: inspect actual diff and current test evidence; state limitations.
- Verdict: `pass`, `pass-with-findings`, `rework-required`, or `blocked`.
