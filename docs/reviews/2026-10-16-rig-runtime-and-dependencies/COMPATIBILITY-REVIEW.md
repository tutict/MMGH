# Compatibility Review — Rig Runtime Refactor and Dependency Upgrade

## Verdict

`PASS with findings`. No Blocker or Major. Three Minor (P3).

## Review Boundary

- Reviewer role: Compatibility axis (Web/Tauri adapter result, error, DTO, and secret-projection compatibility); no implementation or Git change was made by this review.
- Reviewed revision: `master` at `9a189af` / `9b1c3ad` (Rig/deps files clean).
- Sources: `src-tauri/src/cmd.rs`, `src-tauri/src/agent/*`, `src-tauri/src/db/settings.rs`, `src/storage/agent.ts`, `src/storage/agent.test.ts`, `package.json`.

## Compatibility Assessment

- Command surface unchanged: `cmd.rs:156 run_agent(session_id, prompt)` and `cmd.rs:144 forge_skill(...)` keep their names, arguments, and `CommandResult<db::WorkspaceSnapshot>` / `CommandResult<GeneratedSkillDraft>` return types.
- DTOs unchanged: `WorkspaceSnapshot` and `AgentSettings` keep `#[serde(rename_all = "camelCase")]` and the same fields; `hasApiKey` remains boolean and `apiKey` remains blank in client projections (`db/settings.rs:532-537`).
- Frontend dispatch unchanged: `src/storage/agent.ts:2254` still routes `run_agent` through `isTauriAvailable() ? invokeTauri(...) : local...`.
- No frontend coupling to model status text: a search for `Provider call failed`, `Provider reply rejected`, `Provider call finished`, and `Provider not configured` in `src/` returns nothing, so the error-title strings are not parsed by the UI.
- Dependency migrations verified: `reqwest` `blocking` feature dropped and no `reqwest::blocking` usage remains; `rustls-tls` renamed to `rustls`; `keyring` `delete_password` to `delete_credential` and the now-fallible `Entry::new` handled with `.context(...)?` (`db/settings.rs:43,78,99`).

## Findings

### C1 (P3) — User-visible `model_detail` text format changed

Previously the detail string came from the homemade client, e.g. `provider returned 401 Unauthorized: <body>`. It is now the Rig error, e.g. `Rig agent completion failed: <rig error>`, truncated to 200 chars and persisted. This is an observability/cosmetic change with no contract break (the UI does not parse it), but it changes what operators see in run history.

### C2 (P3) — Multi-part content extraction parity unverified

The old client explicitly handled `content` as either a string or an array of parts (`extract_text`). The new path delegates parsing to Rig. Whether a provider that returns array-of-parts content is handled identically was not verified. The old tests that pinned this behavior were removed (see Standards T1).

### C3 (P3) — `keyring` 1.2 to 4 changes the failure mode for a missing backend

`keyring::Entry::new` is now fallible, so `load_api_key_from_account` returns `Err("failed to open keyring entry")` when no backend is available, where previously the error surfaced from `get_password()`. The failure still occurs (no silent success), but the message and the code path differ. On a headless Linux host this changes the reported error text.

## Exclusions

Cross-tab Web overwrite ambiguity, `activeReminder` nullability parity, stale contextual active-session parity, and Settings post-commit refresh status are pre-existing and out of this review's scope. Installer packaging and non-Windows targets were not exercised.