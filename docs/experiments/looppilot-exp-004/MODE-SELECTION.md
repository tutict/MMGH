# EXP-004 Mode Selection

## Decision

**Full Loop** is selected before product implementation.

## Scoring (0-2)

| Dimension | Score | Evidence |
|---|---:|---|
| Cross-language coupling | 1 | Rust command result is consumed by the TypeScript adapter/UI |
| Storage domains | 2 | shared transaction wrapper affects session/note/reminder/skill writes |
| Data consistency risk | 2 | SQL commit and cache publication currently have different outcomes |
| Partial-success risk | 2 | post-commit cache error can report failure after durable write |
| Active-selection impact | 1 | returned snapshot/old React active IDs can diverge after a false failure |
| Sensitive-data impact | 0 | selected fix excludes Settings/keyring and does not expose secrets |
| TS/Rust DTO impact | 1 | no fields change, but command success semantics are cross-runtime evidence |
| Transaction impact | 2 | the boundary is immediately after `tx.commit()` |
| Multiple Worker value | 2 | independent Web characterization and Rust/Data failure-injection work are useful |
| Specialized Reviewer need | 2 | Data review is required; Compatibility review checks unchanged response/shape |
| Integration complexity | 2 | Web fallback, Rust transaction, cache and React commit must be compared |
| Recovery need | 2 | Full Loop state and checkpoint are needed for the multi-stage evidence chain |
| Scope uncertainty | 1 | Settings and stale-session candidates must be explicitly bounded out |
| Rollback complexity | 1 | code rollback is small, but durable outcome semantics require verification |
| **Total** | **21/28** | score informs but does not mechanically decide |

## Hard Triggers

- A mutation can commit SQL and then return failure from cache publication.
- A false failure can cause a repeated create/reminder/skill mutation.
- Rust/SQLite transaction and partial-success semantics require Data Reviewer.
- Web/Tauri result parity and compatibility evidence are needed even though no DTO field changes.

## Why Not Lightweight

Lightweight would under-represent the transaction/data boundary, cannot provide an independent Data verdict, and would make the post-commit error contract look like a local adapter edit. The selected change is narrowly scoped, but its acceptance depends on transaction, retry, and recovery evidence.

## Alternatives and Stops

- Candidate B (stale contextual session precondition) is real but spans multiple domains and is deferred.
- Candidate C (empty reminder detail versus `null`) is a compatibility gap without an observed user failure and is deferred.
- Candidate D (Settings post-commit refresh status) touches keyring/journal semantics and is excluded.
- If the RED cannot be reproduced with a temporary SQLite/failure-injection fixture, stop at the Contract Barrier and report audit-only; do not force implementation.
