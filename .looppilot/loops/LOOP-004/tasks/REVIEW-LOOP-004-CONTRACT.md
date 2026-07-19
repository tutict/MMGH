# Review Contract: LOOP-004 Integrated Boundary

- `review_id`: REVIEW-LOOP-004-001
- `parent_goal`: MMGH-REFACTOR-EXP-003
- `fixed_point`: EXP-002 `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`
- `scope`: integrated LOOP-004 diff through commit `86427b8`, Contract, Integration Record,
  all Deliveries, task reviews, Checkpoint/Recovery Rework, and current tests.
- `forbidden`: implementation edits, Ledger/status edits, commits/pushes, user files, real
  network/credentials/data, and altering Reviewer judgment.
- `objective`: independently judge Loop-level Spec/Standards/Security/Compatibility acceptance.
- `required_axes`: separate Spec, Standards, Security, Compatibility verdicts.
- `success_criteria`: each axis names observed evidence, gaps, and verdict; overall approval
  only if all required axes pass and no blocking Finding remains.
- `required_evidence`: fixed Git diff, Integration Record, focused parity, full validation,
  unchanged secret/data/permission surfaces, and Recovery Rework PASS.
- `authority`: read=true, modify=false, delete=false, commit=false, push=false, release=false,
  deploy=false, external_communication=false
- `reviewer`: independent specialist contexts
- `integration_owner`: Codex primary agent
- `revision_budget`: 2
- `created`: 2026-07-19
