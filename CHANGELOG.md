# Changelog

All notable changes to this project will be documented in this file.

The format follows a lightweight `Keep a Changelog` style:

- `Added` for new features
- `Changed` for behavior, UX, or architecture updates
- `Fixed` for bug fixes
- `Docs` for release, packaging, or operator documentation changes

## [Unreleased]

### Added

- Adopted the `Rig` Rust agent framework as the desktop runtime for `run_agent` and `forge_skill`, using OpenAI-compatible Chat Completions.
- Added `PRODUCT.md` (the product contract: users, purpose, information architecture) and `DESIGN.md` (the Quiet Ledger token, layout and component record).
- Added `src/ui/styleContract.test.ts`, which requires every structural class name used in a TSX file to have a rule in `src/ui/**`, requires dynamic class templates to match a class family, and bans gradients, backdrop filters, raw colours, undefined `--q-*` tokens, the deleted decorative classes, and a stylesheet above 5,200 non-blank lines.
- Added `src/theme/themeTokenParity.test.ts` (the MUI palette must equal the token layer), `src/i18n/localeCoverage.test.ts` (both locales carry the same keys and every referenced key exists), `src/state/useReminderAlerts.test.ts`, `src/components/mobile/MobileSheet.test.tsx`, `src/App.settingsHydration.test.tsx` and `src/components/TodayWorkspace.test.tsx`.
- Added a Ragas capability assessment under `eval/ragas/`. `src-tauri/src/bin/ragas_eval_harness.rs` drives the production prompt-assembly path over `eval/ragas/dataset.json` and writes one sample per case; `eval/ragas/evaluate.py` scores the samples with the Ragas offline metrics plus project metrics and gates them against the committed `eval/ragas/baseline.json`. The harness injects an explicit provider configuration, so an evaluation run never reads the system keyring.
- Added `.github/workflows/ragas-ci.yml`, the repository's first CI workflow. The offline job always runs and needs no credentials; an optional live job runs the same dataset against a configured provider and adds the LLM-judged answer metrics when `MMGH_EVAL_API_KEY`, `MMGH_EVAL_BASE_URL` and `MMGH_EVAL_MODEL` are configured as repository secrets.

### Changed

