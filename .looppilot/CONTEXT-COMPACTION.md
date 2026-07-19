# EXP-004 Context Compaction Manifest

## Identity

- Manifest ID: `MMGH-EXP-004-COMPACTION-001`
- Checkpoint: `CHECKPOINT-004`
- Project/Loop: `MMGH-REFACTOR-EXP-004` / `LOOP-005`
- Status: active

## Must Load

- Latest EXP-004 instruction and `.looppilot/CHECKPOINT.md`.
- `PROJECT.md`, `LOOP-MAP.md`, LOOP-005 `LOOP-CONTRACT.md`, `TASK-LEDGER.md`, and `FINDING-LEDGER.md`.
- `docs/experiments/looppilot-exp-004/STORAGE-ADAPTER-AUDIT.md` and `MODE-SELECTION.md`.
- TASK-002/003 Contracts and Deliveries when submitted; current Git and focused test evidence.

## Load On Demand

- `src/storage/agent.ts` / `agent.test.ts` for Web persistence semantics.
- `src-tauri/src/db.rs` / `db/snapshot.rs` / `db/settings.rs` and schema for transaction/data review.
- Integration, Reviews, Findings/Rework, Closure, and EXP-004 reports as their barriers become active.
- EXP-003 Results only for experiment comparison or recovery contradiction.

## Must Not Load by Default

- Complete chat/private reasoning, full historical Worker records, all EXP-001/002/003 review history, real user content/credentials/databases, generated `dist/target/release` artifacts, or inactive candidate details.

## Authoritative Sources

| State | Authority |
|---|---|
| Project | `PROJECT.md` |
| Loop | `LOOP-MAP.md` |
| Task | LOOP-005 `TASK-LEDGER.md` |
| Finding | LOOP-005 `FINDING-LEDGER.md` |
| Recovery | root `CHECKPOINT.md` |

## Compacted Facts and Uncertainty

- EXP-004 starts at verified EXP-003 `90177da` with only excluded user files untracked.
- Full baseline passes except WiX MSI bundle; Web/Rust binary builds.
- Selected RED target is a fallible cache store after SQLite commit; Settings/keyring and other parity candidates are excluded.
- Token usage is unavailable; no estimate is made.
- Real disk-full, production DB/keyring/provider, cross-process crash recovery, installer install, macOS/Linux, and user acceptance remain unverified.

## Authority Note

This Manifest routes context only and cannot change Scope, status, Findings, risk, permissions, or the single exact Resume Point in CHECKPOINT-004.
