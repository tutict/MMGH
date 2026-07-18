---
task_id: TASK-002
parent_goal: MMGH-REFACTOR-EXP-001 / LOOP-001
status: approved
assigned_role: worker
assigned_to: snapshot-characterization-worker
objective: Characterize the public mergeWorkspaceSnapshot behavior before extraction.
scope:
  allowed:
    - src/application/workspaceSnapshot.test.ts
    - .looppilot/loops/LOOP-001/deliveries/TASK-002-DELIVERY.md
  forbidden:
    - modify App.tsx or implementation modules
    - modify authoritative Map or Ledgers
    - modify storage Rust schema security dependencies or user files
deliverables: [focused test file, Worker Delivery]
success_criteria:
  - tests express initial/null/equal/changed/nested structural-sharing behavior
  - focused test is observed failing only because the public module is not implemented
required_evidence: [focused Vitest command and exact failure summary, git diff]
dependencies: [TASK-001]
skill_assignment:
  required: [tdd]
  optional: [codebase-design]
  forbidden: [skill installation]
authority: {read: true, modify: true, delete: false, commit: false, push: false, release: false, deploy: false, external_communication: false}
reviewer: independent Spec and Standards reviewers after integration
integration_owner: Codex primary agent
revision_count: 0
revision_budget: 2
created: 2026-07-18
updated: 2026-07-18
---

# Task Contract

Use only the future public `mergeWorkspaceSnapshot` interface. Prefer a compact fixture and
behavior assertions over copying the entire App fixture. Do not implement production code or
edit the Task Ledger. Delivery status must be honest; an expected missing-module red result is
evidence, not a product failure.
