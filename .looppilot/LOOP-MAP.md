# Project Loop Map

Status: active
Updated: 2026-07-18
Supervisor: Codex primary agent
Integrator: Codex primary agent
Project: `MMGH-REFACTOR-EXP-001`

## Authority

- Loop status authority: this file.
- Decision authority: Supervisor. Recording authority: Integrator.

## Project Goal

Complete one evidence-based refactor Loop and assess Full Loop process fitness without
representing the wider MMGH refactor as complete.

## Loop Ordering

1. `LOOP-001` is the only approved implementation Loop in EXP-001.
2. Other Loops are candidates and require a later Contract Barrier and current authority.

## Loops

| Complete | Loop ID | Title | Status | Depends On | Contract | Closure | Commit Required | Commit Authorized | Commit Result | Checkpoint |
|---|---|---|---|---|---|---|---|---|---|---|
| [ ] | LOOP-001 | Workspace Snapshot Reconciliation Boundary | integrated | none | approved | pending | yes | yes | pending | pending |
| [ ] | LOOP-002 | App Shell Runtime and Lifecycle Orchestration | candidate | LOOP-001 evidence | not-created | not-created | undecided | no-current-decision | not-created | not-created |
| [ ] | LOOP-003 | Domain Action Controllers for Core Workflows | candidate | LOOP-001, LOOP-002 decision | not-created | not-created | undecided | no-current-decision | not-created | not-created |
| [ ] | LOOP-004 | Storage/Tauri Contract and Release Evidence | candidate | audit evidence | not-created | not-created | undecided | no-current-decision | not-created | not-created |

## Grouping Rationale

- `LOOP-001` groups one coherent state transition policy: semantic equality and structural
  sharing for a complete workspace snapshot. It is called by both bootstrap/refresh paths,
  can be tested without React/storage, and changes one dependency direction.
- Runtime/lifecycle effects have different failure modes and are deferred to `LOOP-002`.
- Session/Knowledge/Reminder/Skill commands share UI state but require workflow-specific
  invariants; they remain `LOOP-003` rather than expanding the first Loop.
- Web/Tauri IPC, persistence, migration, security, and release contracts carry backend and
  operational risk; they remain `LOOP-004`.

## Candidate Evidence

- `App.tsx`: 5,855 lines, 51 `useState`, 35 `useEffect`, 29 `useCallback`, 36 `useMemo`.
- Snapshot equality/reconciliation occupies lines 319–626 before the React component.
- `App.tsx` directly imports 20 storage actions across five core domains plus settings.
- Existing tests cover storage/security and one active App integration behavior, but not
  snapshot structural sharing as an independent boundary.

## Deferred Loops

- `LOOP-002` through `LOOP-004`: intentionally not executed in EXP-001.

## Completion Projection Rules

- `[x]` is permitted only after accepted Closure, valid Checkpoint, honest commit result,
  and Loop status `closed`. Candidate, contracted, integrated, accepted, or committed
  states remain unchecked.
