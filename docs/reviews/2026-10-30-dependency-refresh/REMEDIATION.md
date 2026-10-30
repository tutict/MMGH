# Remediation — Dependency Refresh

Review ID: `MMGH-REVIEW-DEPS-REFRESH-003` — see `README.md` for the finding index.

## Disposition Summary

| ID | Severity | Disposition | Evidence |
|---|---|---|---|
| S1 | P3 | Fixed | `CHANGELOG.md` clause rewritten in `a0b62a2..de6c5d2` |
| T1 | P2 | Documented | Peer ranges verified against the registry; stop-point stated in `CHANGELOG.md` |
| T2 | P3 | Accepted | `globals` is a data-only catalogue with no peer constraint |
| T3 | P3 | Fixed | `de6c5d2` removes 114 tracked files / 30,010 lines |
| D1 | P3 | Accepted | Pre-existing local `node_modules` layout, absent from the repository |
| D2 | P3 | Accepted | Both crates are outside the active build graph (`cargo tree -i` empty) |
| C1 | P2 | Fixed | Dev server stopped; binding reinstalled; `vite build` green |
| C2 | P3 | Accepted | `theme.focusVisible` deliberately left disabled |
| C3 | P3 | Verified | Rust source byte-identical; 43 + 59 tests pass |
| C4 | P3 | Accepted | Release build green; parity rests on build and test evidence |

No finding requires a code change. Two required a repository change (`S1` in `CHANGELOG.md`, `T3` in
the tree), and one required a working-tree repair (`C1`).

## Fixed

### S1 — CHANGELOG clause

The `Unreleased / Changed` bullet that read

> MUI stays on 9.2 because 9.4 breaks jsdom Select selectors, and ESLint stops at 9 because …

now records the upgrade to MUI 9.5 and states the reproducible finding behind it: the app renders
no MUI `Select`, and the `TextField select` / standalone `Select` / native `Select` /
`Autocomplete` shapes behave identically under jsdom on 9.4.0 and 9.5.0. The ESLint half of the
sentence is unchanged, because it is still true.

### T3 — Vendored Tauri v1 crates

`src-tauri/vendor/` (114 files, 30,010 lines) is removed in `de6c5d2`. Verified before removal:
neither `nfd` nor `ntapi` appears in `Cargo.toml` or `Cargo.lock`; there is no `.cargo/config.toml`
at the repository root or under `src-tauri/`; no file under `src-tauri/src/` names either crate.

### C1 — Stale native rolldown binding

The MMGH dev server left running from the earlier visual pass held
`node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node`, so npm
could update the package metadata but not replace the 1.2.14 binary, leaving 1.2.16 JavaScript in
front of a stale native module and breaking `vite build` with
`bindingChunk.getCodeIdentity is not a function`.

Resolved by stopping the dev server (PIDs 32096 / 26560, the `npm run dev -- --port 5199` pair)
and reinstalling the binding. `npm run build` is green, and `package.json` / `package-lock.json` are
unchanged by the repair — the reinstall used `--no-save`.

## Documented

### T1 — ESLint stays at 9

`eslint-plugin-react@7.37.5` requires `eslint@… || ^9.7` and `eslint-plugin-jsx-a11y@6.10.2`
requires `eslint@… || ^9`. ESLint 10.13.0 therefore cannot be installed without dropping one of
the two rule sets the lint gate depends on. The project stays on ESLint 9.39.5, and the stop-point
is stated in `CHANGELOG.md` so it is not rediscovered as a missed upgrade.

Re-check when either plugin publishes a release whose peer range includes `^10`.

## Accepted

- **T2 (`globals` 14 → 17).** No peer constraints; the flat config uses `globals.browser` and
  `globals.node` only. `@eslint/eslintrc` keeps its own nested `globals@14.0.0`.
- **D1 (`npm ls` reports `invalid: yaml@1.10.3`).** A local `node_modules` layout difference,
  pre-existing and absent from the repository; a clean `npm ci` produces the lockfile's layout.
- **D2 (`rsqlite-vfs`, `sqlite-wasm-rs`).** Recorded in the lockfile but outside the active build
  graph.
- **C2 (`theme.focusVisible`).** Left disabled so the Quiet Ledger `--q-focus` ring stays the only
  focus indicator.
- **C3 (rig / rusqlite breaking changes).** None reach this app's API surface; verified by an
  unchanged Rust source tree and a green suite.
- **C4 (Rust transitive shift).** The release build is green; parity rests on build and test
  evidence rather than a binary diff.

## Follow-up Watch Items

1. **ESLint 10** — revisit when `eslint-plugin-react` or `eslint-plugin-jsx-a11y` widens its peer
   range. The config is already flat (`js.configs.recommended.rules`,
   `react.configs.recommended.rules`, `reactHooks.configs["recommended-latest"].rules`,
   `jsxA11y.flatConfigs.recommended.rules`), so the migration itself is mechanical — but ESLint 10
   removes and reworks rules, so the rule set has to be re-validated rather than assumed.
2. **`theme.focusVisible`** — if MUI's focus ring is ever enabled, the Quiet Ledger ring in
   `src/ui/base.css` has to be re-checked so the two do not stack.
3. **Lockfile refreshes under a running dev server** — stop the dev server before `npm update`, or
   the native binding will silently go stale (C1).
