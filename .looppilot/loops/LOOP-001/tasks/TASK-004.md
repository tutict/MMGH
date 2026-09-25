---
task_id: TASK-004
parent_goal: MMGH-REFACTOR-EXP-001 / LOOP-001
status: proposed
assigned_role: integrator
assigned_to: Codex primary agent
objective: Collect mandatory Deliveries and verify the unified implementation boundary.
scope:
  allowed: [review Worker diffs, update Task Ledger, write Integration Record, run checks, make mechanical integration corrections]
  forbidden: [change semantic Scope, accept risk, alter Reviewer judgment, unrelated cleanup]
deliverables: [TASK-LEDGER projection, integration/INTEGRATION-RECORD.md]
success_criteria: [mandatory work integrated and Integration Barrier passes]
required_evidence: [focused tests, full required quality chain, clean scoped diff]
dependencies: [TASK-003]
authority: {read: true, modify: true, delete: false, commit: true, push: true, release: false, deploy: false, external_communication: false}
reviewer: independent Spec and Standards reviewers
integration_owner: Codex primary agent
revision_count: 0
revision_budget: 2
created: 2026-07-18
updated: 2026-07-18
---

# Task Contract

Integrator owns facts and mechanical conflict handling, not semantic acceptance.
