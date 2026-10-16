# Data Review — Frontend Major Dependency Upgrade

## Verdict

`PASS with findings`. Two Minor (P3). No Blocker.

## Review Boundary and Sources

- Reviewer role: Data axis (persistence, state, secrets, dependency/lockfile integrity).
- Sources: `package.json`, `package-lock.json`, `.gitignore`, `git ls-files`, `npm ls`.
- Reviewed revision: `master` at `b2d9b6f` (clean).

## Assessment

- **No persistence surface touched.** The change set contains no Rust, no SQLite schema, no
  `src/storage/*` data-path, and no serialization change. The only runtime dependency added is
  React 19 (replacing React 18); nothing new performs I/O.
- **No secret surface touched.** No API-key, keyring, or provider-settings code is in the diff.
- **Lockfile integrity.** `package-lock.json` was regenerated from scratch during the upgrade
  (`lockfileVersion` 3). `npm ls` reports no unmet/invalid peers; the tree is in sync with
  `package.json` (a follow-up `npm install` produced no changes).
- **No build output committed.** `dist/` is gitignored; the upgrade commits add no build artifacts.

## Findings

### D1 (P3) — One extraneous package in the local `node_modules`

`npm ls` reports `yaml@2.9.1 extraneous` — installed but not referenced by the lockfile (it is an
optional peer of Vite 8). This is local `node_modules` hygiene, not a repository defect: the lockfile
is authoritative and a fresh `npm ci` would not reproduce it. Recorded so the discrepancy is not
mistaken for a lockfile drift.

### D2 (P3) — Pre-existing tracked file inside the gitignored `dist/`

`git ls-files dist` returns one tracked audio asset
(dist/闹钟2-哔声_爱给网_aigei_com.mp3), committed long before this change set
(`528a83a`) and untouched by it. Because `/dist` is gitignored, this file is invisible to normal
`git status` and to the build's cleaning of `dist/`. It is out of scope for the upgrade review but
flagged for repository hygiene: either the asset belongs under `src/assets/`, or it should be
untracked.

## Judgment Calls

- Regenerating the lockfile rather than patching it was the right call: the incremental
  `npm install` path repeatedly resolved against stale entries (the removed `eslint-config-react-app`
  and the old `vite`), which is what forced the clean reinstall. A from-scratch lockfile is the
  reproducible artifact.
