# Standards Review — Dependency Refresh

## Verdict

`PASS with findings`. One Major (P2), two Minor (P3). No Blocker.

## Review Boundary and Sources

- Reviewer role: Standards axis (dependency hygiene, manifest discipline, repository hygiene);
  no implementation or Git change was made by this review.
- Sources: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`,
  `eslint.config.mjs`, the reviewed diff `a0b62a2..de6c5d2`, and the npm/crates.io registries.
- Reviewed revision: `master` at `de6c5d2`.

## Standards Assessment

- **Manifest ranges stay caret/tilde-pinned.** The frontend keeps the `~9.5.0` tilde on MUI and the
  `^` caret everywhere else; the Rust manifest keeps the same shape (`"2"`, `"0.41"`, `"0.45"`).
  No range was widened to `*`, and no range was pinned tighter than the ecosystem norm.
- **No new dependency enters the graph.** `package.json` and `Cargo.toml` gain no name that was not
  already present. The frontend lockfile grows by exactly one entry and loses none: a nested
  `globals@14.0.0` under `@eslint/eslintrc`, which requires `globals@^14` and therefore can no
  longer share the hoisted top-level slot now that the app's own range resolves to 17. The Rust
  lockfile keeps the same package count (895): five crates enter (`httpdate`,
  `rig-harness-protocol`, `rig-memory`, `serde_path_to_error`, `utf_types`) and five leave
  (`alloc-no-stdlib`, `alloc-stdlib`, `brotli`, `brotli-decompressor`, `png`).
- **`npm ls` and `cargo tree` stay consistent with the manifests.** The frontend lockfile's root
  `dependencies` / `devDependencies` blocks are byte-identical to `package.json`; the Rust lockfile
  resolves every manifest requirement.
- **Commit hygiene.** Five commits, one concern each, each independently buildable and testable. No
  commit mixes a manifest change with an unrelated source edit; `git diff a0b62a2..de6c5d2 --
  src-tauri/src` is empty and `git diff a0b62a2..de6c5d2 -- '*.css'` is empty.

## Findings

### T1 (P2) — ESLint 10 is still unreachable

ESLint 10.13.0 is published, but the two plugins this project depends on both cap their peer range
below it:

| Package | Latest | Peer range on `eslint` |
|---|---|---|
| `eslint-plugin-react` | 7.37.5 | `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8 \|\| ^9.7` |
| `eslint-plugin-jsx-a11y` | 6.10.2 | `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8 \|\| ^9` |
| `eslint-plugin-react-hooks` | 7.1.1 | `… \|\| ^9.0.0 \|\| ^10.0.0` |
| `eslint-plugin-react-refresh` | 0.5.7 | `^9 \|\| ^10` |

Installing ESLint 10 would fail `npm install` with `ERESOLVE` on the first two. The project stays
on ESLint 9.39.5, which is the current newest release that satisfies every plugin. This stop-point
is deliberate and recorded in the `CHANGELOG.md`; the upstream fix has to land in
`eslint-plugin-react` and `eslint-plugin-jsx-a11y` first. No local workaround exists — dropping
either plugin would remove the React and accessibility rule sets the lint gate depends on.

### T2 (P3) — `globals` moves two majors in one step

`globals` goes 14.0.0 → 17.13.0. The package is a data-only catalogue of environment globals for
ESLint's flat config; it declares no peer dependencies and no runtime API that the app touches, and
`eslint.config.mjs` uses it only through `globals.browser` / `globals.node`. The two-major jump is
therefore safe, but it skips the 15 and 16 lines, so a future changelog reader should not assume the
intermediate releases were validated. Accepted with this note.

### T3 (P3) — The vendored Tauri v1 crates were tracked in the repository

`src-tauri/vendor/` held a checkout of `nfd` 0.0.4 (the `nativefiledialog` crate, the dependency
behind the old `tauri-plugin-dialog` native path) and `ntapi` 0.3.7 — 114 tracked files, 30,010
lines of Windows shell-dialog and NT API sources. The directory was added with the 2026-01-05 Tauri
update (`971f629`) and never touched again.

Nothing referenced it: neither crate appears in `Cargo.toml` or `Cargo.lock`, there is no
`.cargo/config.toml` (at the repository root or under `src-tauri`) that points a source replacement
at the directory, and no file under `src-tauri/src` names either crate. Keeping a vendored copy in
version control is itself the hazard — it silently stops matching the crates.io release the build
actually resolves, and it inflates every clone and diff. Removed in `de6c5d2`.

## Exclusions

- The `dist/` tree, `node_modules/`, and `src-tauri/target/` were not audited for hygiene beyond
  the specific stale-binding finding recorded in COMPATIBILITY-REVIEW.md.
- The `scripts/` directory was not reviewed; no dependency change affects it.