- Refined both shells of the Quiet Ledger UI on one shared grammar without touching the information architecture, copy, or behaviour. Rows now use a 0.875rem/600 title and a single 0.75rem meta line; lists sit on the page with hairline separators instead of nested cards; selection is always `--q-selected` plus 600 weight (the mobile dock keeps accent text); and each screen carries at most one solid accent button. Metadata bottoms out at 0.75rem, the desktop page title is 1.5rem and the mobile page title 1.125rem, and sliders and switches are neutral.
- Re-laid the mobile Today, reminders, knowledge, settings, weather, music, gallery and skills pages on that grammar: all touch targets reach 44px, the Agent composer sits above the Dock at any scroll position, the weather hour strip scroll-snaps, and the desktop Agent stage widens to 84rem with its detail rail folding below the thread under 1600px. The weather city rail sticks below the header, sticky rails and stage padding subtract the desktop transport, the reminder empty state renders its existing copy, and music play modes use the locale labels instead of `LOOP`/`ONE`/`SHUF`. Two unreachable 720px media queries were removed.
- Declared the Node engine floor in `package.json` (mirrored in the README) and switched the Vite scripts to `--configLoader native`.
- Rebuilt the whole product UI as **Quiet Ledger**, replacing the earlier Fluent/WinUI restyle. Every structural class name used in a TSX file now has a rule, the decorative layers are gone (music turntable and vinyl, weather orb and tilt cards, particle rings), colours come from one OKLCH token layer, and the desktop and mobile shells share a single spacing, type and layout scale.
- Rewrote the desktop shell, the nine desktop workspaces and the nine mobile views against that system, and cut the mobile information density: the mobile Today keeps only a daypart hero, one primary action, the todo list and the active sessions; Settings lost its summary grid; Reminders lost its status selector.
- Added `src/theme/palette.ts`, which holds OKLCH literals that mirror the token layer one to one instead of `var()` references, and rewrote `src/theme/AppThemeProvider.tsx` to build the theme from that palette and inject it ahead of the stylesheets so `base.css` can override MUI's defaults.
- Restored the rule-suggestion surface on the desktop Today page. The rebuild had removed all three rule cards, while the plan authorised removing only the duplicate on the phone. The desktop page keeps one compact action card built on the existing recommendation pipeline, and the plumbing that had been left without a consumer was removed.
- Removed the homemade provider HTTP client; split the monolithic agent module into focused `agent/` modules and delegated model calls to Rig.
- Split the monolithic `App.tsx` into a desktop/mobile shell pair, a shared workspace controller, and focused state controllers, and consolidated the scattered stylesheets into `src/ui` design tokens plus shell and page styles; removed the legacy `src/CSS` and `src/ui-next` stylesheets.
- Restyled the product UI around a light-first Fluent/WinUI desk with liquid-glass chrome: synced MUI with `data-theme`, added a selected-state rail, and moved the mobile mini-player into the shell instead of overlaying content. (Superseded by the Quiet Ledger rebuild above.)
- Upgraded Rust crates: `rusqlite` 0.30 to 0.40 (bundled SQLite via `libsqlite3-sys` 0.38.2), `reqwest` 0.12 to 0.13, `keyring` 1.2 to 4, `tauri` 2.10 to 2.12, `rig` 0.42 to 0.44, plus a compatible `cargo update` (`serde` 1.0.229, `serde_json` 1.0.154, `anyhow` 1.0.104, `once_cell` 1.21.4).
- Upgraded the frontend toolchain: within-major refreshes (`@tauri-apps/api` 2.12.4, `@tauri-apps/cli` 2.12.3, TypeScript 7.0.2, `@testing-library/user-event` 14.6.8) plus the across-major bumps React 18 to 19 (`react`, `react-dom`, `@types/react`, `@types/react-dom`), Vite 7 to 8 with `@vitejs/plugin-react` 6, Vitest 3 to 5, jsdom 26 to 30, `@testing-library/jest-dom` 6 to 7, ESLint 8 to 9 (migrated from `.eslintrc.cjs` to flat config in `eslint.config.mjs`), and Babel 7 to 8. ESLint stops at 9 because `eslint-plugin-react` and `eslint-plugin-jsx-a11y` still cap their peer range at ESLint 9; the unused `eslint-config-react-app` (which pinned ESLint 8) was dropped.
- Refreshed both lockfiles onto the newest releases the declared ranges already allow: Vite 8.3.5, Babel 8.0.10, `@types/node` 26.6.6, `@tauri-apps/cli` 2.12.4, `rolldown` 1.2.16 on the frontend; Tauri 2.12.5, `tauri-build` 2.7.4, `tokio` 1.54.1 on the Rust side.
- Upgraded MUI 9.2 to 9.5 (`@mui/material` and `@mui/icons-material`) and `globals` 14 to 17. MUI 9.3 through 9.5 publish no breaking changes against the components this app uses, and the 9.2 pin recorded in the 2026-10-16 review no longer applies — the app renders no MUI `Select`, and the `TextField select`, standalone `Select`, native `Select`, and `Autocomplete` shapes behave identically under jsdom on 9.4.0 and 9.5.0.
- Upgraded `rig` 0.44 to 0.45 and `rusqlite` 0.40 to 0.41 (bundled SQLite 3.54.0 via `libsqlite3-sys` 0.39.1). rig 0.45's breaking changes are confined to its coding-agent harness and JSON front end, and rusqlite 0.41's iterator-returning `Statement::column_names` is unused here, so the agent runtime and the database layer compile unchanged.
- Removed the unused vendored Tauri v1 crates under `src-tauri/vendor/` (`nfd` 0.0.4 and `ntapi` 0.3.7, 114 tracked files): neither crate appears in `Cargo.toml` or `Cargo.lock`, no `.cargo/config.toml` points at the directory, and no Rust source names them.
- Migrated the Rig runtime to the 0.44 provider/agent API (`OpenAIConfig` + `AgentBuilder`, `PromptResponse::output()`) and pinned the Chat Completions wire so generic OpenAI-compatible gateways keep working.
- Project version has been advanced to `0.1.1` after the `0.1.0` desktop release so the repository is ready for the next development cycle.

### Fixed

