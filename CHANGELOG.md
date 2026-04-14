# Changelog

All notable changes to this project will be documented in this file.

The format follows a lightweight `Keep a Changelog` style:

- `Added` for new features
- `Changed` for behavior, UX, or architecture updates
- `Fixed` for bug fixes
- `Docs` for release, packaging, or operator documentation changes

## [Unreleased]

### Changed

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
