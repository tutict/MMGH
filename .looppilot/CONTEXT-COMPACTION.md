# EXP-004 Context Compaction Manifest

## Identity

- Manifest ID: `MMGH-EXP-004-COMPACTION-001`
- Checkpoint: `CHECKPOINT-004`
- Project/Loop: `MMGH-REFACTOR-EXP-004` / `LOOP-005`
- Status: closed-push-verified

## Must Load

- Latest EXP-004 instruction and `.looppilot/CHECKPOINT.md`.
- `PROJECT.md`, `LOOP-MAP.md`, LOOP-005 `LOOP-CONTRACT.md`, `TASK-LEDGER.md`, and `FINDING-LEDGER.md`.
- `docs/experiments/looppilot-exp-004/STORAGE-ADAPTER-AUDIT.md` and `MODE-SELECTION.md`.
- LOOP-005 Deliveries, Integration Record, four Reviews, Closure, EXP-004 Results, and current Git state.

## Load On Demand

- `src/storage/agent.ts` / `agent.test.ts` for Web persistence semantics.
- `src-tauri/src/db.rs` / `db/snapshot.rs` / `db/settings.rs` and schema for transaction/data review.
- Focused product files only when rechecking the committed implementation.
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
- Baseline core checks passed; initial WiX bundling failed, while final desktop rerun produced exe/two MSI/NSIS artifacts without installation or staging.
- Selected RED was a fallible cache store after SQLite commit. The bounded recovery passes full validation and four independent Reviews; zero Findings/Rework.
- First EXP-004 push at `c5a2fd7` is verified local/remote `0 0`; the evidence-only commit requires one final push/sync check. Settings/keyring and other parity candidates remain excluded.
- Token usage is unavailable; no estimate is made.
- Real disk-full, production DB/keyring/provider, cross-process crash recovery, installer install, macOS/Linux, and user acceptance remain unverified.

## Authority Note

This Manifest routes context only and cannot change Scope, status, Findings, risk, permissions, or the single exact Resume Point in CHECKPOINT-004.
