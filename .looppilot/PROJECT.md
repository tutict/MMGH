# Project Engineering Context

Status: active
Updated: 2026-07-19
Supervisor: Codex primary agent
Integrator: Codex primary agent

## Identity and Goal

- Project ID: `MMGH-REFACTOR-EXP-003`
- Experiment: EXP-003, Storage/Provider Security/Cross-runtime Full Loop evaluation.
- Goal: align one observed Provider Security contract difference between TypeScript and
  Rust without exposing credentials, changing storage formats, or widening network access.
- Delivery mode: `delivery-only`; release and deployment are excluded and unauthorized.

## Users, Actors, and Use Cases

- Primary user: a local MMGH operator configuring an OpenAI-compatible Provider.
- Actors: Settings UI, TypeScript Provider assessment, Web preview adapter, Tauri IPC,
  Rust settings validation, SQLite sanitized settings, keyring, and reqwest Provider client.
- Use cases: review and save a Base URL, preserve/replace/clear an API key, run the same
  strict trusted-host policy in Web and Tauri, and reject unsafe endpoints before use.

## Included Scope

- Audit Provider Security, Web/Tauri storage, and SQLite migration boundaries.
- Execute `LOOP-004` only: align default trusted-host and trailing-dot host normalization
  behavior across TypeScript and Rust, with isolated tests and specialist review.
- Produce Deliveries, Integration Record, Reviews, Finding/Rework when evidence requires,
  active-loop recovery rehearsal, Closure, Checkpoint, results, commits, and branch push.

## Excluded Scope

- New Providers, UI redesign, schema/data migration, key migration, new persistence format,
  production calls, real credentials, redirect-policy or timeout changes, Tauri capability
  expansion, dependency upgrades, release/deploy/master/PR/tag, and whole-MMGH refactoring.
- Candidate runtime/domain Loops and user-owned `.impeccable/live/config.json`/`PRODUCT.md`.

## Invariants

- Remote HTTP stays rejected; local/private HTTP behavior stays unchanged.
- Strict trusted-host policy must make the same decision for the same normalized host.
- `api.openai.com` remains the default trusted Provider host across both runtimes.
- API-key plaintext remains out of SQLite, localStorage snapshots, client snapshots, logs,
  experiment documents, and Git; `apiKey` remains blank and `hasApiKey` remains a boolean.
- No schema, DTO field, command name, keyring lifecycle, timeout, redirect, or capability
  change is permitted in this Loop.
- Rejected settings must not persist; existing journal/rollback behavior remains intact.

## Architecture and Concerns

- Frontend validates operator feedback and preview saves; Rust is the authoritative desktop
  validation boundary before durable settings/keyring commit.
- Two small pure host-policy functions remain separate implementations, so parity tests and
  an Integration Record are required; a shared cross-language runtime is not justified.
- Security and compatibility impact are high; persistence implementation impact is low
  because schema, transactions, and keyring code are unchanged.
- Rollback is the removal of two bounded normalization/default changes and their tests.

## Acceptance

- Functional: strict-mode default and trailing-dot equivalent hosts agree across Web/Tauri;
  existing legal/illegal inputs, snapshots, key handling, and data formats remain compatible.
- Engineering: minimal typed/pure changes, no second state source or suppression, focused
  TS/Rust characterization plus full quality chain, and no security/permission broadening.
- Delivery: mandatory Deliveries, Integration Record, Spec/Standards/Security/Compatibility
  review, Finding disposition, recovery rehearsal, Closure, Checkpoint, commits, and
  authorized EXP-003 push are complete and honest.

## Authority

- Modify/commit/push: authorized only on `experiment/looppilot-mmgh-exp-003`.
- Not authorized: important deletion, real secret access, production-data changes, master
  modification/push/merge, PR, tag, release, deploy, force-push, or external messaging.
- State sources: this file owns Project status; `LOOP-MAP.md` owns Loop status; the active
  Task/Finding Ledgers own their states; root `CHECKPOINT.md` owns recovery.

## Historical Boundary

- EXP-001 `LOOP-001` remains closed historical evidence.
- EXP-002 is a completed Lightweight experiment at `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`;
  it does not create a Full Loop status projection.
- EXP-003 begins from that verified local/remote boundary.
