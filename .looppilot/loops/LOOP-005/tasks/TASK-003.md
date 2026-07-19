# TASK-003 Contract

- Type: test/data
- Outcome: reproduce post-commit Snapshot cache publication failure with a temporary SQLite fixture and prove the current command can durably write while returning Err.
- Allowed: focused Rust test region in `src-tauri/src/db.rs`, temporary DB fixtures, Delivery.
- Forbidden: production implementation, SQL schema, keyring, Ledgers, commit/push.
- Required evidence: exact RED command, row-count/durable-state observation, atomicity/idempotency analysis, and reset/cleanup behavior.
- Reviewer: independent readiness plus Data input.
