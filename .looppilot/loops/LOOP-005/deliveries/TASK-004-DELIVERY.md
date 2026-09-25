# TASK-004 Delivery: Cache Publication Contract Implementation

## Ownership and Status

- Contract: `TASK-004`
- Owner: Supervisor acting as the serial Implementation Worker after TASK-002/TASK-003 evidence was integrated.
- Delivery status: `integrated`
- Revision used: 1 of 2.

## Implementation

- Added one `snapshot_cache_guard` helper in `src-tauri/src/db.rs`.
- A poisoned Snapshot cache mutex now recovers the contained optional snapshot, clears the advisory poison flag, and emits a diagnostic.
- Snapshot cache read/store/clear operations use the helper. Their public/internal `Result` signatures remain unchanged to avoid unrelated churn.
- SQLite commit remains the sole durable mutation boundary. Cache publication no longer converts a committed mutation into a rejected result.

## Preserved Contracts

- Pre-commit action or projection errors still roll back through the existing immediate transaction.
- Command names, error strings, DTO fields/nullability, active selection, schema, migrations, Settings journal, keyring, permissions, and Web behavior are unchanged.
- Snapshot cache remains process-local and non-authoritative; no new source of truth is introduced.

## Focused Verification

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: passed; existing canonical-path warning only.
- Selected poison-injection test: passed in both Rust test binaries.
- `failed_transaction_does_not_publish_snapshot_cache`: passed in both Rust test binaries.
- `concurrent_write_commands_wait_instead_of_returning_database_locked`: passed in both Rust test binaries.
- `settings_commit_` filter: four tests passed in each Rust test binary.

Full-suite and cross-runtime results are owned by the Integration Record and Closure evidence.
