# Standards Review — Rig Runtime Refactor and Dependency Upgrade

## Verdict

`PASS with findings`. No Blocker. Two Major (P2) coverage findings and one Minor (P3).

## Review Boundary and Sources

- Reviewer role: Standards axis; no implementation or Git change was made by this review.
- Repository sources: `README.md`, `package.json`, `src-tauri/rustfmt.toml`. No `AGENTS.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, CI workflow, or `clippy` configuration exists in the reviewed tree.
- Reviewed revision: `master` at `9a189af` / `9b1c3ad` (Rig/deps files clean).

## Conformance Evidence

- Formatting: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` -> exit 0.
- Whitespace: `git diff --check` -> exit 0.
- Lint: `npm.cmd run lint` (`eslint src --max-warnings 0`) -> exit 0, zero warnings.
- Types: `npm.cmd run typecheck` (`tsc --noEmit`) -> exit 0.
- Build: `npm.cmd run build` -> exit 0.
- Rust tests: `cargo test -- --test-threads=1` -> `k6_backend_harness` 43 passed / 1 ignored; `mygh` 50 passed / 1 ignored.
- Frontend tests: `vitest run` -> 19 files, 87 passed, 3 skipped (working tree; committed main 18 / 84 / 3).
- Module structure: `agent/mod.rs` declares `contract`, `fallback`, `runtime`, `skill`, `text`; the split follows the pre-existing one-concern-per-file convention and keeps `pub(super)` visibility.
- Rig integration: `runtime.rs` uses `default-features = false` with an explicit feature list; the shared `reqwest::Client` is injected via `.http_client(...)`, so the direct `reqwest` dependency and Rig resolve to the same major (0.13.5).

## Findings

### T1 (P2) — Content-extraction tests were deleted without replacement

The deleted `provider.rs` contained `extract_text_supports_string_and_content_parts` and `extract_text_rejects_empty_or_unknown_content`, covering both plain-string and array-of-parts `content` shapes. The new `runtime.rs` has no equivalent test; extraction is now delegated to Rig and is no longer asserted anywhere.

### T2 (P2) — The Rig call path has no automated test

`RigRuntime::complete_reply`, `RigRuntime::complete_skill_draft`, `agent::run_agent`, and `agent::forge_skill` are covered by no Rust test (no `src-tauri/tests/` integration dir exists and no `#[tokio::test]` is present). The only tests in the module are pure functions: `normalize_compatible_base_url_accepts_root_or_full_endpoint` and `to_rig_history_keeps_user_and_assistant_turns`. The frontend tests exercise the web-preview local path (mocking `window.fetch`), not the Tauri/Rust path. The `k6_backend_harness` calls `db::persist_agent_run` directly, bypassing the model call.

### T3 (P3) — `src-tauri/Cargo.toml` lost its trailing newline

The commit changed `path = "src/main.rs"` to an identical line while removing the file's final newline (`\ No newline at end of file` in the diff). This is a spurious, unrelated whitespace change.

## Judgment Calls

- Keeping the `runtime.rs` helpers `pub(super)` and the module private is consistent with the previous `provider` module visibility.
- No `clippy` step and no CI exist; this is pre-existing and out of scope, but a release baseline would benefit from both.

## Exclusions

No dependency-license, MSRV, or supply-chain audit was performed. Non-Windows targets were not built.