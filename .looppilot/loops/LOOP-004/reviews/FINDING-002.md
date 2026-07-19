# Finding FINDING-002

- Review reference: fresh-context recovery rehearsal, 2026-07-19
- Loop: `LOOP-004`
- Affected task/artifact: TASK-005 recovery rehearsal; root `CHECKPOINT.md` and
  `CONTEXT-COMPACTION.md`
- Reviewer: independent fresh-context Recovery Agent
- Severity: `major`
- Status source: `.looppilot/loops/LOOP-004/FINDING-LEDGER.md`

## Evidence

- Actual Git HEAD: `ba5dc32e1950340206771b27d50eef2dbc75767d`.
- Recorded Checkpoint HEAD: `ba5dc326a1e312e97dacb8eec20e66aece65fce3`, which does not exist.
- TASK-004 Delivery and implementation diff exist, but the Checkpoint Required Context and
  manifest Must Load omit the Delivery and the worktree summary predates those changes.
- Recovery Reviewer therefore reported that continuation was unsafe from the persisted
  state, despite the implementation diff appearing in Contract scope.

## Expected and Actual

- Expected: Checkpoint identifies the exact observed Git boundary, current dirty worktree,
  mandatory Delivery, one actionable Resume Point, and no false conflict claim.
- Actual: invalid full SHA plus stale/incomplete recovery inputs made the Checkpoint unsafe.

## Risk and Required Outcome

- Risk: a fresh Supervisor may validate the wrong boundary or integrate implementation
  without loading its Delivery; this defeats the active-loop recovery experiment.
- Required outcome: record the actual HEAD, current worktree, TASK-004 Delivery in Required
  Context/Must Load, and current Finding/Rework state without expanding Scope/authority.
- Verification: original fresh-context Recovery Agent re-runs the same read-only recovery
  instruction and reports safe continuation with no remaining Checkpoint gap.
- Suggested remediation boundary: `TASK-005-R1`; recovery artifacts and authoritative
  Ledger/Map projections only; no product/test changes.
