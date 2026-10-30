# Compatibility Review — Dependency Refresh

## Verdict

`PASS with findings`. One Major (P2), three Minor (P3). No Blocker.

## Review Boundary and Sources

- Reviewer role: Compatibility axis (runtime behaviour, build output, test environment, toolchain
  forward-compatibility); no implementation or Git change was made by this review.
- Sources: `src/**`, `src-tauri/src/**`, `package.json`, `src-tauri/Cargo.toml`, the reviewed diff
  `a0b62a2..de6c5d2`, the upstream MUI / rig / rusqlite release notes, and the observed
  build/test runs.
- Reviewed revision: `master` at `de6c5d2`.

## Compatibility Assessment

- **MUI 9.2 → 9.5.** The release notes for 9.3.0, 9.4.0 and 9.5.0 list **no breaking changes**
  against the API surface this app uses. The app imports `Chip`, `Switch`, `Checkbox`, `ButtonBase`,
  `IconButton`, `MenuItem`, `Modal`, `Slider`, `TextField`, `Button`, plus `CssBaseline`,
  `StyledEngineProvider`, `ThemeProvider` and `createTheme`. `createTheme({ cssVariables: true,
  cssVarPrefix: "mui", nativeColor: true })` and the `StyledEngineProvider injectFirst` wrapper are
  unchanged in 9.5, so `src/theme/AppThemeProvider.tsx` needed no adaptation, and the
  `src/theme/themeTokenParity.test.ts` guard that pins the MUI palette to the OKLCH tokens still
  passes. The `styleContract.test.ts` scan of every static class name against `src/ui/**/*.css`
  also still passes, so no MUI-injected class name drifted out of the contract.
- **The recorded MUI 9.2 blocker does not reproduce.** The pin was justified by "9.4 breaks jsdom
  Select selectors" (commit `45e79c5`). Two independent checks clear it:
  1. The app renders **no** MUI `Select`. `grep -rn "@mui/material" src/` returns thirteen import
     sites and none of them is `Select`; no test asserts on the `listbox` or `option` roles.
  2. A temporary probe (written, run, and removed — it is not in the tree) rendered
     `TextField select`, a standalone `Select`, a native `Select`, and `Autocomplete` under jsdom
     on **both** MUI 9.4.0 and MUI 9.5.0. All four shapes opened and exposed their options
     identically on both versions. The pin was never load-bearing for this codebase.
- **`globals` 14 → 17.** A data-only environment catalogue with no peer dependencies;
  `eslint.config.mjs` uses it only through `globals.browser` / `globals.node`. ESLint 9's own
  `@eslint/eslintrc` still requires `globals@^14`, so npm nests a 14.0.0 copy under it rather than
  forcing the whole tree onto 17.
- **rig 0.44 → 0.45.** The release is dominated by breaking changes in the coding-agent harness,
  the JSON/pipe front end, the ECS memory work, and the run-resumption model — none of which this
  app uses. The app's entire rig surface is `rig::completion::Message`,
  `rig::providers::openai`, `rig::AgentBuilder` and `rig::http_client::ReqwestClient::from` in
  `src-tauri/src/agent/runtime.rs`, and none of those signatures changed. The file compiles
  unchanged (`git diff a0b62a2..de6c5d2 -- src-tauri/src` is empty) and the loopback-provider tests
  that assert the wire format still pass.
- **rusqlite 0.40 → 0.41.** The breaking change is that `Statement::column_names`, `columns` and
  `columns_with_metadata` now return iterators instead of collections. The database layer reads
  rows through `Row::get` and never calls those helpers — `grep -rn "column_names\|columns("
  src-tauri/src/` returns nothing — so no source change is needed. The bundled SQLite moves to
  3.54.0, with the minimum supported SQLite raised to 3.45.3; both bounds are satisfied by the
  bundled build.
- **Rust transitive refresh.** ~180 crates move within their existing semver ranges; `png` drops
  out because `ico` moved to 0.6 and no longer pulls it in.

## Findings

### C1 (P2) — A stale native rolldown binding in `node_modules` breaks `vite build`

The refresh moves `rolldown` 1.2.14 → 1.2.16 and `@rolldown/binding-win32-x64-msvc` 1.2.14 →
1.2.16. The native binding is a `.node` binary that npm replaces in place, so a running process
that has it mapped makes the replacement fail with `EBUSY`. In this review the dev server left
running from the earlier visual pass held the file; npm updated the package metadata but could not
replace the binary, leaving a 1.2.16 JavaScript wrapper in front of a 1.2.14 `.node`.

The symptom is a build failure that looks like a source error but is not:

```
error during build:
Build failed with 1 error:
[plugin vite:build-html]
TypeError: bindingChunk.getCodeIdentity is not a function
```

The fix is to stop the process holding the file and reinstall the binding
(`rm -rf node_modules/@rolldown/binding-win32-x64-msvc && npm install
@rolldown/binding-win32-x64-msvc@1.2.16 --no-save`). This is a **local working-tree condition, not
a repository defect** — a clean `npm ci` installs the matching binary — but it costs a build cycle
every time the lockfile moves under a running dev server, so it is worth knowing about.

### C2 (P3) — MUI 9.4 adds an opt-in `theme.focusVisible` the Quiet Ledger focus ring does not use

MUI 9.4.0 introduces a `theme.focusVisible` option that renders a consistent keyboard focus ring
across components. `DESIGN.md` specifies the Quiet Ledger focus ring as a 2 px accent ring with a
2 px offset, driven by the `--q-focus` token in `src/ui/base.css` rather than by a MUI theme key.
The two can coexist — the custom ring is applied in CSS and the MUI option is opt-in — but if the
MUI ring is ever enabled it will draw a second ring on top of the token-driven one. Left disabled
deliberately; recorded so a future reader does not wire it up by accident.

### C3 (P3) — rig 0.45 and rusqlite 0.41 publish breaking changes outside this app's API surface

Both upgrades land real breaking changes (rig's harness/JSON/memory rework; rusqlite's iterator
returns). None of them reach the code: the rig surface is four items in one file, and the rusqlite
surface is `Row::get`. This was verified by compilation rather than by reading the changelogs
alone — the Rust source is byte-identical before and after, and 43 + 59 tests pass. The residual
risk is upstream behaviour changes that do not alter a signature, which the loopback provider stub
and the database suite cover only partially.

### C4 (P3) — The Rust lockfile's transitive set shifts under the refresh

The within-range refresh moves ~180 transitive crates, and five crates enter while five leave
(`httpdate`, `rig-harness-protocol`, `rig-memory`, `serde_path_to_error`, `utf_types` in;
`alloc-no-stdlib`, `alloc-stdlib`, `brotli`, `brotli-decompressor`, `png` out). The release build
succeeds and the runtime tests pass, but the shipped binary's composition has changed. As with the
earlier Vite 8 finding, functional parity rests on the build and test evidence rather than on a
binary diff.

## Exclusions

- The packaged Tauri installer (`npm run build:desktop`) was not produced; `cargo build --release`
  produced the binary only.
- macOS/Linux targets and a real provider network path were not exercised.
- The Windows-only `aws-lc-sys` build step failed on the first `cargo build --release` attempt in
  this review (the crate's own build script reported `NASM command not found` and then an MSVC
  `cl.exe` exit code 2 while compiling `des.c`). A follow-up `cargo build --release -p aws-lc-sys`
  finished cleanly in 22 s and the full release build then produced `mygh.exe`, so the failure was
  transient rather than a missing-toolchain regression — NASM's absence is only a warning for this
  crate. Recorded because the same first-attempt failure is easy to misread as a dependency
  problem.
