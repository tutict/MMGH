# Loop Contract: Workspace Snapshot Reconciliation Boundary

## Identity

- Loop ID: `LOOP-001`
- Contract Status: approved
- Loop status source: `.looppilot/LOOP-MAP.md`
- Parent Project: `MMGH-REFACTOR-EXP-001`
- Supervisor/Integrator: Codex primary agent
- Created/Updated: 2026-07-18

## Objective

Separate the workspace snapshot semantic-equality and structural-sharing policy from the
React composition root into a typed, pure, independently characterized application module,
without changing MMGH behavior, storage/runtime contracts, or product scope.

## User and System Outcomes

- Existing desktop/mobile/Web-preview/Tauri flows continue to consume the same workspace
  state and action paths.
- Equal storage snapshots retain current references; changed fields are adopted; null and
  initial snapshot behavior remains unchanged.
- Future snapshot-policy changes have a focused test/module boundary and no longer require
  editing cross-domain logic inside the App composition root.

## Included Changes

- Characterization fixtures/tests for top-level and nested workspace reference reuse.
- New pure `src/application/workspaceSnapshot.ts` module with explicit structural types.
- Removal of the equivalent embedded helpers from `App.tsx` and import at the two existing
  call sites.
- Focused and full regression/build evidence plus experiment/closure documents.

## Excluded Changes

- New features, UI/layout/text changes, new hooks/controllers for other App responsibilities.
- Storage adapter/Tauri command/Rust/SQLite/schema/Provider/API-key/capability changes.
- New state source/library/DI framework, dependency/version/lockfile changes, full DDD,
  zero-copy, performance claims, release/deploy/installer execution.
- Candidate `LOOP-002` through `LOOP-004`; pre-existing user untracked files.

## Grouping Rationale

The included functions collectively implement one invariant: reconcile a complete incoming
workspace value while preserving the identity of semantically equal subtrees. Splitting the
equality functions from the merge would make either task unusable, while adding lifecycle or
domain actions would introduce different side-effect, rollback, and acceptance boundaries.
The module can be implemented, integrated, reviewed, committed, and recovered independently.

## Current Evidence

- Audit: `docs/experiments/looppilot-exp-001/MMGH-CURRENT-STATE-AUDIT.md`.
- Baseline: `docs/experiments/looppilot-exp-001/BASELINE-OBSERVATIONS.md`.
- Decision: `.looppilot/decisions/ADR-001-workspace-snapshot-boundary.md`.
- Existing source: `src/App.tsx` lines 319–626; call sites at baseline lines 874 and 894.

## Business Rules and Invariants

1. With no previous snapshot, return the incoming snapshot; with no incoming snapshot,
   return it unchanged.
2. If all compared semantic fields are equal, return the previous top-level snapshot.
3. Reuse equal top-level arrays/items and nested active-session arrays/items by reference.
4. Adopt changed settings/capability/session/message/activity/note/reminder/skill values.
5. Preserve top-level fields not explicitly reconciled through the incoming spread.
6. Do not mutate either input and do not access React, browser, storage, IPC, or Rust.
7. Do not broaden equality fields or “fix” projection semantics in this behavior-preserving
   Loop; any suspected contract defect becomes a Finding or later Scope decision.

## Engineering Concern Matrix

| Concern | Impact | Required Work | Reviewer |
|---|---|---|---|
| Users/business | High | Behavioral parity and full fields | Spec |
| Data/consistency | High | Pure merge; one App state owner | Spec, Standards |
| Concurrency | Medium | Preserve transition/sync call sites | Standards |
| Security/permissions | High if drift | No touched security/runtime files | Standards |
| Logging/monitoring | Low | No changed error/log path | Standards |
| Rollback | Medium | Bounded commit and reversible import | Supervisor |
| Operations/versioning | Medium | No dependencies/schema; build all targets | Standards |
| Collaboration | Medium | Serial App conflict group | Supervisor |

## Architecture Profile

- OOP: not used; no stateful lifecycle or polymorphism.
- Dependency Injection: module/function seam only; no framework.
- Domain Modeling: structural snapshot vocabulary, not an Aggregate system.
- Frontend Architecture: App composition -> pure application policy; adapters remain below.
- Performance: preserve existing reference semantics; no performance claim or optimization.
- Zero-copy: not applicable.
- Rejected: global store, broad controller extraction, adapter rewrite, deep-equality library,
  type suppression, and unrelated cleanup.

## Task DAG

| Task ID | Outcome | Depends On | Contract |
|---|---|---|---|
| TASK-001 | Audit, invariants, candidate Loops, Contract Barrier | none | `tasks/TASK-001.md` |
| TASK-002 | Focused failing characterization tests | TASK-001 | `tasks/TASK-002.md` |
| TASK-003 | Pure module and App integration implementation | TASK-002 | `tasks/TASK-003.md` |
| TASK-004 | Collect Deliveries and run integration verification | TASK-003 | `tasks/TASK-004.md` |
| TASK-005 | Reviews, Findings/Rework if needed, Closure/results/checkpoint | TASK-004 | `tasks/TASK-005.md` |

