# API Key Handling

This project now treats provider API keys as secret material across both preview mode and the Tauri desktop runtime.

## Preview Mode

- Browser preview mode never persists plaintext `apiKey` into `localStorage`.
- The active preview key lives only in `volatilePreviewApiKey` inside [src/storage/agent.js](/C:/Users/tutic/IdeaProjects/MMGH/src/storage/agent.js).
- Saved preview workspace snapshots keep `apiKey: ""`.
- Preview persistence only keeps a boolean-style signal through `hasApiKey`.

## Desktop Runtime

- The Tauri backend stores the active API key in the system keyring, not in SQLite.
- The active runtime key is also cached in process memory for the current app session.
- SQLite settings payloads are always sanitized before write, so `api_key` is blank in the stored JSON.
- Legacy plaintext keys that already exist in SQLite are migrated out on load and pushed into the keyring/runtime path.

Key Rust paths:

- [src-tauri/src/db.rs](/C:/Users/tutic/IdeaProjects/MMGH/src-tauri/src/db.rs)
- [src-tauri/src/cmd.rs](/C:/Users/tutic/IdeaProjects/MMGH/src-tauri/src/cmd.rs)

## Frontend Snapshot Contract

Any settings snapshot returned to the frontend must follow this contract:

- `hasApiKey: true | false` reflects whether a usable key exists.
- `apiKey: ""` is always blank in client-facing snapshots.
- The frontend must never rely on receiving the real secret back from Rust.

This contract is enforced in Rust before snapshot construction and mirrored in preview mode.

Because the frontend only sees `hasApiKey` plus a blank `apiKey`, settings-page copy should stay source-neutral. It should not claim that the key is definitely memory-only or definitely keyring-backed unless the runtime explicitly exposes that extra state.

## Settings Semantics

The settings form now has three distinct API key flows:

1. Leave the password field blank and save.
   The existing key is preserved.
2. Enter a new API key and save.
   The new key replaces the active key.
3. Click `Clear saved API key` and save.
   The current key is deleted from the system keyring and cleared from runtime memory.

Typing a new key while the form is in clear mode exits clear mode automatically.

## Test Coverage

Relevant coverage now exists in both frontend and Rust tests:

- [src/storage/agent.test.js](/C:/Users/tutic/IdeaProjects/MMGH/src/storage/agent.test.js)
  Covers preview-mode keep, overwrite, and clear flows.
- [src/components/SettingsWorkspace.test.jsx](/C:/Users/tutic/IdeaProjects/MMGH/src/components/SettingsWorkspace.test.jsx)
  Covers settings-page clear-toggle and typing behavior.
- [src-tauri/src/db.rs](/C:/Users/tutic/IdeaProjects/MMGH/src-tauri/src/db.rs)
  Covers key preservation, explicit clear, legacy migration, and snapshot sanitization.

## Verification Commands

```bash
npm run test:unit
npm run test:rust
npm test
```
