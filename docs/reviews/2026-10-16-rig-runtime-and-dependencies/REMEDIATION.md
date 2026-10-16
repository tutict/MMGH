# Remediation Log — Rig Runtime Refactor and Dependency Upgrade

## Purpose

Records how each finding from the four-axis review was dispositioned after the review. The original review documents are left unchanged so the review record stays intact; this log is the authoritative status.

## Status Summary

| ID | Axis | Severity | Disposition | Evidence |
|---|---|---|---|---|
| S1 | Spec | P3 | Fixed | `CHANGELOG.md` reworded: the module was split and calls delegated to Rig, not "removed" |
| T1 | Standards | P2 | Fixed | Multi-part content test added; endpoint behavior already pinned by `normalize_compatible_base_url_accepts_root_or_full_endpoint` |
| T2 | Standards | P2 | Fixed | Four loopback-stub tests now exercise the Rig call path |
| T3 | Standards | P3 | Fixed | `src-tauri/Cargo.toml` trailing newline restored |
| D1 | Data | P2 | Fixed | Same coverage as T2 |
| D2 | Data | P3 | Fixed | `HTTP_CLIENT` is now `Lazy<Result<Client, String>>`; `build_agent` propagates the error instead of panicking |
| D3 | Data | P3 | Fixed | `CHANGELOG.md` records the bundled SQLite delta (`libsqlite3-sys` 0.38.2) |
| D4 | Data | P3 | Documented, not pruned | `cargo tree -e normal` confirms only `reqwest 0.13.5` and `rig* 0.42.0` build; the extra lock entries are feature-independent |
| C1 | Compatibility | P3 | Documented | `CHANGELOG.md` Notes records the `model_detail` text change |
| C2 | Compatibility | P3 | Verified, accepted deviation | Rig concatenates parts without a separator; pinned by `complete_reply_concatenates_multi_part_content` |
| C3 | Compatibility | P3 | Documented | `CHANGELOG.md` Notes records the `keyring` failure-mode change |

## Detail

### T1 / T2 / D1 — Rig call-path coverage

Added to `src-tauri/src/agent/runtime.rs` (`#[cfg(test)] mod tests`), backed by a dependency-free loopback HTTP stub (`spawn_stub_provider` + `drain_request`):

- `complete_reply_returns_assistant_content` — 200 string content returns the assistant text.
- `complete_reply_surfaces_provider_error` — 401 fails with a `Rig agent completion failed` context.
- `complete_skill_draft_returns_content` — the skill-draft path returns provider content.
- `complete_reply_concatenates_multi_part_content` — pins the array-of-parts behavior.

`[dev-dependencies] tokio = { version = "1", features = [ "rt", "macros" ] }` was added for `#[tokio::test]`. `Cargo.lock` gained one `tokio` entry on the `mygh` package; no other resolution changed.

Observed: `cargo test --manifest-path src-tauri/Cargo.toml agent::runtime` -> 7 passed; full suite -> `k6_backend_harness` 43 passed / 1 ignored, `mygh` 59 passed / 1 ignored.

### Follow-up — orchestration coverage (previously listed as uncovered)

Added `src-tauri/src/agent/tests.rs` with end-to-end orchestration tests against a loopback stub, plus shared helpers in `src-tauri/src/agent/test_support.rs` (stub provider, temp workspace, env guard):

- `run_agent_persists_remote_reply` — a 200 completion is persisted as the assistant message.
- `run_agent_falls_back_and_never_leaks_the_api_key` — a 401 persists the local fallback reply and the serialized snapshot never contains the API key.
- `forge_skill_returns_remote_draft` — the remote draft is parsed and returned with no warning.
- `forge_skill_falls_back_to_local_draft_on_provider_error` — a provider failure returns the local draft with a warning.

These hold `crate::db::TEST_STATE_LOCK` (promoted to `pub(crate)` in `db.rs`) because the app data dir and provider caches are process-global.

Still not covered: the live provider network path against a real endpoint, and cross-platform keyring behaviour. The orchestration and Rig seams are now covered.

### C2 — Multi-part content parity (confirmed deviation)

The removed homemade client joined `content` parts with `"\n"`; Rig concatenates them with no separator. The stub test returns `[{"type":"text","text":"first"},{"type":"text","text":"second"}]` and Rig yields `"firstsecond"` (previously `"first\nsecond"`). Array-of-parts content is uncommon for chat completions, so this is accepted and pinned rather than worked around (the separator is lost inside Rig and cannot be reconstructed downstream).

### D4 — Lockfile extras

`src-tauri/Cargo.lock` still lists `reqwest 0.12.28` (via `hf-hub` / `lance-namespace-reqwest-client`, pulled by `fastembed`) and Rig vector-store crates (`rig-milvus`, `rig-helixdb`). These are optional dependencies of Rig; `Cargo.lock` is feature-independent, so they cannot be pruned without removing the dependency that declares them. `cargo tree -e normal` shows they are absent from the host build graph. Left as-is; recorded here so SBOM/audit noise is a known, accepted condition.

## API Key Leak Question — Resolved

The open question ("can a Rig error string carry the API key into the persisted `model_detail`?") is now covered by two tests:

- `agent::runtime::tests::complete_reply_never_echoes_the_api_key_in_errors` — a 401 from the stub must not include the configured key in the error string.
- `agent::tests::run_agent_falls_back_and_never_leaks_the_api_key` — after a failing run, the fully serialized `WorkspaceSnapshot` (which includes the persisted `model_detail` activity) must not contain the key.

Both pass. Residual: this is verified against a loopback stub, not a live provider; a future Rig version could change error formatting, so the assertion should be kept.

## Remaining Unverified

- Live provider behaviour (real network, real keyring backend, non-Windows targets) remains unexercised.

## Follow-up — Rig 0.42 to 0.44 migration

A later dependency pass bumped Rig to 0.44, which is a breaking release. `src-tauri/src/agent/runtime.rs` was migrated to the new provider/agent API and re-verified:

- `openai::Client::builder()...completions_api()` -> `openai::OpenAIConfig::new(key).with_base_url(url).connect(ReqwestClient::from(client))`.
- `client.agent(model)` -> `AgentBuilder::new(client.chat(model))`; `Agent` is now non-generic.
- `agent.chat(..)` now returns `PromptResponse`; the runtime maps it through `PromptResponse::output()`.
- The `Chat`/`AgentClientExt` imports were dropped (the methods are inherent).

One behavior change needed pinning: Rig 0.44 routes `completion()` to OpenAI's Responses API by default, while this app targets generic OpenAI-compatible gateways. The runtime therefore requests the Chat Completions wire explicitly (`client.chat(model)`); `complete_reply_concatenates_multi_part_content`, `complete_reply_returns_assistant_content`, and `complete_skill_draft_returns_content` would all return empty output on the Responses wire, so they guard this.

Re-verification after the migration:

- `cargo check --manifest-path src-tauri/Cargo.toml --all-targets` -> exit 0.
- `cargo test --manifest-path src-tauri/Cargo.toml agent::` -> 16 passed.
- Full `npm test` chain -> lint, typecheck, unit, build, and Rust suites all green.

The API-key-leak assertion (`complete_reply_never_echoes_the_api_key_in_errors`) still holds after Rig changed `CompletionError` to `ProviderError`, so the residual risk recorded above did not materialize.

## Verification Observed After Remediation

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` -> exit 0.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` -> 43 + 54 passed, 2 ignored.
- `git diff --check` -> exit 0.