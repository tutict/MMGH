# MMGH Agent Deck

MMGH Agent Deck is a local desktop agent workspace built with `Rust + Tauri + React`.

The product is organized around sessions, knowledge, reminders, skills, and a set of supporting workspaces so that conversation, durable context, and follow-up actions stay in one desktop surface.

## Docs

- API key handling: [docs/API_KEY_HANDLING.md](docs/API_KEY_HANDLING.md)
- Release guide: [docs/RELEASE.md](docs/RELEASE.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Product Areas

- `Today Workspace`: daily queue, session continuation, loop signals, and recent captures
- `Runtime Workspace`: conversation thread, execution context, mounted skills, and quick capture
- `Knowledge Vault`: local notes, reusable prompts, runbooks, and product facts
- `Reminder Workspace`: reminders with note linking, completion write-back, and follow-up creation
- `Skill Workspace`: skill authoring, editing, version history, import/export, and forge flow
- `Weather / Music / Gallery`: supporting front-end workspaces for context and media

## Current Scope

- The core runtime still focuses on sessions, reminders, knowledge, and skill context.
- Weather, Music, and Gallery are product workspaces, not native runtime tools.
- Skills are low-permission prompt capabilities and do not grant extra system privileges.

## Tech Stack

- Frontend: React 18 + Vite
- Desktop runtime: Tauri 2
- Backend: Rust
- Local persistence: SQLite + system keyring
- Model gateway: OpenAI-compatible provider

## Repository Layout

- `src/`: React app, workspaces, styles, i18n strings
- `src/components/`: main workspace UI components
- `src/storage/`: preview-mode and desktop-mode data access
- `src/utils/`: Today/Runtime workflow logic and derived state helpers
- `src-tauri/`: Tauri runtime, Rust commands, SQLite persistence
- `src-tauri/sql/schema.sql`: SQLite schema
- `docs/`: security and release docs
- `release/`: versioned release metadata

## Prerequisites

- Node.js 18+
- npm 9+
- Rust stable
- Tauri 2 build prerequisites for your platform

Install dependencies:

```bash
npm install
```

## Local Development

Web preview:

```bash
npm run dev:web
```

Desktop development:

```bash
npm run dev:tauri
```

## Build And Validation

Frontend build:

```bash
npm run build
```

Desktop release build:

```bash
npm run build:desktop
```

Desktop debug build:

```bash
npm run build:desktop:debug
```

Release validation:

```bash
npm run release:check
```

You can also run checks individually:

```bash
npm run lint
npm run test:unit
npm run test:rust
```

## Build Artifacts

Desktop bundle output is produced under:

```text
src-tauri/target/release/bundle/
```

On Windows, the most relevant outputs are usually:

- `msi`
- `nsis`

## Provider Configuration

Configure the model provider in `Settings`:

- `Base URL`
- `API Key`
- `Model`
- `System Prompt`

Security rules:

- Remote `Base URL` values are expected to use `https`
- `http` is only allowed for `localhost` or private network ranges
- Trusted hosts can be configured through:
  - `VITE_TRUSTED_PROVIDER_HOSTS`
  - `MMGH_TRUSTED_PROVIDER_HOSTS`
- Strict host allowlisting can be enabled with:
  - `VITE_ENFORCE_TRUSTED_PROVIDER_HOSTS=true`
  - `MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS=true`

If no live provider is configured:

- the desktop app falls back to local preview reply logic
- Skill Forge falls back to local draft generation

## API Key Contract

- Browser preview mode does not persist plaintext API keys in `localStorage`
- Tauri desktop mode stores the active key in the system keyring, not SQLite
- Client-facing settings snapshots always expose a blank `apiKey`
- Frontend code must rely on `hasApiKey`, not secret round-tripping

See [docs/API_KEY_HANDLING.md](docs/API_KEY_HANDLING.md) for details.

## Release Pointers

For published builds, see:

- version metadata: `release/<version>/README.md`
- user-facing notes: `release/<version>/RELEASE_NOTES.md`
- installer checksums: `release/<version>/SHA256SUMS.txt`

The first packaged desktop release is tracked under:

- [release/0.1.0/README.md](release/0.1.0/README.md)
- [release/0.1.0/RELEASE_NOTES.md](release/0.1.0/RELEASE_NOTES.md)
