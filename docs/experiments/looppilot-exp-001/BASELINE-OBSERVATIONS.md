# EXP-001 Baseline Observations

Captured: 2026-07-18, before product-code modification.

## Repository and Environment

- Repository root: `C:/Users/tutic/IdeaProjects/MMGH`
- Branch at inspection: `master`; experiment branch then created as
  `experiment/looppilot-mmgh-exp-001`.
- HEAD: `e0a4953e0dfd69b7f21e3be7c190a11c95def43f`
- Origin/master relationship: observed synchronized by `git branch -vv`.
- Node: `v24.12.0`; npm: `11.17.0`.
- rustc: `1.96.0 (ac68faa20 2026-05-25)`; cargo: `1.96.0`.
- Existing lockfile and `node_modules` were present; no install or dependency upgrade ran.
- `package-lock.json` SHA-256:
  `60C5E0DD9E7B01C30B1855546617A1455DA3F112C2348960FCBF0D951396BC91`.
- `package.json` SHA-256:
  `2C7ACA962E08593A470940A3A57C28FD585A519C80A4FE0B7C61380E50271AF5`.
- Token usage: unavailable.

## Git Worktree Classification

Before experiment artifacts, tracked files were unchanged. Pre-existing unrelated untracked
items were:

- `.impeccable/live/config.json`
- `PRODUCT.md`

They are user-owned, excluded, and must remain unstaged. Existing ignored `node_modules`,
`dist`, `src-tauri/target`, and `.smoke-install` are not experiment inputs.

## Pre-change Validation

| Command | Exit | Wall duration | Observed evidence |
|---|---:|---:|---|
| `npm run lint` | 0 | 5.142 s | ESLint passed |
| `npm run typecheck` | 0 | 1.081 s | TypeScript no-emit check passed |
| `npm run test:unit` | 0 | 8.989 s | 16 files; 71 passed, 3 skipped (74 total) |
| `npm run build` | 0 | 2.852 s | Vite 7.3.2; 1,002 modules; build passed |
| `npm run test:rust` | 0 | 49.541 s | k6 40 passed/1 ignored; main 48 passed/1 ignored |
| `npm test` | 0 | 21.210 s | unified frontend + Rust chain passed |
| `npm run build:desktop:debug` | 0 | 46.867 s | `target/debug/mygh.exe`; MSI and NSIS bundles produced |

Observed non-failures: mocked skill generation logged its expected network-down fallback;
the corrupt preview-workspace test logged its expected backup warning. Rust emitted existing
dead-code warnings (28 during test harness, 67 during desktop harness build). The desktop
artifacts are ignored and are not authorized release/install evidence.

## Architecture Measurements

- `src`: 157 files; 16 frontend test files observed.
- Rust/schema audit set: 17 files; Rust also has extensive inline tests.
- `src/App.tsx`: 5,855 lines; 23 import declarations; approximately 120 imported bindings.
- Hook occurrences: 51 `useState`, 35 `useEffect`, 29 `useCallback`, 36 `useMemo`.
- Ten lazy workspace/dialog modules.
- Directly imported storage operations: 20, covering bootstrap plus Session, Knowledge,
  Reminder, Skill, Settings, Agent run, and Skill forge.
- Direct App responsibility areas observed: core five business domains, Today derivation,
  Provider settings, desktop lifecycle, mobile/desktop composition, Weather, Music, Gallery,
  local caches, global busy/error/notice, reminder timer/audio, and snapshot reconciliation.
- Snapshot equality/reconciliation: lines 319–626, with two application call sites.
- App history: 13 commits touched `App.tsx`; both latest workspace-redesign commits did.
- App tests: one default integration test; two profile-only render tests skipped by default.
- `src/storage/agent.ts`: 2,294 lines; contains preview model and Tauri dispatch facade.
- `src-tauri/src/db.rs`: 3,566 lines plus existing `db/*` submodules and inline tests.
- GitHub Actions: none observed.

Counts are lexical measurements, not claims that every occurrence is problematic.

## Current Quality Limitations and Uncertainties

- No focused unit contract for snapshot semantic equality/structural sharing.
- No observed generated cross-language TS/Rust IPC contract test.
- No automated CI workflow or end-user installer smoke in this checkout.
- Default App suite has limited full-shell characterization; profile tests require an opt-in
  environment variable and were not part of baseline.
- No performance/load/user-experience measurement; structural sharing value is inferred as
  identity stability and review isolation, not measured speed.
- Windows debug bundle creation passed; installation/launch, release build, macOS/Linux,
  production migration/recovery, and real user acceptance remain unverified.
