# Release Guide

This project currently ships desktop installers through Tauri. This guide covers release checks, version bumps, packaging commands, artifact locations, and delivery conventions.

## 1. Pre-Release Check

Confirm the worktree is clean:

```bash
git status --short
```

Run the full validation chain:

```bash
npm run release:check
```

This runs:

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `npm run test:rust`

## 2. Update Version Numbers

Keep these files in sync before a release:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Also review:

- product name and bundle description in `src-tauri/tauri.conf.json`
- `README.md`
- `CHANGELOG.md`
- `release/<version>/` metadata

## 3. Build Desktop Packages

Release build:

```bash
npm run build:desktop
```

Debug build:

```bash
npm run build:desktop:debug
```

Tauri runs the frontend build first, then produces desktop bundles.

## 4. Artifact Locations

Release bundles:

```text
src-tauri/target/release/bundle/
```

Debug output:

```text
src-tauri/target/debug/
```

On Windows, the most relevant bundles are usually:

- `msi`
- `nsis`

## 5. Repository Metadata Convention

Track release metadata in:

```text
release/
  <version>/
    README.md
    RELEASE_NOTES.md
    SHA256SUMS.txt
```

Meaning:

- `README.md`: build commit, artifact names, sizes, validation steps
- `RELEASE_NOTES.md`: user-facing summary
- `SHA256SUMS.txt`: installer checksums

Do not commit installer binaries to the repository. Keep them under `src-tauri/target/release/bundle/`.

## 6. Smoke Test Checklist

Use the reusable checklist in:

- [docs/SMOKE_TEST_TEMPLATE.md](SMOKE_TEST_TEMPLATE.md)

At minimum, verify:

- the app launches
- Today loads
- Runtime can create or continue a session
- Knowledge Vault can create and save a note
- Reminder flow can create and complete an item
- Skill Workspace opens and saves correctly
- Settings can save provider configuration
- API key state is not echoed back into client snapshots

## 7. Release Notes Template

```text
Version: vX.Y.Z
Commit: <git-sha>

Highlights:
- ...
- ...

Checks:
- lint
- unit tests
- rust tests
- desktop build

Known issues:
- ...
```

## 8. Recommended Flow

1. Finish feature work and commit it.
2. Update version numbers.
3. Update `CHANGELOG.md`.
4. Run `npm run release:check`.
5. Run `npm run build:desktop`.
6. Record artifact metadata under `release/<version>/`.
7. Run the smoke checklist.
