# Loop Contract: Storage Mutation Result and Cache Publication

## Identity

- Loop ID: `LOOP-005`
- Contract Status: `approved`
- Parent Project: `MMGH-REFACTOR-EXP-004`
- Loop status source: `.looppilot/LOOP-MAP.md`
- Supervisor/Integrator: Codex primary agent
- Created: 2026-07-19

## Objective and User/System Outcome

Ensure a committed SQLite mutation cannot be reported as a failed mutation merely because the optional in-memory Snapshot cache could not be published. The authoritative result is the complete Snapshot built by the transaction; Web/Tauri callers must be able to distinguish a pre-commit storage failure from a post-commit cache condition without retrying a successful create.

## Included Scope

- `src-tauri/src/db.rs` cache lock/publication behavior and focused temporary-SQLite tests.
- `src/storage/agent.test.ts` characterization that a throwing Web storage write preserves the prior raw record.
- Rust/TypeScript evidence, Integration Record, independent Spec/Standards/Data/Compatibility reviews, recovery, Closure, EXP-004 reports, and authorized branch commits/push.

## Excluded Scope

No SQL/schema/migration, keyring or Settings journal redesign, DTO fields, command names, error framework, active-selection policy, Web localStorage algorithm, UI, dependencies, permissions/capabilities/network, real data/credentials, release/deploy/master/PR/tag, or user-owned files.

## Grouping Rationale

Mutation result, transaction commit, cache publication, and client snapshot commit form one acceptance boundary. Separating the Rust cache fix from Web failure characterization would not prove that an error means `not durably committed` across the two adapters. The Loop is independently testable, reversible, and contains no durable format change.

## Current Evidence and Invariants

- Rust writes use `TransactionBehavior::Immediate`; snapshot projection runs before commit.
- `execute_workspace_transaction_in` currently commits then calls fallible `store_snapshot_cache`.
- Web localStorage writes and verifies the serialized record before returning a snapshot; cross-tab post-write overwrite ambiguity remains excluded and unverified.
- A pre-commit mutation/projection error must roll back and preserve the last snapshot.
- A post-commit cache publication failure must not be returned as a mutation failure; the built authoritative Snapshot must be returned.
- No duplicate retry may be required for cache-only failure; no SQL row may be created by a failed pre-commit operation.
- API key snapshots remain blank and `hasApiKey` remains boolean; Settings/keyring paths are unchanged.

## Error, Selection, DTO, and Transaction Contract

- Error taxonomy remains existing strings: validation/not-found/storage/conflict. This Loop adds no public code; cache publication is non-authoritative and is not surfaced as mutation failure.
- React commits only a fulfilled Snapshot; rejected operations preserve prior state and active IDs. Web quota/conflict errors remain rejected before persistence.
- Active selection and all DTO fields/defaults/nullability remain unchanged.
- SQLite transaction is the sole durable boundary; cache publication is best-effort after commit and must not be a second commit condition.

## Task DAG and Worker Plan

| Task | Outcome | Depends | Owner |
|---|---|---|---|
| TASK-001 | Audit, mode gate, and approved Contract | none | Supervisor/Integrator |
| TASK-002 | Web failure-state characterization and Delivery | TASK-001 | Frontend Contract Worker |
| TASK-003 | Rust post-commit cache RED and Data Delivery | TASK-001 | Rust/Data Contract Worker |
| TASK-004 | Minimal cache-poison recovery implementation and tests | TASK-002/003 | serial Implementation Worker |
| TASK-005 | Integration, independent reviews, Finding/Rework if needed | TASK-004 | Integrator/Reviewers |
| TASK-006 | Full validation, Closure, Checkpoint, report | TASK-005 | Supervisor/Integrator |

Workers own only their Task files and non-overlapping test regions. No Worker edits Ledgers, Scope, implementation outside its contract, or Git history.

## Reviewer Matrix

- Mandatory: independent Spec Review and Standards Review.
- Required: Data Review for transaction/partial-success/cache consistency.
- Required: Compatibility Review for unchanged Web/Tauri snapshot/error/DTO behavior.
- Security Review: not applicable; no sensitive Settings/keyring/projection behavior changes.

## Integration and Acceptance

- Integrate characterization Deliveries before implementation; compare Web and Rust mutation/error/selection/secret behavior.
- Integration Barrier requires focused tests, full `npm test`, Rust tests, and a record of desktop MSI limitation.
- Functional Acceptance: pre-commit failures roll back; injected post-commit cache failure returns the authoritative Snapshot; a throwing Web storage write leaves the prior raw record unchanged; no duplicate mutation is needed for the selected Rust cache condition.
- Engineering Acceptance: no schema/DTO/permission change, cache is not a second source of truth, poison recovery is bounded and tested, no test weakens authority.
- Delivery Acceptance: all mandatory Tasks and Reviews pass, Findings are dispositioned, recovery checkpoint is valid, full verification is honest, and only EXP-004 branch is committed/pushed.

## Barriers, Budget, Authority, Rollback, Stops

- Contract Barrier: approved after `STORAGE-ADAPTER-AUDIT.md` and `MODE-SELECTION.md`.
- Implementation Barrier: both characterization Deliveries ready and RED evidence observed.
- Integration Barrier: unified result, no semantic conflict, focused/full checks pass.
- Review Barrier: Spec + Standards + Data + Compatibility pass; no unresolved blocker/major.
- Closure Barrier: three-layer acceptance, Closure, Checkpoint, commit and push evidence.
- Revision budget: 2; context/token availability is `unavailable` and never estimated.
- Commit/push authority: EXP-004 branch only; no master/merge/PR/tag/release/deploy/force push.
- Rollback: remove only the cache recovery code/tests/docs for this Loop; no destructive Git operation.
- Stop on real secret/user data, schema/keyring/permission drift, unexplained baseline/regression, unavailable required independent Reviewer, user-file overlap, or two failed revisions.
