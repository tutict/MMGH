# LOOP-005 Data Review

## Verdict

- Review axis: transaction, partial-success, cache consistency, rollback, and retry/idempotency.
- Reviewer: independent Data + Compatibility Review Worker (this report is independent of the Supervisor fallback deliveries).
- Verdict: `PASS`; no blocker, major, or minor Finding.
- Scope: current LOOP-005 integration and the bounded change in `src-tauri/src/db.rs`; no code or ledger changes are made by this review.

## Evidence Reviewed

- `LOOP-CONTRACT.md`, `TASK-LEDGER.md`, `FINDING-LEDGER.md`, the three Task Deliveries, and `integration/INTEGRATION-RECORD.md`.
- `src-tauri/src/db.rs`: `execute_workspace_transaction_in` still opens `TransactionBehavior::Immediate`, runs mutation plus Snapshot projection before `tx.commit()`, and publishes the process-local cache only after commit (lines 1563-1575).
- `snapshot_cache_guard` recovers a poisoned advisory cache mutex, clears poison, and emits a diagnostic (lines 1196-1211). Read/store/clear paths use this guard; SQLite remains the durable authority.
- The injected poison test confirms one committed row and a returned Snapshot rather than an error. It passes in both Rust test binaries in the focused run (1 test each, 43 and 51 filtered out). The pre-commit rollback test also passes in both binaries.
- Independently rerun: `cargo test --manifest-path src-tauri/Cargo.toml committed_transaction_returns_snapshot_when_cache_publish_is_poisoned -- --nocapture --test-threads=1` passed 1 test per binary; `failed_transaction_does_not_publish_snapshot_cache` passed 1 test per binary. Expected panic-hook/recovery diagnostics and existing dead-code/canonical-path warnings were observed.

## Data/Transaction Assessment

- Pre-commit action or projection errors still propagate through the transaction and roll back; no cache publication occurs. This preserves the pre-commit invariant.
- Post-commit cache poison is no longer reclassified as a failed mutation. The returned Snapshot is the one built from the transaction, and the test asserts the durable row count increases exactly once. A client retry is therefore not needed for this selected failure mode.
- The test's temporary in-memory SQLite connection and serialized test lock avoid real user data, credentials, schema, or cross-process state. No idempotency claim is made for unrelated crashes, command retries, or process termination between commit and response.
- Recovering this `Option<WorkspaceSnapshot>` mutex is bounded: the only writes are whole-value assignment/clear and snapshot clone occurs before assignment. The cache is advisory and not a second source of truth. The recovery diagnostic contains no user data or secret.
- Existing Settings/keyring commit-plus-refresh behavior is intentionally untouched and remains outside this Loop.

## Findings and Exclusions

- No Finding is required for the selected contract cluster.
- Worker matrix is accurately represented: the requested Rust/Data Worker supplied read-only observations but could not write its Delivery after repeated service `429 Too Many Requests` and a Windows patch-helper failure; TASK-003 is explicitly marked Supervisor fallback and is not treated as independent review evidence.
- Deferred or excluded risks remain visible and are not silently accepted as solved: cross-tab Web overwrite ambiguity, stale contextual active-session parity, active-reminder nullability mismatch, Settings post-commit refresh status, schema/DTO/keyring/permission changes, and unrelated retry/idempotency guarantees.

## Acceptance

`PASS`: commit/rollback ordering, partial-success classification, cache recovery, and duplicate-retry prevention for the selected injected condition are consistent with the approved Contract. Residual risks are bounded, documented, and outside LOOP-005 scope.