- The reminder severity, status and linked-note selects had no accessible names, and the completion dialog's scrim and icon button shared one close label; each select now names itself, the scrim uses its own label, and the mobile music page keeps the page title as its `<h1>` with the track as an `<h2>`.
- A reminder created — or back-dated — during a session never alarmed: the start-up seeding pass marked every currently-overdue reminder as already triggered. Seeding is now anchored to a fixed `workspaceReadyAt` and judged per reminder, so a reminder that falls overdue later in the session still fires.
- Switching providers overwrote an unsaved settings draft. The settings form is hydrated once from the workspace, and a form the user has already touched is never overwritten by a later snapshot.
- The mobile sheet's scroll lock was applied to an element that was already locked, so the page behind an open sheet still scrolled under keyboard control.
- Closing a mobile sheet dropped the keyboard focus to the document body when the row that opened it had been deleted; focus now falls back to the sheet's own close control.
- The rebuild introduced four invisible, unnamed keyboard tab stops — the visually hidden file inputs behind the gallery, audio, lyrics and skill-import buttons — and left the heading outline inconsistent across the workspaces. The desktop Agent and Knowledge pages regained their headings, the three `<h3>`-only workspaces gained an `<h2>`, the mobile "Done today" disclosure became a real heading, and the file inputs left the tab order and the accessibility tree.
- The desktop page title was focused on every view change with its focus ring suppressed by an unconditional `outline: none`, so keyboard users were moved without seeing where they were.
- The desktop reminder row carried its severity on a coloured dot alone; the severity is now spelled out in the row's meta line.
- The mobile menu did not mark the current view, so "open Settings, reopen the menu" landed on a list with nothing marked; the menu rows now carry the same `aria-current` marker as the dock.
- The music editor sheet's "open note" action was 37px tall, and the mobile Agent bar showed its provider state as a colour-only dot. The action now meets the 44px touch floor, and the bar prints the localized provider status as 12px muted text instead of relying on the dot.
- The Agent skills sheet labelled its toggles "On" and "Add" in hardcoded English, and the weather city sheet labelled every chip "Remove"; the labels now name the item they act on and live in the locale files.
- The reminder due alert opened a blocking `window.alert` on top of the tone and the view change, and re-armed whenever a reminder was edited. It now raises an in-app notice instead of the modal, re-arms only when the due time or status changes, and UI automation can silence it entirely with `localStorage["mmgh-reminder-alerts-disabled"] = "1"` or a `?disableReminderAlerts=1` query flag (documented in the README).
- Two i18n keys used by the mobile skills view existed in neither locale.
- A missing translation key returned the key string silently; the helpers now report the miss.
- The shared Rig HTTP client is now built fallibly and surfaces a `Result` error instead of panicking on first use.

### Tests

- Added `run_agent` and `forge_skill` orchestration tests that run end-to-end against a loopback provider stub, covering the remote-reply and local-fallback paths.
- Added a regression test asserting the API key never reaches a provider error or the persisted workspace snapshot.
- Raised the Vitest per-test watchdog to 15s. The two App integration tests contain their own 5s waits and can exceed the default 5s while 27 jsdom environments start in parallel, so they timed out under a full-suite run before their assertions; no assertion changed.

### Docs

- Documented the Rig adoption, dependency-upgrade, and four-axis review in `docs/reviews/2026-10-16-rig-runtime-and-dependencies/`.
- Documented the frontend major dependency upgrade (React 19, Vite 8, Vitest 5, ESLint 9, Babel 8) and its four-axis review in `docs/reviews/2026-10-16-frontend-major-dependency-upgrade/`.
- Documented the dependency refresh (MUI 9.5, `globals` 17, `rig` 0.45, `rusqlite` 0.41, both lockfile refreshes, the vendored-crate removal) and its four-axis review in `docs/reviews/2026-10-30-dependency-refresh/`.
- Documented the Quiet Ledger redesign and its four-axis review in `docs/reviews/2026-10-30-quiet-ledger-redesign/`, including the remediation ledger and the re-measured evidence.
- Documented the capability assessment in `eval/ragas/README.md`: the definition and denominator of every metric, the tier layout, how to record a new baseline, and what the assessment is not — a regression gate over a synthetic dataset, not a statistically powered benchmark.

### Notes

