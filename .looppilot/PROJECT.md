# Project Engineering Context

Status: active
Updated: 2026-07-19
Supervisor: Codex primary agent
Integrator: Codex primary agent

## Identity and Goal

- Project ID: `MMGH-REFACTOR-EXP-004`
- Experiment: EXP-004, Web/Tauri Storage Adapter contract and mode evaluation.
- Goal: audit Web/Tauri CRUD, errors, snapshot refresh, active selection, DTOs, transactions, and sensitive projections, then correct at most one evidence-backed contract cluster.
- Selected mode: Full Loop.
- Delivery mode: `delivery-only`; release and deployment are excluded and unauthorized.

## Users, Actors, and Use Cases

- Primary user: a local MMGH operator creating, opening, saving, and deleting workspace data.
- Actors: React handlers, TypeScript storage facade, Web localStorage preview, Tauri IPC, Rust commands/repositories, SQLite transactions, and Snapshot projection/cache.
- Selected use case: a durable SQLite mutation returns its authoritative Snapshot even if optional in-memory cache publication fails, avoiding a false mutation failure and duplicate retry.

## Included Scope

- Storage architecture audit and mode selection across Session, Knowledge, Reminder, Skill, and Settings.
- Execute `LOOP-005` only: characterize Web persistence failure and Rust post-commit cache publication, then implement the smallest approved cache-result correction if RED is reproduced.
- Produce Deliveries, Integration Record, Spec/Standards/Data/Compatibility reviews, Finding/Rework when evidence requires, validation, Closure, Checkpoint, reports, commits, and EXP-004 branch push.

## Excluded Scope

- All-domain adapter rewrite; SQL/schema/migration; keyring/Settings journal redesign; DTO or command field changes; active-selection redesign; Tauri capabilities; network/permissions; UI; dependencies; real data/credentials; release/deploy/master/PR/tag; and user-owned `.impeccable/live/config.json`/`PRODUCT.md`.
- Contextual stale-session parity, active-reminder nullability, and Settings post-commit refresh redesign remain candidate follow-up work, not LOOP-005 scope.

## Invariants

- A pre-commit storage/projection failure rolls back and returns an error without durable mutation.
- A committed SQLite mutation is not reclassified as failed by optional cache publication.
- Each successful write returns one complete authoritative `WorkspaceSnapshot`; React commits only fulfilled snapshots and preserves old state on rejection.
- IDs, timestamps, defaults, active-selection rules, command names, DTO fields/nullability, schema, and foreign keys remain unchanged.
- `apiKey` remains blank in client/persisted public settings and `hasApiKey` remains boolean; Settings/keyring code is untouched.
- Web preview remains local browser persistence and is not described as Tauri/native persistence.

## Architecture and Concerns

- SQLite is authoritative for Tauri writes; Snapshot cache is a performance optimization, not a second commit source.
- Web preview localStorage uses checked/verified writes before returning a Snapshot.
- Data consistency, partial-success, retry/idempotency, and cross-runtime result compatibility are material; Data and Compatibility Review are required.
- Security Review is not triggered because sensitive projection and keyring behavior are unchanged and explicitly checked as invariants.

## Acceptance

- Functional: injected pre-commit failure rolls back; injected post-commit cache failure returns the committed Snapshot; a throwing Web storage write preserves the prior serialized state; no repeat create is required for the selected Rust cache condition.
- Engineering: minimal bounded code, temporary SQLite/fake storage tests, no schema/DTO/permission change, no second state source, full frontend/Rust verification.
- Delivery: mandatory Deliveries/Integration/Reviews, Finding disposition, Closure/Checkpoint/results, commits, and authorized EXP-004 push are complete and honest.

## Authority

- Modify/commit/push: authorized only on `experiment/looppilot-mmgh-exp-004` within LOOP-005 Contract.
- Not authorized: important deletion, user file changes, real secret/user-data access, master modification/push/merge, PR, tag, release, deploy, force-push, or external messaging.
- State sources: this file owns Project status; `LOOP-MAP.md` owns Loop status; LOOP-005 Ledgers own Task/Finding status; root `CHECKPOINT.md` owns recovery.

## Historical Boundary

- EXP-001 `LOOP-001` remains closed historical evidence.
- EXP-002 completed Lightweight at `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`.
- EXP-003 `LOOP-004` completed Full Loop at `90177dad76d84dac5386bbd6e010e0c4a732aef4`.
- EXP-004 begins exactly at that verified local/remote boundary.
