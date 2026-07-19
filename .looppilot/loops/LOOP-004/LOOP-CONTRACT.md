# Loop Contract: Provider Security Contract Alignment

## Identity

- Loop ID: `LOOP-004`
- Contract Status: approved
- Parent Project: `MMGH-REFACTOR-EXP-003`
- Loop status source: `.looppilot/LOOP-MAP.md`
- Supervisor/Integrator: Codex primary agent
- Created: 2026-07-19

## Objective and Outcome

Align TypeScript and Rust Provider strict trusted-host decisions for the same URL while
preserving all existing safe/unsafe behavior, API-key handling, storage formats, and runtime
permissions. The user outcome is that Web preview and Tauri do not disagree merely because
the default allowlist or DNS spelling differs.

## Included Scope

- `src/security/provider.ts` and its focused tests.
- `src-tauri/src/db/settings.rs` and focused Rust tests in `src-tauri/src/db.rs`.
- A small cross-layer parity fixture/command only if it does not add production runtime code.
- Deliveries, Integration Record, Spec/Standards/Security/Compatibility reviews, active-loop
  recovery rehearsal, Closure, Checkpoint, and EXP-003 result artifacts.

## Excluded Scope

- API-key/keyring lifecycle, logs/error body content, Provider requests, redirect behavior,
  timeout changes, storage adapters, SQLite/SQL/schema/migration, DTO/command names,
  Tauri capabilities, UI, dependencies, real network/credentials/data, release/deploy,
  master/PR/tag, and user-owned untracked files.

## Grouping Rationale

The two discrepancies are one security policy invariant: canonical host evaluation plus its
default trusted set. Splitting TS and Rust fixes would allow each side to pass in isolation
while the cross-runtime contract remained inconsistent. Storage and migration are separate
acceptance boundaries and remain excluded.

## Current Evidence and Invariants

- TS defaults to `api.openai.com`; Rust default is empty when the environment is unset.
- Rust removes DNS trailing dots; TS does not. Both otherwise align on core URL rules by
  source and current tests.
- Remote HTTP remains blocked; local/private HTTP remains allowed; userinfo/query/fragment
  remain blocked; allowlist matching remains exact/subdomain suffix.
- Client snapshots contain `apiKey: ""`; SQLite never receives plaintext API keys.
- Rust settings commit remains staged/journaled/transactional; no change to that code path.

## Task DAG and Workers

| Task | Outcome | Depends | Owner |
|---|---|---|---|
| TASK-001 | Audit, Selection, Contract Barrier | none | Supervisor |
| TASK-002 | TypeScript characterization and Delivery | TASK-001 | Frontend Contract Worker |
| TASK-003 | Rust characterization and Delivery | TASK-001 | Rust Contract Worker |
| TASK-004 | Cross-layer implementation and Delivery | TASK-002/003 | Implementation Worker |
| TASK-005 | Integrate parity, reviews, recovery, and rework | TASK-004 | Integrator/Specialists |
| TASK-006 | Full validation, Closure, Checkpoint, report | TASK-005 | Supervisor/Integrator |

Workers use non-overlapping files; TASK-004 is serial after both characterizations. Workers
cannot edit Ledgers, commit, push, alter Scope, or claim parent completion.

## Reviewer Matrix

- Mandatory: independent Spec Reviewer and Standards Reviewer.
- Required conditional: Security Reviewer for URL/trusted-host policy.
- Required conditional: Compatibility Reviewer for TypeScript/Rust/Web/Tauri parity.
- Data Reviewer: not applicable; SQL/schema/persistence are excluded and unchanged.
- If independent Security or Compatibility context is unavailable, Review Barrier is blocked;
  Supervisor must stop or explicitly narrow to audit-only rather than fabricate independence.

## Integration Strategy

- Integrate TS and Rust characterizations first, then one implementation boundary per side.
- Compare field names, host normalization, default list, environment switches, status/error
  outcomes, and unchanged API-key/data contracts in `INTEGRATION-RECORD.md`.
- Mechanical conflicts are Integrator-owned; semantic/security conflicts require Supervisor
  and Reviewer decision. No last-writer-wins.

## Acceptance

### Functional

- Same strict default host is accepted by both runtimes.
- Same trailing-dot hostname decision is accepted by both runtimes.
- Existing local/public HTTP, userinfo, query/fragment, allowlist, and key snapshot tests
  remain passing.

### Engineering

- No second state source, cross-language runtime, dependency, suppression, schema change,
  capability expansion, or unbounded abstraction.
- Pure deterministic policy functions remain independently testable.
- Security invariant and compatibility evidence are explicit and reviewed.

### Delivery

- Deliveries, Integration Record, dual-axis reviews, Security/Compatibility reviews, Finding
  Ledger/Rework if needed, active-loop recovery rehearsal, Closure, Checkpoint, full tests,
  commit and authorized branch push are complete.

## Barriers and Budgets

- Contract Barrier: passed by Supervisor on 2026-07-19 after audit/selection review.
- Implementation Barrier: requires both characterization Deliveries and no scope drift.
- Integration Barrier: requires parity comparison and combined tests.
- Review Barrier: requires Spec + Standards + Security + Compatibility pass.
- Closure Barrier: requires Functional + Engineering + Delivery acceptance, no open Blocker.
- Revision budget: 2. Context budget: host token count unavailable; use qualitative pressure.
- Maximum active Workers: 2 non-overlapping characterization Workers, then 1 implementation.

## Authority and Stop Conditions

- Read/modify/commit/push only within the current EXP-003 branch and this Contract scope.
- Stop on real secret/data access, unsafe test request, unexplained baseline/regression failure,
  scope expansion, unavailable required Reviewer, two failed revisions, or user-file overlap.
- Rollback: revert only the two policy changes/tests on this experiment branch; no destructive
  Git operation is permitted.
