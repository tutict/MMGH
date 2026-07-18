# Project Engineering Context

Status: experiment-complete
Updated: 2026-07-18
Supervisor: Codex primary agent
Integrator: Codex primary agent

## Identity and Goal

- Project ID: `MMGH-REFACTOR-EXP-001`
- Experiment: `EXP-001`, a real-project observational Full Loop pilot.
- Goal: improve MMGH maintainability and change safety by completing one bounded,
  independently acceptable refactor Loop without changing user-observable behavior.
- Delivery mode: `delivery-only`; release and deployment are not required or authorized.

## Users, Actors, and Core Use Cases

- Primary user: one local operator using MMGH as a personal Agent workbench.
- Runtime actors: React app shell, Web-preview storage adapter, Tauri commands, Rust
  persistence/provider modules, SQLite, and the operating-system keyring.
- Core flows: Today review; Agent session create/select/run; Knowledge note editing;
  Reminder scheduling/completion; Skill editing/history; Provider settings; auxiliary
  Weather/Music/Gallery workspaces; desktop lifecycle; mobile shell; build/release checks.

## Included Scope

- Audit the real product, React, Web/Tauri storage, Rust, SQLite, security, test, and
  release boundaries.
- Plan two to four cohesive candidate Loops.
- Execute only `LOOP-001`: characterize and extract the workspace snapshot identity
  reconciliation policy currently embedded in `App.tsx`, then integrate it unchanged.
- Produce Full Loop contracts, Deliveries, independent reviews, integration evidence,
  Closure, Checkpoint, experiment observations, and results.

## Excluded Scope

- Completing the whole MMGH refactor or any other candidate Loop.
- New product features, UI redesign, database/schema changes, Provider/API-key policy
  changes, Tauri permission changes, data migration, dependency or language upgrades.
- New state-management or DI frameworks, full DDD, zero-copy, cloud/backend/accounts.
- Merge to `master`, pull request, tag, release, deployment, or installer execution.
- Pre-existing user files `PRODUCT.md` and `.impeccable/live/config.json`.

## Domain and Business Invariants

- Session, Knowledge, Reminder, Skill, and Provider are useful module boundaries; the
  current evidence does not justify a full Aggregate/Domain Event framework.
- A storage operation returns one workspace snapshot. The app may preserve references
  for semantically equal subtrees, but it must adopt every semantic change.
- Desktop and mobile composition must consume the same application actions and state.
- Web preview and Tauri are alternative storage/runtime paths, not two UI state sources.
- API-key plaintext must not be persisted to SQLite or localStorage or projected to the
  frontend snapshot; remote HTTP Provider endpoints stay blocked while local/private
  HTTP behavior and trusted-host rules remain unchanged.
- SQLite schema version, foreign keys, command payloads, release scripts, and current
  user-visible loading/error behavior remain compatible in `LOOP-001`.

## Data, Concurrency, and Security

- Sources: React memory/localStorage caches, preview workspace localStorage, Tauri
  command snapshots, SQLite, and keyring secrets.
- Ownership: Rust/SQLite owns desktop persistent domain state; keyring owns desktop API
  keys; preview localStorage owns sanitized Web-preview state; React owns transient UI.
- Consistency: preview writes use retry/conflict checks; Rust mutations use transactions
  and publish snapshot cache only after success; app sync can be deferred while drafts
  or actions are active.
- Trust boundaries: user input and imported JSON; Provider URL/network responses; Web
  storage; Tauri IPC; local SQLite/keyring; build/release artifacts.
- Authentication/accounts are not present. Authorization is local application command
  capability plus current repository/user authority.

## Current Architecture

- Frontend: React 18 + TypeScript + Vite + MUI/Emotion. `App.tsx` is the application
  composition root but also directly coordinates multiple domain actions, caches,
  lifecycle effects, timers, view models, and snapshot reconciliation.
- Adapters: `src/storage/agent.ts` selects Tauri IPC when available and otherwise runs
  a sanitized Web-preview implementation; `src/storage/tauri.ts` lazily loads IPC/events.
- Backend: Tauri command facade over Rust modules. `db.rs` is large but already delegates
  schema, query, projection, transaction, and snapshot helpers to submodules.
- Persistence/security: rusqlite + versioned schema; OS keyring for active/staged API
  keys; frontend and Rust Provider URL validation; reqwest Provider client.

## Architecture Profile

- Domain modeling: selected domain vocabulary and invariants only.
- Backend: retain current layered Rust modules; no Rust change in `LOOP-001`.
- Frontend: composition root -> pure application snapshot policy -> storage snapshot
  input. The extracted policy owns identity reuse, not state or side effects.
- Dependency injection: explicit function/module boundary only; no framework.
- OOP: not selected; pure transformations have no lifecycle or polymorphic need.
- Performance: identity stability is behavior characterized by tests; no claim of faster
  rendering without profiling.
- Zero-copy: not applicable; no measured copy hotspot or large transfer in this Loop.

## Engineering Concern Matrix

| Concern | Impact | Required Work | Reviewer |
|---|---|---|---|
| Users and business rules | High | Preserve all snapshot fields and app flows | Spec |
| Data and consistency | High | No second state source; no schema/adapter edits | Spec, Standards |
| Concurrency | Medium | Preserve deferred sync and transition call sites | Standards |
| Permissions/security | High | Confirm no Provider, keyring, capability changes | Standards |
| Logging/observability | Low | Keep existing error/log paths; disclose gaps | Standards |
| Rollback | Medium | Three bounded commits on experiment branch | Supervisor |
| Operations/release | Medium | Run existing build chain; no release | Standards |
| Evolution | High | Create tested application boundary | Standards |
| Team collaboration | Medium | Serial conflict group for test/extraction/App wiring | Supervisor |

## Project Acceptance

### Functional Acceptance

- `LOOP-001` preserves current frontend behaviors and the Web/Tauri snapshot contract.

### Engineering Acceptance

- The selected policy is outside `App.tsx`, typed without suppression, independently
  characterized, and introduces no state source or unauthorized abstraction.

### Delivery Acceptance

- Required validation, independent Spec/Standards review, honest Closure, Checkpoint,
  experiment scorecard/results, commits, and permitted experiment-branch push complete.
- This acceptance covers only EXP-001 and `LOOP-001`, never the entire MMGH refactor.

## Git and Authority Boundary

- Baseline: `master` at `e0a4953e0dfd69b7f21e3be7c190a11c95def43f`.
- Work branch: `experiment/looppilot-mmgh-exp-001`.
- Modify/commit/push this experiment branch: authorized by the current user request.
- Delete important data, merge, PR, tag, release, deploy, force-push: not authorized.

## Full Loop Relationships

- Loop Map: `.looppilot/LOOP-MAP.md`
- Current Loop: `.looppilot/loops/LOOP-001/LOOP-CONTRACT.md`
- Scope/status authority: this file for Project; Loop Map for Loops; Task/Finding
  Ledgers for their respective states; `CHECKPOINT.md` for recovery.

## EXP-001 Completion Boundary

- `LOOP-001` met its three acceptance layers and Closure Barrier on 2026-07-18.
- The verified delivery boundary `64148b0d9eab0249ae7260c4ed109fa27bf4b8f7`
  was pushed to `origin/experiment/looppilot-mmgh-exp-001` before final state projection.
- Project status means this observational experiment is complete. It does not accept the
  whole MMGH refactor, any candidate Loop, release, deployment, or production migration.
