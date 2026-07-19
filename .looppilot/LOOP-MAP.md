# Project Loop Map

Status: active
Updated: 2026-07-19
Supervisor: Codex primary agent
Integrator: Codex primary agent
Project: `MMGH-REFACTOR-EXP-004`

## Authority

- This file is the only Loop status authority.
- Supervisor owns Scope/acceptance decisions; Integrator records supported transitions.

## Loops

| Complete | Loop ID | Title | Status | Depends On | Contract | Closure | Commit/Checkpoint |
|---|---|---|---|---|---|---|---|
| [x] | LOOP-001 | Workspace Snapshot Reconciliation Boundary | closed | none | approved | accepted | historical EXP-001 |
| [ ] | LOOP-002 | App Shell Runtime and Lifecycle Orchestration | planned | historical evidence | not-active | not-created | EXP-002 was Lightweight |
| [ ] | LOOP-003 | Domain Action Controllers for Core Workflows | planned | later decision | not-created | not-created | not-authorized |
| [x] | LOOP-004 | Provider Security Contract Alignment | closed | EXP-002 boundary | approved | accepted | EXP-003 final `90177da` |
| [ ] | LOOP-005 | Storage Mutation Result and Cache Publication | integrating | EXP-003 boundary | approved | pending | `62a7857` / CHECKPOINT-004 |

## Current Loop

- `LOOP-005` is active at the Integration Barrier. TASK-001 through TASK-004 are integrated; TASK-005 review work is in progress.
- It groups one data/result invariant: optional Snapshot cache publication cannot turn a committed SQLite mutation into a rejected Tauri mutation result.
- `LOOP-002`/`LOOP-003` remain inactive planning entries and are not prerequisites.

## Completion Projection

- Only `closed` Loops may be checked. `contracted`, `executing`, `integrated`, `accepted`, `committed`, and `checkpointed` remain unchecked.
- LOOP-005 acceptance will cover only EXP-004's bounded contract, not whole-MMGH production data reliability or release readiness.