- `ragas` 0.4.3 declares `langchain-community` without an upper bound, and 0.4.2 removed `langchain_community.chat_models.vertexai`, which `ragas/llms/base.py` imports; `eval/ragas/requirements.txt` pins 0.4.1. `rapidfuzz` backs the non-LLM context metrics but ragas declares it only under the `all` extra, so the assessment installs it explicitly.
- Ragas adds `1e-10` to the denominator of its average precision, so a perfect ranking reads `0.9999999999`; the capability assessment rounds the value to 1.0.
- Rig concatenates array-of-parts message content without a separator, so multi-part replies read `firstsecond` where the removed client produced `first\nsecond`. Array-of-parts content is uncommon for chat completions; this parity difference is intentional and pinned by a test.
- `keyring` 1.2 to 4 makes `Entry::new` fallible, so a host without an available keyring backend now reports `failed to open keyring entry` instead of a backend error from `get_password()`.
- The shared model-call error text changed from `provider returned <status>: <body>` to `Rig agent completion failed: <rig error>`; the UI does not parse this string.
- Rig 0.44 routes `completion()` to OpenAI's Responses API by default; the runtime pins the Chat Completions wire (`client.chat(model)`) because the app targets generic OpenAI-compatible gateways that only expose `/chat/completions`.
- React 19 types make `inert` a boolean attribute; `GalleryWorkspace` passes `inert={true}`, which still renders `inert=""`.
- ESLint 9 defaults `no-unused-vars` `caughtErrors` to `all`, so two unused catch bindings became optional catch bindings (`catch {`).
- Vitest 5 requires importing `defineConfig` from `vitest/config` for the `test` field in `vite.config.ts` to type-check.
- `eslint-plugin-jsx-a11y` is now enabled (it was declared but never wired in), which fixed two unassociated toggle labels and hid the decorative gallery scrim from assistive tech; `media-has-caption` is off because the app is a music player.
- `package.json` sets `"type": "module"` so Vite 8 loads `vite.config.ts` as ESM, removing the `configLoader: native` warning; the lint script also covers `vite.config.ts` now.
- `eslint.config.mjs` imports `@eslint/js` and `globals`, which are now declared in `devDependencies` instead of relying on ESLint's hoisted copies.
- The stale `dist/闹钟2-哔声_爱给网_aigei_com.mp3` build artifact is no longer tracked (it duplicated the asset in `public/` and `dist/` is gitignored).
- MUI 9.4 adds an opt-in `theme.focusVisible` focus ring. It stays disabled: the Quiet Ledger focus ring (2 px accent, 2 px offset, driven by `--q-focus`) is the only focus indicator, and enabling both would stack two rings.
- `npm update` cannot replace the native `rolldown` binding while a dev server holds the `.node` file: npm updates the package metadata but leaves the old binary, and `vite build` then fails with `bindingChunk.getCodeIdentity is not a function`. Stop the dev server before refreshing the lockfile.
- The Quiet Ledger stylesheet budget is 5,200 non-blank lines and the stylesheet currently stands at 4,531. The plan's 2,600-line figure was an estimate made before the work started; the delivered stylesheet is what nine desktop workspaces and nine mobile views need, so the ceiling was re-recorded at 5,200 and stays enforced so the stylesheet cannot regrow toward the 45,000 lines that were deleted. `DESIGN.md` §3 records the deviation.

## [0.1.0] - 2026-04-14

### Added

- Introduced a productized desktop workspace flow centered around `Today`, `Runtime`, `Knowledge Vault`, `Reminder`, and `Skill` workspaces.
- Added a dedicated `Today` entry surface for queue triage, session continuation, recurring pattern signals, and recent captures.
- Added reminder completion flow with note write-back and optional follow-up reminder creation.
- Added release metadata tracking under `release/0.1.0/`, including installer SHA256 values and release notes.
- Added desktop build helper scripts:
  - `npm run build:desktop`
  - `npm run build:desktop:debug`
  - `npm run release:check`

### Changed

- Refactored the main app into lazily loaded workspaces and split build output into clearer chunks for desktop delivery.
- Extended the Rust workspace snapshot path so note and reminder mutations also append activity into the active session timeline.
- Polished the UI across Today, Runtime, Knowledge Vault, and reminder completion dialogs with stronger hierarchy, state visibility, and mobile layout behavior.
- Reworked release documentation so packaging, artifact paths, and operator checks are documented in-repo.

### Docs

- Added and refined:
  - `README.md`
  - `docs/RELEASE.md`
  - `release/0.1.0/README.md`
  - `release/0.1.0/RELEASE_NOTES.md`
  - `release/0.1.0/SHA256SUMS.txt`

### Validation

- Verified with:
  - `npm run lint`
  - `npm run test:unit`
  - `npm run build`
  - `npm run build:desktop`

