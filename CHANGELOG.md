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

- Removed the homemade provider HTTP client and monolithic agent completion loop.
- Restyled the product UI around a light-first Fluent/WinUI desk with liquid-glass chrome: synced MUI with `data-theme`, added a selected-state rail, and moved the mobile mini-player into the shell instead of overlaying content.
- Upgraded Rust crates: `rusqlite` 0.30 to 0.40, `reqwest` 0.12 to 0.13, `keyring` 1.2 to 4, `tauri` 2.10 to 2.11, plus a compatible `cargo update`.
- Upgraded frontend packages within current majors, including `@tauri-apps/api`/`cli` 2.11, TypeScript 7.0.2, Vite 7.3.6, and Vitest 3.2.7. MUI stays on 9.2 because 9.4 breaks jsdom Select selectors.
- Project version has been advanced to `0.1.1` after the `0.1.0` desktop release so the repository is ready for the next development cycle.

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

