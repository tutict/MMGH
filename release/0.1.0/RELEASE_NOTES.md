# MMGH Agent Deck v0.1.0 Release Notes

## Highlights

- Introduced a productized desktop workspace flow centered around `Today`, `Runtime`, `Knowledge Vault`, `Reminder`, and `Skill` workspaces.
- Added a new Today entry surface for queue triage, session continuation, loop signals, recurring pattern detection, and recent captures.
- Split the main app into lazily loaded workspaces and improved build chunking for desktop delivery.
- Added reminder completion flow with note write-back, optional follow-up creation, and recurring-rule promotion support.
- Extended the Rust workspace snapshot path so note and reminder operations also write activity back into the active session timeline.
- Polished the UI across Today, Runtime, Knowledge Vault, and completion dialogs with better hierarchy, state visibility, and mobile layout handling.

## Included Product Areas

- Today Workspace
- Runtime Workspace
- Knowledge Vault
- Reminder completion dialog
- Skill recommendations and recurring pattern insights
- Desktop packaging and release metadata

## Validation

Validated before packaging with:

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `npm run build:desktop`

## Artifacts

- `MMGH Agent Deck_0.1.0_x64_en-US.msi`
- `MMGH Agent Deck_0.1.0_x64-setup.exe`

SHA256 values are recorded in [SHA256SUMS.txt](/C:/Users/tutic/IdeaProjects/MMGH/release/0.1.0/SHA256SUMS.txt).

## Known Notes

- Desktop packaging completed successfully on Windows.
- Rust release build still emits a small set of `dead_code` warnings in `src-tauri/src/db.rs`, but they do not block the packaged installers.
- Weather, Music, and Gallery remain auxiliary front-end workspaces rather than native runtime tools.
