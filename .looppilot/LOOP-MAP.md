# Project Loop Map

Status: accepted-for-experiment
Updated: 2026-07-19
Supervisor: Codex primary agent
Integrator: Codex primary agent
Project: `MMGH-REFACTOR-EXP-003`

## Authority

- This file is the only Loop status authority.
- Supervisor owns Scope/acceptance decisions; Integrator records supported transitions.

## Loops

| Complete | Loop ID | Title | Status | Depends On | Contract | Closure | Commit/Checkpoint |
|---|---|---|---|---|---|---|---|
| [x] | LOOP-001 | Workspace Snapshot Reconciliation Boundary | closed | none | approved | accepted | historical EXP-001 |
| [ ] | LOOP-002 | App Shell Runtime and Lifecycle Orchestration | planned | historical evidence | not-active | not-created | EXP-002 was Lightweight, not this Loop |
| [ ] | LOOP-003 | Domain Action Controllers for Core Workflows | planned | later decision | not-created | not-created | not-authorized |
| [x] | LOOP-004 | Provider Security Contract Alignment | closed | EXP-002 boundary | approved | accepted | EXP-003 closure commit `b13343c` |

## Current Loop

- No Loop is active. `LOOP-004` closed after TASK-004 independent approval, the Integration
  Record, four Loop-level review axes, final validation, Finding disposition, and three-layer
  experiment acceptance.
- It groups one cross-runtime invariant: default trusted hosts and DNS trailing-dot
  normalization must lead TypeScript and Rust strict-mode validation to the same result.
- `LOOP-002`/`LOOP-003` remain inactive planning entries and are not prerequisites for this
  independent security contract.

## Completion Projection

- Only `closed` Loops may be checked. `contracted`, `executing`, `integrated`, `accepted`,
  `committed`, and `checkpointed` remain unchecked.
- LOOP-004 Closure is experiment acceptance only. It does not imply whole-MMGH completion,
  production security, release readiness, or deployment authority.
