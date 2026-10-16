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

### Changed

- Removed the homemade provider HTTP client; split the monolithic agent module into focused `agent/` modules and delegated model calls to Rig.
- Split the monolithic `App.tsx` into a desktop/mobile shell pair, a shared workspace controller, and focused state controllers, and consolidated the scattered stylesheets into `src/ui` design tokens plus shell and page styles; removed the legacy `src/CSS` and `src/ui-next` stylesheets.
- Restyled the product UI around a light-first Fluent/WinUI desk with liquid-glass chrome: synced MUI with `data-theme`, added a selected-state rail, and moved the mobile mini-player into the shell instead of overlaying content.
- Upgraded Rust crates: `rusqlite` 0.30 to 0.40 (bundled SQLite via `libsqlite3-sys` 0.38.2), `reqwest` 0.12 to 0.13, `keyring` 1.2 to 4, `tauri` 2.10 to 2.12, `rig` 0.42 to 0.44, plus a compatible `cargo update` (`serde` 1.0.229, `serde_json` 1.0.154, `anyhow` 1.0.104, `once_cell` 1.21.4).
- Upgraded the frontend toolchain: within-major refreshes (`@tauri-apps/api` 2.12.4, `@tauri-apps/cli` 2.12.3, TypeScript 7.0.2, `@testing-library/user-event` 14.6.8) plus the across-major bumps React 18 to 19 (`react`, `react-dom`, `@types/react`, `@types/react-dom`), Vite 7 to 8 with `@vitejs/plugin-react` 6, Vitest 3 to 5, jsdom 26 to 30, `@testing-library/jest-dom` 6 to 7, ESLint 8 to 9 (migrated from `.eslintrc.cjs` to flat config in `eslint.config.mjs`), and Babel 7 to 8. MUI stays on 9.2 because 9.4 breaks jsdom Select selectors, and ESLint stops at 9 because `eslint-plugin-react` and `eslint-plugin-jsx-a11y` still cap their peer range at ESLint 9; the unused `eslint-config-react-app` (which pinned ESLint 8) was dropped.
- Migrated the Rig runtime to the 0.44 provider/agent API (`OpenAIConfig` + `AgentBuilder`, `PromptResponse::output()`) and pinned the Chat Completions wire so generic OpenAI-compatible gateways keep working.
- Project version has been advanced to `0.1.1` after the `0.1.0` desktop release so the repository is ready for the next development cycle.

### Fixed

- The shared Rig HTTP client is now built fallibly and surfaces a `Result` error instead of panicking on first use.

### Tests

- Added `run_agent` and `forge_skill` orchestration tests that run end-to-end against a loopback provider stub, covering the remote-reply and local-fallback paths.
- Added a regression test asserting the API key never reaches a provider error or the persisted workspace snapshot.

### Docs

- Documented the Rig adoption, dependency-upgrade, and four-axis review in `docs/reviews/2026-10-16-rig-runtime-and-dependencies/`.
- Documented the frontend major dependency upgrade (React 19, Vite 8, Vitest 5, ESLint 9, Babel 8) and its four-axis review in `docs/reviews/2026-10-16-frontend-major-dependency-upgrade/`.

### Notes

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

