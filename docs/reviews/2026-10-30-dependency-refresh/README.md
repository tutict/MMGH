# Four-Axis Review — Dependency Refresh

## Identity

- Review ID: `MMGH-REVIEW-DEPS-REFRESH-003`
- Date: 2026-10-30
- Baseline under review: `master` = `origin/master` at `a0b62a2` (Quiet Ledger design system docs).
- Reviewed change set: `a0b62a2..de6c5d2` — commits `47e1395` (frontend within-range refresh),
  `de69089` (MUI 9.5 + globals 17), `7fb9c21` (Rust within-range refresh), `b71c66e` (rig 0.45 +
  rusqlite 0.41), `de6c5d2` (vendored Tauri v1 crate removal).
- Axes: Spec, Standards, Data, Compatibility.
- Reviewer: Qoder primary agent, single review context.

## Why this review exists

The previous upgrade pass (`2026-10-16-frontend-major-dependency-upgrade`) left three deliberate
stop-points and one stale artefact behind:

1. **MUI was pinned to 9.2.** The pin was justified by the note "9.4 breaks jsdom Select selectors"
   (commit `45e79c5`).
2. **ESLint was capped at 9.** `eslint-plugin-react` and `eslint-plugin-jsx-a11y` cap their peer
   range at ESLint 9.
3. **`globals` stayed on 14.** The flat config imports it directly, and the major was never taken.
4. **`src-tauri/vendor/` still held a checkout of `nfd` 0.0.4 and `ntapi` 0.3.7** — 114 tracked files
   of Windows shell-dialog sources that no longer appear in the dependency graph.

This pass asks whether those stop-points still hold, and refreshes the lockfiles onto the newest
releases the declared ranges already allow.

## Review Boundary

Included:

- `package.json`, `package-lock.json` (frontend range and lockfile changes).
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` (Rust range and lockfile changes).
- The removal of `src-tauri/vendor/**`.
- The `CHANGELOG.md` entry that records the refresh.

Excluded:

- The Quiet Ledger redesign itself (`a0b62a2` and earlier) — it shipped with its own contract tests
  (`src/ui/styleContract.test.ts`, `src/theme/themeTokenParity.test.ts`) and its design record
  (`DESIGN.md`), and is out of scope here.
- Live provider calls, real API keys, real user data, installer packaging, macOS/Linux targets.
- `node_modules` and `src-tauri/target/` contents, which are build products, not reviewed sources.

## Verdict Summary

| Axis | Verdict | Findings |
|---|---|---|
| Spec | PASS | 1 Minor (P3) |
| Standards | PASS with findings | 1 Major (P2), 2 Minor (P3) |
| Data | PASS with findings | 2 Minor (P3) |
| Compatibility | PASS with findings | 1 Major (P2), 3 Minor (P3) |

No Blocker. The two P2 findings are environmental rather than behavioural: the ESLint 10 stop-point
still stands, and a stale native rolldown binding in the working tree can break the build until it
is reinstalled.

**The MUI 9.2 pin is lifted.** The recorded reason does not reproduce: the app renders no MUI
`Select` at all, and MUI 9.4.0 and 9.5.0 behave identically under jsdom for `TextField select`,
a standalone `Select`, a native `Select`, and `Autocomplete`. MUI 9.3–9.5 publish no breaking
changes against the API surface this app uses.

## Findings Index

Disposition status is authoritative in `REMEDIATION.md`.

| ID | Axis | Severity | Summary | Status |
|---|---|---|---|---|
| S1 | Spec | P3 | The CHANGELOG's "MUI stays on 9.2" clause was stale after the upgrade | Fixed |
| T1 | Standards | P2 | ESLint 10 is still unreachable — two plugins cap their peer range at ESLint 9 | Documented |
| T2 | Standards | P3 | `globals` jumped two majors (14 → 17) with no intermediate step | Accepted |
| T3 | Standards | P3 | The vendored Tauri v1 crates were tracked in the repository | Fixed |
| D1 | Data | P3 | The npm tree carries a hoisted `yaml` that does not match the lockfile layout | Accepted |
| D2 | Data | P3 | Two rusqlite transitives (`rsqlite-vfs`, `sqlite-wasm-rs`) resolved newer than the reviewed snapshot | Accepted |
| C1 | Compatibility | P2 | A stale native rolldown binding in `node_modules` breaks `vite build` until reinstalled | Fixed |
| C2 | Compatibility | P3 | MUI 9.4/9.5 add an opt-in `theme.focusVisible` the Quiet Ledger focus ring does not use | Accepted |
| C3 | Compatibility | P3 | rig 0.45 and rusqlite 0.41 publish breaking changes outside this app's API surface | Verified |
| C4 | Compatibility | P3 | The Rust lockfile's transitive set shifts under the refresh | Accepted |

## Evidence Observed

Commands run against the committed tree at `de6c5d2`:

- `npm run lint` -> exit 0, zero warnings (`--max-warnings 0`).
- `npm run typecheck` -> exit 0.
- `npm run test:unit` -> **21 files, 95 passed, 3 skipped** (98 total), ~9.1 s.
- `npm run build` -> exit 0, 1009 modules transformed, 18 chunks emitted.
- `npm run test:rust` -> `k6_backend_harness` **43 passed / 1 ignored**; `mygh` **59 passed / 1 ignored**.
- `cargo fmt --check` -> exit 0.
- `cargo build --release` -> exit 0, `mygh.exe` produced (21.5 MB).
- `git grep -E "vendor|nfd|ntapi"` -> no reference to the removed vendored crates outside the
  removed tree itself; `Cargo.lock` never named `nfd` or `ntapi`.
- MUI probe (temporary, removed after the run): `TextField select`, standalone `Select`, native
  `Select`, and `Autocomplete` all render and expose their options under jsdom on **both** MUI
  9.4.0 and MUI 9.5.0.
- `npm view` peer ranges -> `eslint-plugin-react@7.37.5` requires `eslint@… || ^9.7`;
  `eslint-plugin-jsx-a11y@6.10.2` requires `eslint@… || ^9`; `eslint-plugin-react-hooks@7.1.1` and
  `eslint-plugin-react-refresh@0.5.7` both accept `^10`.

## Independence and Limitations

- Single review context: the reviewer is the same agent that authored the reviewed commits.
- No runtime diffing was performed against the pre-refresh build; parity rests on the existing
  suite, the production build, the release build, and a headless render check at 390 px.
- The packaged Tauri installer was not produced; `cargo build --release` produced the binary only.
- macOS/Linux targets and a real provider network path were not exercised.
