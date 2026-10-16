# Four-Axis Review — Rig Runtime Refactor and Dependency Upgrade

## Identity

- Review ID: `MMGH-REVIEW-RIG-DEPS-001`
- Date: 2026-10-16
- Baseline under review: `main` = `master`. Local `9a189af` (merge of EXP-004); remote `origin/master` = `9b1c3ad`.
- Reviewed change set: `e0a4953..9e49778` — commits `45e79c5` (`chore: upgrade frontend dependencies`) and `9e49778` (`feat: adopt Rig for desktop agent completions`).
- Axes: Spec, Standards, Data, Compatibility.
- Reviewer: Codex primary agent, single review context.

## Why this review exists

The EXP-004 four-axis review certified only two files (`src-tauri/src/db.rs`, `src/storage/agent.test.ts`). Treating `main` as the release baseline, the Rig runtime adoption and the dependency upgrade had never been reviewed on any axis. This review closes that gap.

## Review Boundary

Included:

- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/agent/*` (new module tree), deletion of `src-tauri/src/agent/provider.rs` and `src-tauri/src/agent.rs`, `src-tauri/src/db/settings.rs` (keyring API migration), `package.json`, `package-lock.json`.
- Behavioral equivalence of prompt composition, reply validation, error classification, fallback, and skill drafting against the pre-refactor `agent.rs`/`provider.rs`.

Excluded (not reviewed here):

- `a9f2171` UI restyle and `bb656f5` gitignore/test-hygiene changes (adjacent main-only commits, out of the requested scope).
- Live provider calls, real API keys, real user data, installer packaging, macOS/Linux targets.
- The EXP-004 cache fix (separately reviewed).

## Verdict Summary

| Axis | Verdict | Findings |
|---|---|---|
| Spec | PASS | 1 Minor (P3, doc wording) |
| Standards | PASS with findings | 2 Major (P2), 1 Minor (P3) |
| Data | PASS with findings | 1 Major (P2), 3 Minor (P3), 1 unverified residual |
| Compatibility | PASS with findings | 3 Minor (P3) |

No Blocker. The P2 findings are verification-coverage gaps, not observed defects: the reviewed code compiles, formats, lints, type-checks, builds, and passes the existing suites.

## Findings Index

Disposition status is authoritative in `REMEDIATION.md`.

| ID | Axis | Severity | Summary | Status |
|---|---|---|---|---|
| S1 | Spec | P3 | CHANGELOG wording "Removed ... monolithic agent completion loop" is imprecise (refactored, not removed) | Fixed |
| T1 | Standards | P2 | Deleted `provider.rs` tests (`extract_text` string/array content, `completion_endpoint`) were not replaced | Fixed |
| T2 | Standards | P2 | No automated test covers the Rig call path, `run_agent`, or `forge_skill` | Fixed (Rig seam) |
| T3 | Standards | P3 | `src-tauri/Cargo.toml` lost its trailing newline (spurious diff) | Fixed |
| D1 | Data | P2 | Rig call path is untested — release-baseline regression risk (duplicate of T2, recorded on the data axis) | Fixed |
| D2 | Data | P3 | `HTTP_CLIENT` uses `.expect()`, panicking on first use if client construction fails | Fixed |
| D3 | Data | P3 | `rusqlite` 0.30 to 0.40 bundles a newer SQLite (`libsqlite3-sys` 0.38.2); the version delta is undocumented | Fixed |
| D4 | Data | P3 | Lockfile carries a second `reqwest` major (0.12.28) plus Rig vector-store/HF crates absent from the host build graph | Documented |
| C1 | Compatibility | P3 | User-visible `model_detail` text format changed (provider body to Rig error) | Documented |
| C2 | Compatibility | P3 | Multi-part content extraction parity now delegated to Rig — unverified | Verified deviation |
| C3 | Compatibility | P3 | `keyring` 1.2 to 4 changes the failure mode/message when no keyring backend is available | Documented |

## Evidence Observed

Commands actually run against the working tree (the Rig/deps files are committed and clean; see Limitations):

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` -> exit 0.
- `git diff --check` -> exit 0.
- `npm.cmd run lint` -> exit 0, zero warnings (`--max-warnings 0`).
- `npm.cmd run typecheck` -> exit 0.
- `npm.cmd run build` -> exit 0 (Vite production build succeeded).
- `node_modules/.bin/vitest run` -> 19 files, 87 passed, 3 skipped (working tree; committed main is 18 files / 84 passed / 3 skipped).
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` -> `k6_backend_harness` 43 passed / 1 ignored; `mygh` 50 passed / 1 ignored.
- `cargo tree -e normal` -> host graph contains only `reqwest v0.13.5` and `rig`/`rig-core`/`rig-agent`/`rig-derive` v0.42.0 (831 crates); `fastembed`, `hf-hub`, `lance-*`, `candle`, `tokenizers`, `onnx`, and `reqwest 0.12.28` are absent.
- `src-tauri/Cargo.lock` -> `keyring` 4.2.0, `rusqlite` 0.40.2, `libsqlite3-sys` 0.38.2, `reqwest` 0.12.28 and 0.13.5, `rig-core` 0.42.0, `tauri` 2.11.6.

## Independence and Limitations

- Single review context: the reviewer is the same primary agent that authored the reviewed commits. This is a separate review pass, not an independent-author review.
- The Rust side (`src-tauri/`) is committed and clean, so the Rust evidence reflects exactly the reviewed revision.
- The frontend suite was run on the working tree, which also contains unrelated uncommitted UI changes; the dependency resolution (`package.json`/`package-lock.json`) is committed and clean.
- No live provider call was made, so the Rig network path is verified only by compilation and unit tests, not by observed traffic.