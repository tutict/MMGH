---
task_id: TASK-003
parent_goal: MMGH-REFACTOR-EXP-001 / LOOP-001
status: proposed
assigned_role: worker
assigned_to: snapshot-boundary-worker
objective: Make the approved characterization green by extracting and wiring the pure module.
scope:
  allowed:
    - src/application/workspaceSnapshot.ts
    - src/App.tsx
    - .looppilot/loops/LOOP-001/deliveries/TASK-003-DELIVERY.md
  forbidden:
    - modify TASK-002 tests or authoritative Map/Ledgers
    - change semantic equality fields behavior call timing or React state ownership
    - modify storage Rust schema security dependencies UI or user files
deliverables: [pure typed module, App integration, Worker Delivery]
success_criteria:
  - focused characterization and typecheck pass
  - App contains import and two existing call paths but no embedded policy implementation
  - no any/type suppression/infrastructure import in new module
required_evidence: [focused Vitest, npm run typecheck, git diff]
dependencies: [TASK-002 submitted with expected red evidence]
skill_assignment:
  required: [tdd, codebase-design]
  optional: []
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

This is the only Worker allowed to edit `App.tsx`. Preserve the exact implementation policy
unless the characterization exposes a Contract conflict; report such conflict instead of
expanding Scope. Do not commit or claim integration/acceptance/closure.
