# EXP-002 Mode Selection

## Decision Boundary

- Selected cluster: Desktop Window Lifecycle Projection.
- Decision timing: before product/test implementation.
- Scale: 0 low, 1 moderate, 2 high.

## Gate Scores

| # | Dimension | Score | Evidence |
|---|---|---:|---|
| 1 | Side-effect coupling | 1 | One initial read and two subscriptions form one native projection stream with two explicit App outputs |
| 2 | Number of state owners | 1 | The hook will own desktop runtime state; App retains visibility and notice as explicit output consumers |
| 3 | Cross-runtime behavior | 1 | Web no-op fallback and Tauri active path differ, but both are directly characterizable |
| 4 | React/Rust contract impact | 0 | Existing command, events, payloads, and Rust source remain unchanged |
| 5 | Number of high-conflict files | 1 | `App.tsx` is high-conflict; other touched files are bounded/new |
| 6 | Multiple Worker usefulness | 0 | Serial implementation is smaller than coordination cost |
| 7 | Data/security impact | 0 | No persistence, Provider, keyring, permission, or secret path |
| 8 | Failure/rollback impact | 1 | Failure degrades status/visibility; rollback is one bounded code commit |
| 9 | Specialized Reviewer need | 0 | Spec and frontend/TypeScript Standards axes cover the boundary |
| 10 | Cross-session recovery need | 0 | Expected to finish in this session; checkpoint experiment is already recorded separately |
| 11 | Scope uncertainty | 1 | Async listener timing requires tests, but inputs/outputs are stable |
| 12 | Expected implementation size | 1 | Four product/test files, no dependency or backend change |

Total: **7/24**, a Lightweight inclination.

## Hard Triggers

- React and Rust contract change: no.
- SQLite, migration, persistence, keyring, Provider, permission, or security change: no.
- Multiple interacting runtime sources changed: no. The browser visibility and clock sources
  are excluded; this change consolidates one existing Tauri consumer stream without changing
  native emitters.
- Multiple useful Workers or high-conflict integration groups: no.
- Data loss, unrecoverable state, specialist review, or cross-session implementation: no.
- Scope cannot fit a short Change Contract: no.

Hard triggers observed: **none**.

## Chosen and Rejected Modes

- Chosen mode: **Lightweight**.
- Rejected mode: Full Loop. Its Ledgers, Worker Deliveries, Finding/Rework tree, Integration
  Record, Closure, and Checkpoint would repeat EXP-001 overhead without a matching data,
  security, cross-contract, multi-Worker, or recovery risk.
- One Supervisor will perform the scoped implementation Worker fallback. No delegation is
  useful for four serial files in one conflict group.
- Independent Reviewer capability is not assumed. If unavailable at the fixed implementation
  commit, the Supervisor will disclose limited self-review and run separate Spec and
  Standards passes. This low-risk boundary may proceed with that limitation.

## Protocol and Artifact Budget

Expected new protocol/experiment files: six total: Resume Validation, Resume Observations,
Runtime/Lifecycle Audit, Mode Selection, Change Contract, and Results. `RESULTS.md` will
contain the scorecard and both review verdicts, avoiding a seventh Review file. No `LOOP-002`
tree, Task/Finding Ledger, Delivery, Integration Record, or full Closure will be created.
The host-native Plan owns execution order; MMGH has no current Lightweight `STATE.md` or
`HANDOFF.md`, and the existing Checklist is a closed EXP-001 projection.

## Fresh Pre-change Baseline

- Tools: Node `v24.12.0`, npm `11.17.0`, rustc/cargo `1.96.0`.
- `git diff --check`, lint, and typecheck: exit 0.
- Frontend: 17 files, 76 passed, 3 skipped; expected mocked-network and corrupt-preview
  stderr remained.
- Web build: exit 0, 1,003 modules.
- Rust: 88 passed, 2 ignored; existing test build emitted 28 dead-code warnings.
- Unified `npm test`: exit 0.
- Desktop debug build: exit 0 in 36.2 seconds; app plus two MSI locales and NSIS produced;
  harness build emitted 67 existing dead-code warnings. Bundles were not installed.
- Package hash: `2C7ACA962E08593A470940A3A57C28FD585A519C80A4FE0B7C61380E50271AF5`.
- Lockfile hash: `60C5E0DD9E7B01C30B1855546617A1455DA3F112C2348960FCBF0D951396BC91`.

## Stop or Escalate

Escalate to Full Loop before continuing if implementation requires a Rust/event contract,
browser visibility/clock integration, storage/security/schema work, a second interacting
cluster, or Review finds a Major/Blocker. Stop on unexplained baseline/regression failure,
unpreserved cleanup, or user-owned file overlap.
