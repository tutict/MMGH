---
task_id: TASK-005
parent_goal: MMGH-REFACTOR-EXP-001 / LOOP-001
status: proposed
assigned_role: supervisor-integrator
assigned_to: Codex primary agent
objective: Obtain independent review, disposition Findings, close the Loop, and report EXP-001.
scope:
  allowed: [review contracts/reports, Finding and Rework decisions, closure/checkpoint/experiment docs, scoped commits and experiment-branch push]
  forbidden: [self-author Reviewer reports, hide findings/failures, merge/PR/tag/release/deploy]
deliverables: [reviews, Finding Ledger, optional Rework, Closure, Checkpoint, compaction, scorecard, observations, results]
success_criteria: [both review axes and all three acceptance layers pass honestly]
required_evidence: [post-review final validation, Git commits/status/sync/diff]
dependencies: [TASK-004]
authority: {read: true, modify: true, delete: false, commit: true, push: true, release: false, deploy: false, external_communication: false}
reviewer: two independent reviewers under separate contracts
integration_owner: Codex primary agent
revision_count: 0
revision_budget: 2
created: 2026-07-18
updated: 2026-07-18
---

# Task Contract

The Supervisor may accept or reject the Loop only from recorded integration, reviews,
Finding disposition, validation, and current authority. Success covers `LOOP-001` only.