## Worker Plan

- TASK-001: Supervisor-produced audit/contract; no delegated implementation.
- TASK-002: delegated Test Worker, owns only the new test plus Delivery.
- TASK-003: delegated Implementation Worker after TASK-002, owns application module,
  `App.tsx`, and its Delivery. It must not edit the test or Ledgers.
- TASK-004/005: root Integrator/Supervisor. Reviewer assignments are independent,
  review-only contracts and do not edit implementation.
- Conflict group `APP-SNAPSHOT`: TASK-002 then TASK-003, strictly serial.

## Reviewer Matrix

### Mandatory Axes

- Spec Reviewer: behavior/scope/invariants/acceptance.
- Standards Reviewer: architecture, TypeScript, React integration, tests, security/runtime
  non-regression, maintainability, and unnecessary abstraction.

### Conditional Reviewers

- No separate Security/Data/Accessibility reviewer: Provider/keyring/storage/schema/
  permissions and UI interaction are excluded and must remain untouched.
- Architecture/frontend concerns are included in Standards Review due the small boundary.

## Integration Strategy

- Branch: `experiment/looppilot-mmgh-exp-001`.
- Merge order: characterization test -> implementation module -> App import/removal ->
  focused test/typecheck -> full quality chain.
- File ownership: TASK-002 test only; TASK-003 module/App only; Integrator owns Ledgers,
  integration record, Finding disposition, and projections.
- Mechanical conflict owner: Integrator. Semantic scope conflicts: Supervisor.

## Acceptance Criteria

### Functional Acceptance

- [x] Initial, missing, semantically equal, partially changed, and nested-session cases pass.
- [x] Existing App/mobile/storage/security unit tests pass.
- [x] Web build, Rust contract tests, and desktop debug build remain successful.
- [x] Loading/error/sync and both `mergeWorkspaceSnapshot` call paths are unchanged.

### Engineering Acceptance

- [x] Pure typed module contains the policy; App no longer defines it.
- [x] No second state source, side effect, type suppression, dependency, or meaningless layer.
- [x] Dependency direction matches ADR-001 and the module imports no infrastructure.
- [x] No storage/Rust/schema/security/permission/lockfile changes.
- [x] Independent Spec and Standards axes pass with Findings disposition recorded.

### Delivery Acceptance

- [x] All required Deliveries and Integration Record are complete.
- [x] `git diff --check`, lint, typecheck, unit, build, Rust tests, unified test, and desktop
  debug build have honest post-change results.
- [ ] Closure, Checkpoint, compaction, scorecard, observations/results, commits, push result,
  and residual unverified items are recorded.

## Barriers

### Contract Barrier

- [x] Audit, problem/users/invariants, included/excluded scope, DAG, worker/reviewer matrix,
  acceptance, authority, budget, risk, and stop conditions are explicit.
- Result: passed by Supervisor on 2026-07-18.

### Implementation Barrier

- [x] TASK-002 and TASK-003 submit scoped Deliveries with evidence.
- [x] No unauthorized scope/dependency/security/schema change.

### Integration Barrier

- [x] Mandatory Deliveries collected; conflicts resolved; focused/full checks pass.
- [x] Integration Record complete and no mandatory work remains unintegrated.

### Review Barrier

- [x] Independent Spec and Standards axes pass; all Findings are authoritatively disposed.

### Closure Barrier

- [ ] Three-layer acceptance passes; unresolved Blockers are zero; Closure and valid
  Checkpoint disclose commit/push/worktree and unverified evidence.

## Budget

- Context budget: host token number unavailable; use pressure states and minimal safe units.
- Revision budget: 2 for one approach/Finding.
- Maximum active Workers: 1 in the `APP-SNAPSHOT` conflict group.
- Maximum concurrent conflict groups: 1 during implementation; reviewers may run in parallel.
- Stop conditions: scope expansion; unexplained required-check failure; user overlap; two
  failed revisions; critical pressure; revoked authority.
- Budget-stop persistence: Ledgers, exact evidence, Checkpoint, compaction, one Resume Point.

## Authority

- Read/modify: yes, within MMGH experiment scope.
- Delete important data: no.
- Commit required/authorized: yes on experiment branch.
- Push authorized: yes, experiment branch only.
- Merge/PR/tag/release/deploy/force-push/external communication: no.
- Authority source: current user instruction; this Contract does not expand it.

## Risks and Decisions

- Type shape may be wider than currently inferred App values: use explicit optional
  structural fields and validate with project typecheck, without `any`.
- Equality omissions may be existing semantics: preserve, test, and report rather than alter.
- Full Loop overhead may exceed this change's value: measure honestly in experiment results.
- If review finds a Major/Blocker, Supervisor creates a scoped `TASK-NNN-R1`; Workers do not
  self-close Findings.
