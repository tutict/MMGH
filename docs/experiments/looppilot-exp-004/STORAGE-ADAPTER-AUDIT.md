# EXP-004 Storage Adapter Audit

## Boundary and Evidence

- Repository boundary: `experiment/looppilot-mmgh-exp-004` at `90177dad76d84dac5386bbd6e010e0c4a732aef4` before EXP-004 artifacts.
- `observed` means source, test, or command evidence read in this audit; `inferred` means a conclusion from observed facts; `unverified` means the path was not exercised.
- User-owned `.impeccable/live/config.json` and `PRODUCT.md` were preserved and their contents were not read into this audit.
- No real credentials, Provider request, or user database was used.

## Repository and Call Chain

The actual application path is:

```text
React handler (src/App.tsx)
  -> storage facade (src/storage/agent.ts)
  -> Web localStorage adapter OR Tauri invoke (src/storage/tauri.ts)
  -> Rust command (src-tauri/src/cmd.rs)
  -> db service/repository (src-tauri/src/db.rs and db/*.rs)
  -> SQLite transaction / snapshot projection
  -> camelCase WorkspaceSnapshot
  -> React commitWorkspaceSnapshot
```

`src/application/workspaceSnapshot.ts` only merges equal snapshot regions; it is not a second storage source. `src/storage/tauri.ts` only loads IPC and dispatches commands; it does not refresh or mutate state.

## Storage Domain Map

| Domain | Web preview | Tauri/Rust | Snapshot/selection | Evidence/tests |
|---|---|---|---|---|
| Session | `localCreateSession`, `localOpenSession`, `localDeleteSession` mutate a version-checked localStorage record and return `buildSnapshot` | `create_session`, `open_session`, `delete_session` call `db` and return `WorkspaceSnapshot` | create selects new; open selects requested; delete falls back to first remaining/session seed | `src/storage/agent.ts:1230`, `src-tauri/src/db.rs:582`, App handlers catch before commit |
| Knowledge note | create/save/delete update notes and unlink reminder references in one serialized Web write | create/save/delete run immediate transactions; delete uses FK `ON DELETE SET NULL` plus activity | open/create/save select requested; delete selects first remaining note | `src/storage/agent.ts:1312`, `src-tauri/src/db.rs:670`, Rust missing/not-found and delete tests |
| Reminder | create/save/delete update local record; delete preserves active non-target and selects first target replacement | create/save/delete transactionally update row and activity; delete projection preserves cached active replacement | open/create/save select requested; delete chooses replacement or zero | `src/storage/agent.ts:1386`, `src-tauri/src/db.rs:812`, Rust missing/link tests |
| Skill | create/save/delete update skill catalog and session mounts in localStorage | create/save/delete transactionally maintain `session_skill_mounts` and snapshot | create/save select requested; delete removes mounts and falls back through projection | `src/storage/agent.ts:1480`, `src-tauri/src/db.rs:951`, Rust active-session/mount tests |
| Settings/provider | Web validates URL, keeps secret in volatile memory, sanitizes workspace persistence, then returns snapshot | Rust validates, journals keyring/SQLite commit, sanitizes client snapshot, then reads a post-commit snapshot | active session is a projection preference; `apiKey` is blank in client snapshot and `hasApiKey` is boolean | `src/storage/agent.ts:1261`, `src-tauri/src/db/settings.rs:257`, Rust secret/journal tests |

## Web Adapter Map

