# Smoke Test Template

Use this checklist after producing a desktop package.

## Build Metadata

- Version:
- Commit:
- Platform:
- Artifact:
- Tester:
- Date:

## Launch

- [ ] Installer runs successfully
- [ ] App launches after install
- [ ] Window title is correct
- [ ] App icon is correct

## Core Flows

- [ ] Today Workspace loads without errors
- [ ] Runtime Workspace opens and shows session state
- [ ] A session can be created or resumed
- [ ] A message can be sent through the runtime flow
- [ ] Knowledge Vault can create and save a note
- [ ] Reminder Workspace can create a reminder
- [ ] Reminder completion dialog can complete a reminder
- [ ] Skill Workspace opens and saves a skill
- [ ] Settings can save provider configuration

## Security And Data

- [ ] API key is not echoed back into the UI snapshot
- [ ] Existing API key can be preserved
- [ ] API key clear flow works
- [ ] App still works in preview/local fallback mode without a live provider

## Packaging Quality

- [ ] Fresh install works
- [ ] Reinstall or upgrade path works
- [ ] App restarts successfully after closing
- [ ] No obvious broken layout on the main workspaces

## Notes

- Known issues:
- Regression risks:
- Follow-up actions:
