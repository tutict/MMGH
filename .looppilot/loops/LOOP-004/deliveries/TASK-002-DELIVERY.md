# TASK-002 Worker Delivery

## Submission

- Task: `TASK-002` - characterize TypeScript Provider strict trusted-host behavior.
- Worker: `frontend-contract-worker`.
- Delivery Status: completed.
- Scope used: only `src/security/provider.test.ts` and this Delivery; no production policy,
  Rust, Ledger, commit, push, dependency, network, credential, or user-file change.

## Delivered Characterization

`src/security/provider.test.ts` adds two deterministic tests using safe fake URL inputs:

1. Strict mode without `trustedHosts` accepts the TypeScript default host
   `https://api.openai.com/v1` as `trusted` / `trustedHost`.
2. Strict mode with the default host allowlist rejects
   `https://api.openai.com./v1` as `blocked` / `untrustedHost` and exposes the trailing-dot
   host `api.openai.com.`. This records the current TypeScript normalization gap against Rust,
   which removes DNS trailing dots.

No real API key, network request, Provider call, or external data was used.

## Observed Evidence

- Focused command: `npm.cmd run test:unit -- src/security/provider.test.ts`
- Result: GREEN for the current characterization suite; process exit code `0`.
- Vitest: `v3.2.4`; one file passed; 8 tests passed.
- The initial parity expectation (trailing-dot URL should be trusted) was run before narrowing
  to the current-behavior characterization and produced the expected RED: 7 passed, 1 failed,
  with `blocked` received instead of `trusted`. The final test intentionally captures the
  observed current decision and passes until implementation changes it.
- `git diff --check`: passed.
- Current diff is limited to the two new tests in `src/security/provider.test.ts`; unrelated
  pre-existing `src-tauri/src/db.rs` changes and untracked user files remain untouched.

## Unverified / Deferred

- Production parity fix and post-fix GREEN expectations belong to TASK-004.
- Rust behavior, cross-layer comparison, reviews, integration, and parent acceptance remain
  outside this Task's authority.