- `isTauriAvailable()` chooses exactly one runtime per operation (`src/storage/agent.ts:2156`). Web preview is explicitly local browser preview; its readiness text says real Tauri session state is handled by Rust.
- `updateWorkspace` reads the current raw record, applies a mutator, checks the raw value again, writes serialized state, and verifies the written value (`src/storage/agent.ts:1185`). Concurrent edits retry up to four times and then return a conflict error.
- A Web mutation failure does not return a snapshot and therefore does not reach `commitWorkspaceSnapshot`. A quota failure is surfaced as storage failure; the existing test covers the message but not the preserved raw record.
- Web IDs are local monotonic numbers in the serialized workspace. Tauri IDs are SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` values. The returned application shape is the same snapshot field family, but TypeScript keeps some values loose (`number | string`).
- Web settings persistence strips `apiKey` from the workspace record and keeps the preview key in volatile memory only. Rust client projection calls `sanitize_settings_for_client`.

## Tauri/Rust and SQLite Map

- `src-tauri/src/cmd.rs` maps each CRUD command to a `db` function and formats `anyhow` errors as plain strings. There is no separate refresh command after CRUD.
- `execute_workspace_transaction_in` opens `TransactionBehavior::Immediate`, executes the mutation and snapshot projection inside the transaction, commits, and then stores the returned snapshot in an in-memory cache (`src-tauri/src/db.rs:1557`).
- Foreign keys are enabled; schema relations use cascade for session/note/skill mounts and `SET NULL` for reminder links (`src-tauri/sql/schema.sql`). No schema or migration change is proposed.
- Settings is intentionally different: keyring/journal/SQLite commit completes before `SnapshotProjection::read`; a projection failure returns `provider settings were committed but workspace snapshot refresh failed` and clears the snapshot cache (`src-tauri/src/db.rs:629`). Existing journal/rollback tests cover secret/DB failures.

## Mutation, Refresh, and Error Semantics

- For sessions, notes, reminders, skills, and agent runs, the authoritative snapshot is built before the SQLite transaction commits. Any mutation or projection error aborts the transaction. This gives a single success value and avoids a separate refresh retry.
- There is one real post-commit gap: `store_snapshot_cache(&snapshot)?` runs after `tx.commit()`. A poisoned/failing cache publication returns `Err` after durable SQL has committed. The frontend then retains its old snapshot and a retry can repeat a create/reminder/skill mutation. Existing `failed_transaction_does_not_publish_snapshot_cache` only proves pre-commit action failure and does not cover this post-commit branch.
- Web localStorage never returns a Snapshot until a write is verified. A throwing `setItem` and a pre-write CAS mismatch do not durably apply this attempt. A cross-tab overwrite after `setItem` but before verification is different: React still sees a rejection, while the attempted mutation may have existed transiently or may remain in the winning serialized value. Current tests do not distinguish that ambiguity, so this audit does not claim every Web rejection leaves localStorage unchanged.
- Settings already distinguishes the post-commit refresh error in Rust text, but the UI receives a rejected Promise and leaves the old snapshot. That path is recorded as a separate suspected partial-success area and excluded because it crosses keyring/journal semantics.

## Active Selection Rules

- `buildSnapshot` validates preferred IDs against each list and falls back to the first item (or zero/null for empty reminders) (`src/storage/agent.ts:1079`). React commits IDs only after a successful adapter Promise.
- Rust `SnapshotProjection` applies explicit selection IDs and otherwise falls back to the first list item. Seed helpers preserve or replace active regions for delete/upsert operations. The Web/Rust active reminder empty-state shapes differ: Web uses `null`, Rust serializes an empty `ReminderDetail` with ID zero; application impact is unverified.
- Deleting a missing ID is rejected before Web persistence and before Rust transaction commit. Failed operations therefore retain the last committed React snapshot in current handlers.
- The stale `activeSessionId` precondition is not fully symmetric: Rust resolves/rejects a missing contextual session before contextual writes, while several Web mutators still write and merely fall back during snapshot projection. This is a real suspected parity gap but is outside the selected cache-publication cluster.

## DTO and Sensitive Projection Comparison

| Contract | TypeScript | Rust | Decision |
|---|---|---|---|
| IDs | `number | string` snapshot aliases; Web numbers | `i64` serialized as JSON numbers | compatible for current values; loose TS typing remains unverified for large IDs |
| timestamps | `number | string` aliases | `i64` | current runtime values align; no field change |
| settings | camelCase `providerName/baseUrl/hasApiKey/apiKey/model/systemPrompt` | serde camelCase `AgentSettings` | fields align |
| secrets | client `apiKey` blank, `hasApiKey` boolean | `sanitize_settings_for_client` clears plaintext | protected by Web/Rust tests |
| active reminder | `ReminderDetail | null` | non-null `ReminderDetail`, empty ID-zero detail when absent | observed shape difference; no implementation in this Loop |
| command errors | rejected `Error` messages from Web or Tauri string | `Result<T,String>` formatted from `anyhow` | no structured error code; selected fix does not widen taxonomy |

## Existing Tests and Evidence Gaps

- Frontend: `src/storage/agent.test.ts` covers settings secret projection, missing reminder/session, localStorage quota, concurrent conflict, corrupt payload backup, and preview runtime behavior. It does not inject a post-return cache failure because Web has no equivalent cache layer.
- Rust: `src-tauri/src/db.rs` covers transaction rollback before commit, not-found, foreign-key-linked deletion, active session mounts, settings journal/secret rollback, sanitized snapshots, and migration. It does not cover cache publication failure after commit.
- Baseline observed: lint/typecheck pass; 18 frontend files/84 tests passed with 3 skipped; Rust unified targets 50 and 42 passed with 1 ignored each; Web build transformed 1004 modules; desktop binary built but WiX MSI bundling failed in `light.exe`.

## Candidate Clusters

| Candidate | Evidence | Scope | Score/decision |
|---|---|---|---|
| A. Post-commit cache publication result | `execute_workspace_transaction_in` can return error after SQL commit | Rust cache lock semantics, Rust failure-injection test, Web throwing-write characterization | **21/28; selected** |
| B. Contextual active-session precondition | Web mutators can write with stale contextual session while Rust rejects | Multiple domains and broader Web behavior; no change this Loop | 17/28; deferred |
| C. Active reminder DTO nullability | Web `null` vs Rust empty detail | DTO/projection compatibility and UI contract change | 14/28; suspected, no implementation |
| D. Settings commit/refresh status | Rust has explicit post-commit refresh error after keyring/SQLite journal | Keyring/journal and structured result redesign | 22/28 risk, but excluded from bounded change |

## Selected Boundary

Strengthen the Rust storage contract so an in-memory Snapshot cache failure cannot turn a committed SQLite mutation into a rejected mutation result. Cache is an optimization; the authoritative mutation result is the already-built `WorkspaceSnapshot`. Add a Rust failure-injection characterization and a focused Web test that confirms a throwing `setItem` does not change the raw workspace. Cross-tab post-write ambiguity is documented but excluded. No SQL/schema/keyring/DTO/command/UI change is approved.

## Rejected Broad Refactors and Unverified Areas

Rejected: all-domain adapter rewrite, shared TS/Rust runtime, new error framework, schema/migration work, keyring changes, settings redesign, Redux/DI, UI redesign, network/capability changes, and production fixtures. Unverified: real disk-full behavior, cross-process SQLite contention beyond existing tests, real keyring/Provider/network, installer installation, long-term cache recovery, macOS/Linux, and production user acceptance.
