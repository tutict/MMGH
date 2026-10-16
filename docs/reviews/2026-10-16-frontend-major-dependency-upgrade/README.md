# Four-Axis Review — Frontend Major Dependency Upgrade

## Identity

- Review ID: `MMGH-REVIEW-FE-MAJORS-002`
- Date: 2026-10-16
- Baseline under review: `master` = `origin/master` at `b2d9b6f`.
- Reviewed change set: `82f79eb..b2d9b6f` — commits `d44475c` (frontend within-major refresh), `0c8b297` (Rust crates + Rig 0.44), `4ece3cf` (docs), `5c91f2b` (frontend toolchain across majors), `b2d9b6f` (docs).
- Axes: Spec, Standards, Data, Compatibility.
- Reviewer: Codex primary agent, single review context.

## Why this review exists

The previous review (`2026-10-16-rig-runtime-and-dependencies`) explicitly deferred the frontend
major upgrades. Those majors have now landed (React 19, Vite 8, Vitest 5, ESLint 9, Babel 8, jsdom 30),
so this pass asks the narrow question the user raised: **did the upgrade change the code's behaviour,
or only its build/test tooling?**

## Review Boundary

Included:

- `package.json`, `package-lock.json`, `eslint.config.mjs`, the deletion of `.eslintrc.cjs`,
  `vite.config.ts`, and the three source files touched by adaptation
  (`src/components/GalleryWorkspace.tsx`, `src/components/WeatherWorkspace.tsx`, `src/utils/skillHistory.ts`).
- The Rust/Rig slice (`src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/agent/runtime.rs`)
  is in the same change set and is summarised here, but its detailed four-axis treatment is the
  earlier review plus the `REMEDIATION.md` follow-up.

Excluded:

- Live provider calls, real API keys, real user data, installer packaging, macOS/Linux targets.
- The pre-existing tracked audio file under the gitignored `dist/` (recorded as D2, not caused here).

## Verdict Summary

| Axis | Verdict | Findings |
|---|---|---|
| Spec | PASS | 1 Minor (P3, doc wording) |
| Standards | PASS with findings | 1 Major (P2), 3 Minor (P3) |
| Data | PASS with findings | 2 Minor (P3) |
| Compatibility | PASS with findings | 2 Major (P2), 5 Minor (P3) |

No Blocker. The two P2 findings are latent, not observed: the lint gate imports two undeclared
(hoisted) packages, and Vite 8 warns that the config's ESM-in-CommonJS loading will stop working
under a future default. Neither breaks the current tree — lint, typecheck, build, vitest, dev server,
and cargo all pass today.

## Findings Index

Disposition status is authoritative in `REMEDIATION.md`.

| ID | Axis | Severity | Summary | Status |
|---|---|---|---|---|
| S1 | Spec | P3 | Two adjacent CHANGELOG bullets describe the frontend upgrade; accurate but could be merged | Fixed |
| T1 | Standards | P2 | `eslint.config.mjs` imports `globals` and `@eslint/js`, neither declared in `package.json` | Fixed |
| T2 | Standards | P3 | `eslint-plugin-jsx-a11y` is declared but never enabled (pre-existing) | Fixed |
| T3 | Standards | P3 | react-hooks uses the legacy 16-rule `recommended`, not the flat-native `recommended-latest` (17 rules) | Fixed |
| T4 | Standards | P3 | The eslint config's `vite.config.ts` override is dead code under `eslint src` (pre-existing) | Fixed |
| D1 | Data | P3 | Lockfile regenerated from scratch; one extraneous local package (`yaml`) in `node_modules` | Fixed |
| D2 | Data | P3 | Pre-existing tracked file inside the gitignored `dist/` (unrelated to this change set) | Fixed |
| C1 | Compatibility | P2 | Vite 8 warns `vite.config.ts` is ESM loaded as CommonJS; `configLoader: native` will become the default | Fixed |
| C2 | Compatibility | P3 | React 19 `inert` type change — handled, renders `inert=""` | No action |
| C3 | Compatibility | P3 | ESLint 9 `no-unused-vars` `caughtErrors` default change — handled | No action |
| C4 | Compatibility | P3 | Vite 8/rolldown shifted bundle composition; parity verified only by build + tests | Accepted |
| C5 | Compatibility | P3 | React 19 removed-API surface — all absent from the codebase (grep-verified) | Verified |
| C6 | Compatibility | P3 | jsdom 26 to 30 / Vitest 3 to 5 change the test environment | Accepted |
| C7 | Compatibility | P3 | ESLint is capped at 9 (not 10) by plugin peer ranges | Documented |

## Evidence Observed

Commands run against the clean tree at `b2d9b6f`:

- `npm.cmd run lint` -> exit 0, zero warnings; `eslint src` reports **111 files**, 0 errors, 0 warnings.
- `npm.cmd run typecheck` -> exit 0.
- `npm.cmd run build` -> exit 0 (Vite 8 / rolldown), no deprecation warnings.
- `npm.cmd run test:unit` -> 19 files, 87 passed, 3 skipped.
- `npm.cmd run dev` -> HTTP 200 on `http://127.0.0.1:5173`, `#root` present, plus the C1 warning.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` -> `k6_backend_harness` 43 passed / 1 ignored; `mygh` 59 passed / 1 ignored.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` -> exit 0; `git diff --check` -> exit 0.
- `npm.cmd ls` -> clean except `yaml@2.9.1 extraneous`; `package-lock.json` `lockfileVersion` = 3.
- `react-dom/server` render of `inert={true}` -> `<div inert="">` (identical to the pre-upgrade `inert=""`).

## Independence and Limitations

- Single review context: the reviewer is the same primary agent that authored the reviewed commits.
- The Rust side is unchanged by the frontend commits (`git show --stat` confirms no `src-tauri/` paths),
  so the frontend evidence is isolated from the Rust evidence.
- No runtime diffing was performed against a React 18 build; React 19 parity rests on the existing
  suite (87 tests) plus static checks of the removed API surface.
- The desktop `tauri build` and the packaged installer were not exercised in this pass.
