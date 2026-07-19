# LOOP-005 Integration Record

## Identity and Verdict

- Loop: `LOOP-005`
- Integrator: Codex primary agent
- Date: 2026-07-19
- Integrated Deliveries: TASK-002, TASK-003, TASK-004
- Integration Barrier verdict: `PASS`
- Review Barrier: pending independent verdicts

## Included Work

- Web characterization: a throwing preview `localStorage.setItem` rejects and preserves the previous raw workspace record.
- Rust characterization: a poisoned Snapshot cache after snapshot projection and SQL commit reproduced commit-plus-error behavior before the correction.
- Rust implementation: recover and clear poison for the process-local Snapshot cache so cache publication is not a second commit condition.
- Protocol evidence: Delivery files identify Worker read-only contributions, Supervisor fallbacks, exact limits, and the selected Full Loop boundary.

## Excluded or Unintegrated Work

- No change to Web localStorage algorithm, React handlers, Tauri command names, DTOs, schema/migrations, Settings journal/keyring, active-selection policy, permissions/capabilities, dependencies, UI, release, or deploy behavior.
- Deferred candidates remain deferred: stale contextual active-session parity, `activeReminder` nullability, Settings post-commit refresh status, and cross-tab overwrite after Web write verification.
- Worker file-backed Deliveries were unavailable after repeated service 429s; the fallback test edits are Supervisor-owned and do not count as independent review.
- User-owned `.impeccable/live/config.json` and `PRODUCT.md` remain untracked and excluded from inspection, edits, staging, and commits.

## Contract Comparison

| Boundary | Web preview | Tauri/Rust after integration |
|---|---|---|
| Durable authority | one verified localStorage record | SQLite immediate transaction |
| Success result | complete `WorkspaceSnapshot` after checked write | transaction-built `WorkspaceSnapshot` after commit |
| Pre-commit/write failure | rejects; prior raw record retained for injected throw | transaction rolls back; cache is not published |
| Post-commit cache condition | not applicable | advisory cache poison is recovered; committed snapshot is returned |
| React state | commits fulfilled snapshot only | same TypeScript facade and fulfilled-snapshot path |
| Active selection | unchanged | unchanged |
| Sensitive projection | existing blank `apiKey`/boolean `hasApiKey` | unchanged; Settings/keyring untouched |

## Transaction and Retry Analysis

- Snapshot projection still occurs inside `TransactionBehavior::Immediate`; SQL commit follows the successful action.
- A pre-commit action/projection error exits before commit and remains an error.
- Cache store follows commit but now uses a recovering guard. Poison no longer returns an error that callers could misinterpret as an uncommitted create.
- The selected cache-only condition therefore requires no client retry and creates exactly one row in the injected test.
- This does not claim idempotency for unrelated failures or cross-process crashes.

## Verification

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: passed; canonical-path warning only.
- `git diff --check`: passed; line-ending conversion warnings only.
- Focused Web adapter suite: 18 passed, 1 skipped.
- Focused Rust poison test: passed in both Rust test binaries; expected panic-hook and recovery diagnostics observed.
- Neighbor Rust rollback/concurrency tests: passed in both binaries; Settings commit filter passed 4 tests in each binary.
- `npm.cmd test`: passed lint, typecheck, 18 frontend files with 84 passed/3 skipped, Vite build with 1004 modules, and Rust with 43+51 passed/2 ignored.
- Existing frontend stderr for injected network fallback/invalid JSON and Rust dead-code warnings are expected and unchanged in class.
- Baseline desktop debug packaging built Web/Rust but first failed at WiX `light.exe`. The final rerun passed and produced the debug exe, two MSI locales, and NSIS; no installer was run or committed.

## Conflicts and Risk

- Mechanical conflicts: none.
- Semantic conflicts: none within selected scope.
- Public API/DTO/schema/dependency diff: none.
- Residual risk: poison recovery preserves the mutex contents because cache data is advisory; a future invariant requiring cache invalidation on arbitrary panic would need a separate contract.
- Required independent Reviews: Spec, Standards, Data, Compatibility. Security is N/A because sensitive projection and keyring behavior did not change.
