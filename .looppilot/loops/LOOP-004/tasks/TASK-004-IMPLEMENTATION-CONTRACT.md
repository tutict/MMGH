# Task Contract TASK-004 Implementation Addendum

- `task_id`: TASK-004
- `parent_goal`: MMGH-REFACTOR-EXP-003
- `status`: assigned
- `previous_status`: proposed
- `status_changed_by`: Supervisor
- `assigned_role`: Implementation Worker
- `assigned_to`: independent serial cross-layer implementation context
- `objective`: make the smallest approved policy alignment after characterization review.
- `scope.allowed`: `src/security/provider.ts`, `src/security/provider.test.ts`,
  `src-tauri/src/db/settings.rs`, and the focused Rust test region in `src-tauri/src/db.rs`.
- `scope.forbidden`: all storage adapters, keyring/journal, SQL/schema/migrations, DTO/commands,
  Provider requests, redirects, timeouts, capabilities, dependencies, docs outside Delivery,
  Ledgers, commits, pushes, user files, real network/credentials/data.
- `required_behavior`: TS removes one trailing DNS dot before allowlist matching; Rust uses
  `api.openai.com` as the default allowlist only when strict mode has no configured hosts.
- `deliverables`: implementation Delivery, focused GREEN commands, diff/check evidence, and
  explicit skipped/unverified checks.
- `success_criteria`: both RED cases become GREEN; existing provider/security/Rust suites pass;
  no unrelated diff or policy broadening.
- `dependencies`: approved TASK-002/TASK-003 Deliveries and independent characterization review.
- `reviewer`: Standards Reviewer, Security Reviewer, Compatibility Reviewer.
- `integration_owner`: Codex primary agent
- `revision_count`: 0
- `revision_budget`: 2
- `authority`: read=true, modify=true, delete=false, commit=false, push=false, release=false, deploy=false, external_communication=false
- `created`: 2026-07-19
- `updated`: 2026-07-19
