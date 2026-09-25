# Review Contract: TASK-004 Implementation

- `review_id`: REVIEW-TASK-004
- `parent_goal`: MMGH-REFACTOR-EXP-003
- `fixed_boundary`: current branch HEAD `ba5dc32e1950340206771b27d50eef2dbc75767d`
  plus the complete uncommitted TASK-002/003/004 test/product diff and Deliveries.
- `scope`: TASK-004 Contract/Addendum/Delivery, prior characterization Deliveries/review,
  `src/security/provider.ts` and tests, Rust settings policy and focused tests.
- `forbidden`: implementation/test/Ledger edits, commit/push, user files, real network/key/data.
- `objective`: independently decide TASK-004 Spec and Standards readiness for integration.
- `Spec axis`: exact parity outcomes, included/excluded scope, TS/Rust consistency, behavior
  preservation, evidence, no unauthorized product change.
- `Standards axis`: minimality, host normalization semantics, Rust env/default behavior,
  test isolation, types/style, maintainability, no secret/data/permission impact.
- `success_criteria`: separate axis verdicts; overall approved only if both pass and focused
  evidence is observed; Findings/corrections are explicit and no parent completion is claimed.
- `required_evidence`: current Git diff, Deliveries, Vitest 8/8, Rust Provider 6/6,
  lint/typecheck/rustfmt/diff-check.
- `authority`: read=true, modify=false, delete=false, commit=false, push=false, release=false,
  deploy=false, external_communication=false
- `reviewer`: independent TASK-004 Review Worker
- `integration_owner`: Codex primary agent
- `revision_budget`: 2
- `created`: 2026-07-19
