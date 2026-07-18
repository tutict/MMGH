# ADR-001: Extract the Workspace Snapshot Reconciliation Boundary

Status: accepted for `LOOP-001`
Date: 2026-07-18

## Context

`App.tsx` contains the pure equality and structural-sharing policy used whenever storage
returns a workspace snapshot. The policy spans settings, capabilities, sessions/messages,
notes, reminders, and skills. It is application-state logic, not view composition, yet it
is unexported and only exercised indirectly by the large App test harness.

## Decision

Move that policy to `src/application/workspaceSnapshot.ts`, give its input/output a
structural TypeScript contract, and characterize unchanged/equal/changed/null cases in a
focused unit test. `App.tsx` will import the pure `mergeWorkspaceSnapshot` function at its
two existing call sites. No hook, class, state container, adapter, or storage change is
introduced.

## Dependency Direction

`App.tsx` (composition/state owner) -> `application/workspaceSnapshot` (pure policy).
Storage snapshots are values passed into the function; the application module does not
import storage, React, browser, or Tauri infrastructure.

## Alternatives Rejected

- Extract all App actions/controller hooks now: too large and cross-domain for EXP-001.
- Introduce Redux/Zustand or a DI framework: no evidence of need; would create a second
  state model and expand dependencies.
- Leave the policy in App because it is pure: preserves low independent testability and
  makes every equality-field change an App-shell change.
- Rewrite equality with serialization/deep-equality: risks semantic/performance changes
  and obscures the explicit contract.
- Claim a performance improvement: rejected without profiling. Tests will establish
  reference-preservation semantics, not speed.

## Consequences

- Positive: one explicit, testable state-policy boundary and less cross-domain logic in
  the view composition root.
- Cost: a new application module and snapshot interfaces must stay aligned with storage
  projection fields. This is mitigated by TypeScript integration and characterization.
- Deferred: typed storage ports/controller hooks and cross-IPC contract tests remain later
  candidate Loops.
