# EXP-003 Full Loop Selection

## Decision

- Selected candidate: Provider Configuration Security Contract.
- Decision: approve one bounded Full Loop implementation under `LOOP-004`.
- Evidence: strict-mode default hosts and trailing-dot normalization produce different
  TypeScript/Rust decisions for the same endpoint.
- Candidate score: 20/24. The score supports but does not authorize the decision by itself.

## Hard Triggers

- Provider network-security rules: yes.
- Sensitive API-key configuration boundary: yes, although key storage is excluded.
- Web/Tauri behavior consistency: yes.
- TypeScript and Rust contract/tests: yes.
- Security and Compatibility Review: required.
- Multiple independent Worker value: yes; non-overlapping TS and Rust characterization can
  prove each side before one serial implementation.
- Integration-only validation and active-loop Checkpoint: yes.
- SQLite/schema/Data Reviewer trigger: no; no persistence or migration code changes.

## Approved Boundary

- TypeScript: normalize a DNS trailing dot consistently and test strict default/explicit
  trusted-host behavior.
- Rust: provide the same default trusted host when configured hosts are empty and test it;
  preserve existing trailing-dot canonicalization.
- Integration: compare URL inputs and decisions across both suites.

Excluded: redirect policy, timeouts, API-key/keyring/journal behavior, DTO/schema/data
formats, new Provider/UI, production network, real credentials, permissions, dependencies,
release/deploy/master/PR/tag, and unrelated cleanup.

## Why Other Candidates Are Rejected

- Storage Adapter: representative CRUD/failure/secret stripping/transaction protections are
  present; loose typing and missing UI failure tests do not prove a bounded behavior defect.
- Migration: v1 fixture, transaction, row-count, foreign-key, rollback, and key migration
  protections exist. Remaining production/downgrade gaps cannot be safely resolved here, and
  a new schema version would be experiment-driven scope invention.

## Stop and Escalation Rules

- Stop if RED does not reproduce a real parity gap, implementation needs API-key/schema/
  permission changes, a test needs a real Provider/key, or independent Security Review is
  unavailable at the Review Barrier.
- Any Major/Blocker creates a scoped Rework Task; no risk is automatically accepted.
- Revision budget: two. Context pressure is qualitative; persist one exact Resume Point
  before any budget stop.
