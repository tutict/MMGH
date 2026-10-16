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

Observed: `cargo test --manifest-path src-tauri/Cargo.toml agent::runtime` -> 6 passed; full suite -> `k6_backend_harness` 43 passed / 1 ignored, `mygh` 54 passed / 1 ignored.

Still not covered: `agent::run_agent` and `agent::forge_skill` orchestration (they require a live SQLite workspace), and the live provider network path. The Rig seam itself is now covered.

### C2 — Multi-part content parity (confirmed deviation)

The removed homemade client joined `content` parts with `"\n"`; Rig concatenates them with no separator. The stub test returns `[{"type":"text","text":"first"},{"type":"text","text":"second"}]` and Rig yields `"firstsecond"` (previously `"first\nsecond"`). Array-of-parts content is uncommon for chat completions, so this is accepted and pinned rather than worked around (the separator is lost inside Rig and cannot be reconstructed downstream).

### D4 — Lockfile extras

`src-tauri/Cargo.lock` still lists `reqwest 0.12.28` (via `hf-hub` / `lance-namespace-reqwest-client`, pulled by `fastembed`) and Rig vector-store crates (`rig-milvus`, `rig-helixdb`). These are optional dependencies of Rig; `Cargo.lock` is feature-independent, so they cannot be pruned without removing the dependency that declares them. `cargo tree -e normal` shows they are absent from the host build graph. Left as-is; recorded here so SBOM/audit noise is a known, accepted condition.

## Remaining Unverified

- Whether a Rig error string can carry the API key into the persisted `model_detail`. No code path places the key into an error and the validated `base_url` carries no credentials, but this was not exercised against a live failing provider.

## Verification Observed After Remediation

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` -> exit 0.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` -> 43 + 54 passed, 2 ignored.
- `git diff --check` -> exit 0.