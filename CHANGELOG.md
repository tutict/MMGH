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
- Upgraded Rust crates: `rusqlite` 0.30 to 0.40 (bundled SQLite via `libsqlite3-sys` 0.38.2), `reqwest` 0.12 to 0.13, `keyring` 1.2 to 4, `tauri` 2.10 to 2.11, plus a compatible `cargo update`.
- Upgraded frontend packages within current majors, including `@tauri-apps/api`/`cli` 2.11, TypeScript 7.0.2, Vite 7.3.6, and Vitest 3.2.7. MUI stays on 9.2 because 9.4 breaks jsdom Select selectors.
- Project version has been advanced to `0.1.1` after the `0.1.0` desktop release so the repository is ready for the next development cycle.

### Fixed

- The shared Rig HTTP client is now built fallibly and surfaces a `Result` error instead of panicking on first use.

### Tests

- Added `run_agent` and `forge_skill` orchestration tests that run end-to-end against a loopback provider stub, covering the remote-reply and local-fallback paths.
- Added a regression test asserting the API key never reaches a provider error or the persisted workspace snapshot.

### Docs

- Documented the Rig adoption, dependency-upgrade, and four-axis review in `docs/reviews/2026-10-16-rig-runtime-and-dependencies/`.

### Notes

- Rig concatenates array-of-parts message content without a separator, so multi-part replies read `firstsecond` where the removed client produced `first\nsecond`. Array-of-parts content is uncommon for chat completions; this parity difference is intentional and pinned by a test.
- `keyring` 1.2 to 4 makes `Entry::new` fallible, so a host without an available keyring backend now reports `failed to open keyring entry` instead of a backend error from `get_password()`.
- The shared model-call error text changed from `provider returned <status>: <body>` to `Rig agent completion failed: <rig error>`; the UI does not parse this string.

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

