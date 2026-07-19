# TASK-003 Worker Delivery

## Submission

- Task: `TASK-003` - characterize Rust Provider strict-default and host-normalization behavior.
- Worker: `rust-contract-worker`.
- Delivery Status: submitted for Supervisor review; parent Task status remains owned by the Supervisor.
- Scope used: only the focused test region in `src-tauri/src/db.rs` and this Delivery; `src-tauri/src/db/settings.rs` was inspected but not modified.
- No TypeScript, production policy, SQL, Ledger, user-file, commit, push, network, credential, or real keyring/database change was made.

## Delivered Characterization

`src-tauri/src/db.rs` adds deterministic Provider tests using the existing `TEST_STATE_LOCK` and an extended `EnvGuard`:

1. Strict mode with no explicit `MMGH_TRUSTED_PROVIDER_HOSTS` expects the intended default host `https://api.openai.com/v1` to validate. This currently exposes the Rust parity gap.
2. Strict mode accepts `https://api.openai.com./v1` when the configured allowlist is mixed-case, padded, and includes a trailing dot. This records consistent trailing-dot/lowercase/whitespace normalization across URL and allowlist inputs.

The existing strict allowlist test now uses the same serial lock and environment guard, preventing process-environment leakage during concurrent Rust tests. No implementation policy was changed.

## Observed Evidence

- Initial focused command `cargo test --bin mygh provider_base_url_uses_default_openai_host_when_strict_allowlist_is_unconfigured` produced the expected RED: `0 passed; 1 failed`; error was `provider host 'api.openai.com' is not on MMGH_TRUSTED_PROVIDER_HOSTS`.
- Focused Provider command `cargo test --bin mygh provider_base_url_` produced `5 passed; 1 failed`; the trailing-dot test passed and only the strict-default expectation failed with the same error.
- Exact trailing-dot command `cargo test --bin mygh db::tests::provider_base_url_normalizes_trailing_dot_for_url_and_allowlist -- --exact` produced `1 passed; 0 failed`.
- `cargo fmt --check` passed after rustfmt-compatible test formatting.
- `git diff --check` passed.
- No real keyring, network request, API key, or on-disk database was used; the tests call the in-process URL validator only.

## Unverified / Deferred

- The strict-default test remains RED until the authorized production policy change is implemented by the Integrator/TASK-004 scope.
- Post-fix GREEN, cross-layer comparison, independent review, integration, Ledger updates, commit, push, and parent acceptance remain outside this Worker's authority.
- A first attempted `cargo test ... --lib` was invalid for this binary-only Cargo package (`no library targets found`); the corrected `--bin mygh` commands above are the actual test evidence.
