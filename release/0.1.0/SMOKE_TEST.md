# MMGH Agent Deck v0.1.0 Smoke Test

## Build Metadata

- Version: `0.1.0`
- Release commit: `0c180aa39aa36c85bce0c9274809220518c35490`
- Smoke test record created from repo state: `374d0d2`
- Platform: `Windows x64`
- Primary artifact: `MMGH Agent Deck_0.1.0_x64-setup.exe`
- Secondary artifact: `MMGH Agent Deck_0.1.0_x64_en-US.msi`
- Tester: `Codex`
- Date: `2026-04-14`

## Verified In This Run

### Launch

- [x] Installer runs successfully
- [x] App launches after install
- [x] Window title is correct
- [ ] App icon is correct

### Core Flows

- [ ] Today Workspace loads without errors
- [ ] Runtime Workspace opens and shows session state
- [ ] A session can be created or resumed
- [ ] A message can be sent through the runtime flow
- [ ] Knowledge Vault can create and save a note
- [ ] Reminder Workspace can create a reminder
- [ ] Reminder completion dialog can complete a reminder
- [ ] Skill Workspace opens and saves a skill
- [ ] Settings can save provider configuration

### Security And Data

- [ ] API key is not echoed back into the UI snapshot
- [ ] Existing API key can be preserved
- [ ] API key clear flow works
- [ ] App still works in preview/local fallback mode without a live provider

### Packaging Quality

- [x] Fresh install works
- [x] Reinstall or upgrade path works
- [x] App restarts successfully after closing
- [ ] No obvious broken layout on the main workspaces

## Command-Level Evidence

The following checks were executed during this smoke run:

- Launched the built release executable twice and confirmed the window title was `MMGH Agent Deck` on both runs.
- Ran the NSIS installer silently into a temporary workspace directory and confirmed:
  - exit code `0`
  - installed executable found at `.smoke-install/MMGH-Agent-Deck/mygh.exe`
  - installed app launched with window title `MMGH Agent Deck`
- Re-ran the installer against the same target directory and confirmed:
  - exit code `0`
  - relaunched app window title remained `MMGH Agent Deck`

## Limitations

- This smoke run was performed from terminal automation.
- Windows UI Automation exposed the top-level window and title bar elements, but not enough workspace-level DOM content to reliably mark Today/Runtime/Knowledge/Reminder/Skill flows as passed.
- A short manual GUI pass is still recommended before treating the build as fully release-ready.

## Follow-Up Manual Checks

- Open the installed app and confirm Today is the default landing surface.
- Create or resume a session in Runtime.
- Save one note in Knowledge Vault.
- Create and complete one reminder.
- Open Settings and verify provider state handling.
