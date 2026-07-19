# Review Contract: Characterization Deliveries

- `review_id`: REVIEW-CHARACTERIZATION-001
- `parent_goal`: MMGH-REFACTOR-EXP-003
- `scope`: TASK-002 and TASK-003 Deliveries, their focused tests, and the fixed LOOP-004 Contract.
- `forbidden`: implementation edits, Ledger/status edits, commits, pushes, user files, real
  credentials/network/database, and private Worker reasoning.
- `objective`: independently decide whether both characterization Deliveries have observed
  evidence sufficient to pass the task-level Spec and Standards axes and unblock TASK-004.
- `required_axes`: Spec (gap/target/scope/evidence) and Standards (test isolation, env safety,
  maintainability, protocol/authority, no secret/data exposure).
- `success_criteria`: each axis has a separate verdict; every correction/blocker is explicit;
  no vague approval; no parent completion claim.
- `required_evidence`: actual diffs, Delivery contents, focused command output, and Contract comparison.
- `authority`: read=true, modify=false, delete=false, commit=false, push=false, release=false,
  deploy=false, external_communication=false
- `reviewer`: independent Review Worker
- `integration_owner`: Codex primary agent
- `revision_budget`: 1
- `created`: 2026-07-19
