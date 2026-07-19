# TASK-004 Contract

- Type: implementation
- Outcome: make Snapshot cache mutex poisoning/publication non-authoritative so a committed mutation returns its built Snapshot; preserve rollback for pre-commit failures.
- Allowed: bounded cache lock/publication code in `src-tauri/src/db.rs` and focused Rust tests; no public DTO/command/schema changes.
- Depends on: approved TASK-002 and TASK-003 Deliveries and RED evidence.
- Required GREEN: injected cache failure/poison test passes; existing transaction rollback and full Rust suite pass.
- Revision budget: 2. Escalate on any schema/keyring/DTO or semantic scope change.
