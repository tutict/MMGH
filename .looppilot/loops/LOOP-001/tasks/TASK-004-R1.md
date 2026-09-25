---
task_id: TASK-004-R1
parent_goal: MMGH-REFACTOR-EXP-001 / LOOP-001
status: submitted
assigned_role: integrator-rework
assigned_to: Codex primary agent
objective: Correct FINDING-001 by projecting the observed integrated lifecycle with allowed Task statuses.
scope:
  allowed:
    - .looppilot/loops/LOOP-001/TASK-LEDGER.md
    - .looppilot/loops/LOOP-001/FINDING-LEDGER.md
    - .looppilot/loops/LOOP-001/deliveries/TASK-004-R1-DELIVERY.md
  forbidden:
    - modify implementation tests Deliveries Integration Record or Review Reports
    - change scope acceptance Reviewer severity or authority
deliverables: [corrected authoritative Task projection, Rework Delivery]
success_criteria: [TASK-002 through TASK-004 use integrated; readiness remains separate]
required_evidence: [Deliveries and Integration Record comparison, scoped diff check]
dependencies: [FINDING-001 Standards Review]
authority: {read: true, modify: true, delete: false, commit: true, push: true, release: false, deploy: false, external_communication: false}
reviewer: original Standards Reviewer `/root/loop001_standards_review`
integration_owner: Codex primary agent
revision_count: 1
revision_budget: 2
created: 2026-07-18
updated: 2026-07-18
---

# Rework Task Contract

This Rework is a state-projection correction required by `FINDING-001`. Only the Integrator
may edit the authoritative Ledgers. Original Reviewer judgment and the implementation commit
must remain unchanged; only that Reviewer can reverify the Finding evidence.
