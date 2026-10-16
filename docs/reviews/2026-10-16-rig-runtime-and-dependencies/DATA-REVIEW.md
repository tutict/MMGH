# Data Review — Rig Runtime Refactor and Dependency Upgrade

## Verdict

`PASS with findings`. No Blocker. One Major (P2) coverage finding, three Minor (P3), and one unverified residual risk.

## Review Boundary

- Reviewer role: Data axis (transaction, partial-success, retry/idempotency, persistence integrity); no implementation or Git change was made by this review.
- Reviewed revision: `master` at `9a189af` / `9b1c3ad` (Rust clean).
- Sources: `src-tauri/src/agent/*`, `src-tauri/src/db.rs`, `src-tauri/src/db/settings.rs`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`.

## Data/Transaction Assessment

- The model call runs before persistence: `run_agent` awaits `request_completion` and only then calls `db::persist_agent_run` (`agent/mod.rs:98`). `persist_agent_run` still uses `with_workspace_transaction` (`db.rs:1032`) and the `TransactionBehavior::Immediate` boundary is unchanged. Partial-success semantics of the agent-run write are therefore unaffected by the refactor.
- On model failure the runtime persists a local fallback reply with `model_status = "failed"`; the durable write still occurs once and returns the transaction-built `WorkspaceSnapshot`. This matches the pre-refactor behavior.
- The API key continues to be loaded from the system keyring and is never written to SQLite; the persistence projection still blanks it (`db/settings.rs:399-404`).
- `rusqlite` 0.30 to 0.40 changes the bundled SQLite (`libsqlite3-sys` 0.38.2). Existing migration and snapshot tests pass, so no behavioral regression was observed, but the SQLite version delta is not documented.

## Findings

### D1 (P2) — The Rig call path is untested (release-baseline risk)

For a release baseline, the highest-value data risk is that the refactor changed the model-call path with no test that exercises it. A regression in prompt assembly, error mapping, or fallback selection would not be caught by the current suite. (Same root cause as Standards T2; recorded here because its impact is on runtime data/result correctness.)

### D2 (P3) — `HTTP_CLIENT` panics on first use

`runtime.rs:13-18` builds the shared `reqwest::Client` with `.expect("failed to build Rig HTTP client")`. If client construction fails, the first `run_agent`/`forge_skill` call panics instead of returning a `Result` error. This pattern was carried over from the old `provider.rs`, so it is not a regression, but it is a panic surface on the request path.

### D3 (P3) — Bundled SQLite version delta undocumented

`rusqlite` 0.30 to 0.40 pulls `libsqlite3-sys` 0.38.2. The `CHANGELOG` records the crate bump but not the underlying SQLite version change, which is the part that can affect SQL semantics and migration behavior.

### D4 (P3) — Lockfile carries a second `reqwest` major and unused-looking Rig crates

`src-tauri/Cargo.lock` contains `reqwest` 0.12.28 (via `hf-hub` and `lance-namespace-reqwest-client`, which come from `fastembed`) and Rig vector-store crates (`rig-milvus`, `rig-helixdb`). None of these appear in the host build graph (`cargo tree -e normal` shows only `reqwest 0.13.5` and `rig*` 0.42.0). The lockfile therefore resolves two `reqwest` majors and a set of embedding/vector crates that are not built on Windows. Confirm they cannot be pulled in by a feature or target flip, and consider pruning to reduce SBOM/audit noise.

## Unverified Residual Risk

- Whether a Rig error string can include the API key and reach the persisted `model_detail` field. `model_detail` is `text::shorten(&format!("{:#}", error), 200)` and is persisted by `persist_agent_run`. Nothing in the reviewed code places the key into an error, and the validated `base_url` carries no credentials, but this was not verified against a live Rig error. Recommend a targeted check (e.g. a failing request against a local stub) before relying on it.

## Exclusions

No live provider call, real keyring, real user database, crash-recovery, or multi-process test was performed. Idempotency of unrelated failures is not claimed.