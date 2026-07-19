# EXP-004 Observations

## Recovery and Baseline

- Observed starting boundary: `experiment/looppilot-mmgh-exp-003` at `90177dad76d84dac5386bbd6e010e0c4a732aef4`; local and remote matched after a bounded read-only fetch retry.
- Observed Resume Validation: `MMGH-EXP-004-RESUME-001`, decision `validated-with-corrections`.
- Observed user files preserved and excluded: `.impeccable/live/config.json` and `PRODUCT.md`.
- Fresh baseline: Node `v24.12.0`, npm `11.17.0`, rustc/cargo `1.96.0`; package and lock hashes `2C7ACA962E08593A470940A3A57C28FD585A519C80A4FE0B7C61380E50271AF5` and `60C5E0DD9E7B01C30B1855546617A1455DA3F112C2348960FCBF0D951396BC91`.
- Baseline observed: lint/typecheck, 84 frontend passed/3 skipped, 1004-module Web build, Rust 42+50 passed/2 ignored, and unified `npm.cmd test` passed. The first desktop debug packaging attempt reached executable build but failed at WiX `light.exe` MSI bundling.

## Audit and Selection

- Storage domains audited: Session, Knowledge Note, Reminder, Skill, Settings/Provider projection.
- Web adapter uses one runtime gate, localStorage CAS/write/verify, and returns a complete Snapshot after successful write; React commits fulfilled results and preserves state on rejection.
- Tauri adapter calls Rust commands returning `WorkspaceSnapshot`; Rust uses an immediate SQLite transaction, projects before commit, commits, then publishes a process-local cache.
- Real gap: cache publication could return `Err` after durable SQL commit, creating duplicate-retry risk for create-like operations. Candidate stale active-session parity, active-reminder nullability, Settings refresh status, and cross-tab ambiguity were mapped but excluded.
- Full Loop selected at 21/28 because partial success, transaction ordering, Data/Compatibility review, multiple Worker value, and recovery requirements were hard triggers. Lightweight was rejected as too small for the commit-plus-error boundary.

## Workers, Reviews, and Integration

- Frontend and Rust/Data Workers supplied read-only audits but both exceeded service retry limits with `429 Too Many Requests` and Windows patch-helper failures before producing file-backed Deliveries. Supervisor fallback files explicitly record this and do not claim Worker Delivery.
- Supervisor characterization and implementation stayed within the approved test/code regions. Rust RED observed a committed row plus `Err`; GREEN returned one authoritative Snapshot and one row.
- Independent Spec, Standards, Data, and Compatibility reviews all PASS. Data and Compatibility independently reran focused Web/Rust tests. No Finding or Rework was required.
- Integration found no mechanical or semantic conflict within scope; DTO, command, selection, secret, schema, settings journal, and keyring behavior stayed unchanged.

## Final Validation and Cost

- Final `npm.cmd test`: exit 0; 18 frontend files, 84 passed/3 skipped; Vite 1004 modules; Rust 43+51 passed/2 ignored. Main chain wall time observed: 23.7 seconds.
- Final `npm.cmd run build:desktop:debug`: exit 0; debug exe, two MSI locales, and NSIS bundle produced. Wall time observed: 38.6 seconds. No installer was run.
- Expected stderr remained limited to mocked model-network fallback, corrupt preview JSON backup, Rust dead-code/canonical-path warnings, and the injected poison diagnostic.
- `git diff --check` and `cargo fmt --check` passed. Scoped secret-like literal scan found no matches; generated `dist`/`target`/installer outputs were not staged.
- First authorized push at `c5a2fd7b1c8593891aa1d62584ce954235dfa819` succeeded and local/remote ahead/behind returned `0 0`. No master, merge, PR, tag, release, deployment, or force push occurred.
- Unmeasured: token usage, strict same-task A/B, total protocol time, long-term consistency benefit, general host compatibility, and automatic mode-selection accuracy.
- Unverified: real databases/credentials/provider/network, production scale, multi-process writes, crash recovery, cross-tab writes, installer execution, macOS/Linux, release/deployment, and user acceptance.
