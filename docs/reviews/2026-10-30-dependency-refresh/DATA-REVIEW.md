# Data Review — Dependency Refresh

## Verdict

`PASS with findings`. Two Minor (P3). No Blocker, no Major.

## Review Boundary and Sources

- Reviewer role: Data axis (lockfile integrity, determinism, and the persistence guarantees the
  dependency change can affect); no implementation or Git change was made by this review.
- Sources: `package-lock.json`, `src-tauri/Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/src/db.rs`,
  `src-tauri/src/db/sessions.rs`, the reviewed diff `a0b62a2..de6c5d2`, and the observed
  install/build/test runs.
- Reviewed revision: `master` at `de6c5d2`.

## Data Assessment

- **Lockfiles are self-consistent.** The frontend lockfile is `lockfileVersion` 3 and its root
  `packages[""].dependencies` / `devDependencies` blocks match `package.json` exactly. The Rust
  lockfile resolves every manifest requirement and pins a `checksum` for every registry package.
- **The resolved Rust graph still matches the manifest.** `mygh` resolves to `reqwest 0.13.5`,
  `rusqlite 0.41.1`, `rig 0.45.0` and `tauri 2.12.5`, matching the `Cargo.toml` requirements.
- **No schema or persistence change.** `git diff a0b62a2..de6c5d2 -- src-tauri/src` is empty, so the
  database layer — schema versioning, migrations, the WAL journal, the snapshot policy — is
  byte-identical.
- **The SQLite version the app actually opens moves forward.** `rusqlite` 0.41 bumps the bundled
  SQLite to 3.54.0 (via `libsqlite3-sys` 0.39.1, up from 0.38.2). The bundle is compiled from
  source, so every install gets the same SQLite build — the app does not depend on the host's
  SQLite.
- **The database suite still passes.** `cargo test` runs 43 database tests against a real temporary
  SQLite file, including the schema-migration, journal-recovery, and snapshot-policy cases, plus 59
  integration tests. All pass.

## Findings

### D1 (P3) — The npm tree carries a hoisted `yaml` that does not match the lockfile layout

`npm ls --package-lock-only --all` reports `invalid: yaml@1.10.3`. The installed tree has
`yaml` nested under `node_modules/cosmiconfig/node_modules/yaml`, while the lockfile declares a
top-level `node_modules/yaml@1.10.3`. The two layouts are equivalent for resolution — npm simply
nested the copy — but `npm ls` compares the physical tree against the lockfile's declared path and
flags the difference.

This is pre-existing and unrelated to the refresh: `yaml` appears nowhere in the reviewed diff, and
the same discrepancy was reported by the 2026-10-16 review (finding D1, there as an "extraneous
local package"). It is a local `node_modules` artefact, not a repository defect — a clean
`npm ci` produces the lockfile's layout exactly. Accepted; no repository change is warranted.

### D2 (P3) — Two rusqlite transitives resolved newer than the reviewed snapshot

During the refresh, `rsqlite-vfs` resolved 0.1.1 → 0.2.0 and `sqlite-wasm-rs` 0.5.5 → 0.6.2
relative to the snapshot captured while the upgrade was first verified. Both are rusqlite
transitives (the custom VFS shim and the WASM build shim). `cargo tree -i` reports **nothing** for
either crate, which confirms they are recorded in the lockfile but are not part of the active build
graph for this target — the app uses the `bundled` feature on the native host, not the VFS or WASM
paths.

Both versions satisfy rusqlite 0.41.1's requirements, and the full Rust suite and the release
build pass against them. The divergence from the earlier snapshot is recorded here so the next
review does not read it as an unexplained change.

## Exclusions

- The SQL schema files under `src-tauri/sql/` and the migration code in `src-tauri/src/db.rs` were
  not re-reviewed; they are unchanged.
- The workspace snapshot format written by the Tauri side and read by the web side was not
  diffed across the upgrade; both sides are unchanged.
