# MMGH Current State Audit

Audit date: 2026-07-18
Evidence class: observed unless explicitly marked inferred or unverified.

## Repository Baseline

- Repository: `C:/Users/tutic/IdeaProjects/MMGH`; origin `https://github.com/tutict/MMGH.git`.
- Start branch/HEAD: `master` at `e0a4953e0dfd69b7f21e3be7c190a11c95def43f`.
- `master` observed tracking and equal to `origin/master`; no newer local commit.
- Experiment branch: `experiment/looppilot-mmgh-exp-001`.
- Pre-existing unrelated untracked content: `PRODUCT.md` and `.impeccable/live/config.json`.
  Both are excluded from edits and commits.
- No repository `AGENTS.md` and no GitHub Actions workflow were found.

## Product and User-flow Map

The primary actor is a local operator. Source, tests, schema, and documentation show these
flows, rather than README alone:

| Flow | Frontend evidence | Storage/runtime evidence |
|---|---|---|
| Today | `TodayWorkspace`, `todayWorkflow`, `todayInsights` | Projects sessions, notes, reminders, skills from one snapshot |
| Agent session | App session library/composer and mobile Agent view | preview `runAgent`; Tauri `run_agent`; persisted messages/activity/skill mounts |
| Knowledge | `KnowledgeVault`, note drafts/search/capture | create/open/save/delete note; SQLite notes/tags and activity |
| Reminder | `ReminderWorkspace`, timer/completion/follow-up UI | reminder CRUD, linked-note integrity, completion/capture workflows |
| Skill | `SkillWorkspace`, history/import/export/forge UI | skill CRUD, session mounts, generation fallback/network path |
| Settings | `SettingsWorkspace` and Provider assessment | sanitized settings, Rust/keyring commit recovery, URL validation |
| Auxiliary | Weather, Music, Gallery workspaces | remote weather/lyrics plus browser-local auxiliary caches |
| Desktop | desktop state/listeners and Tauri shell composition | lifecycle/window commands/events, tray behavior, native bundles |
| Mobile | dedicated `MobileAppShell` and mobile views | reuses App state and the same action handlers; no separate persistence |
| Web preview | same React workspaces | sanitized localStorage workspace and local/model fallbacks |

Release/recovery is repository-oriented: lint/test/build/release scripts, release metadata,
and a smoke-test template exist. No automated CI workflow was observed.

## Architecture Map

```text
desktop/mobile React views
        |
        v
App.tsx composition + transient UI + domain action orchestration
        |
        +--> browser-local auxiliary caches (weather/gallery/lyrics/skill history)
        |
        v
storage/agent.ts runtime switch
   | Web preview                 | Tauri
   v                             v
sanitized localStorage       Tauri commands -> Rust db/provider/desktop modules
                                               |             |
                                               v             v
                                            SQLite       OS keyring / reqwest
```

The Web and Tauri paths project a common workspace shape but are not expressed as a named
typed application port. That is a later candidate; changing it in the first Loop would
mix storage, IPC, security, and UI risks.

## Frontend Responsibility Map

Observed `src/App.tsx` measurements before product-code changes:

- 5,855 lines and 23 import declarations containing about 120 imported bindings.
- 51 `useState`, 35 `useEffect`, 29 `useCallback`, and 36 `useMemo` occurrences.
- Ten lazy workspace/dialog imports and direct imports of 20 storage operations.
- It coordinates Session, Knowledge, Reminder, Skill, Settings, Today, Weather, Music,
  Gallery, desktop lifecycle, responsive/mobile composition, and shared error/loading state.
- Lines 319–626 implement equality and structural sharing for settings, capabilities,
  session detail/messages/activity/skill mounts, notes, reminders, and skills.
- The merge is invoked by both explicit storage synchronization and snapshot commits.
- `MobileAppShell` receives the same derived values and action handlers as desktop views;
  no duplicate durable mobile store was observed.

Large size alone is not the decision. The change-risk evidence is the combination of many
domain dependencies, lifecycle effects, action transaction/rollback paths, and a complete
cross-domain snapshot policy in one composition file. `App.tsx` changed in 13 observed
commits and in each of the two latest workspace redesign commits, so it is also a live
conflict surface.

Existing extracted modules are evidence against a wholesale rewrite: Today insights,
workflow helpers, playback snapshots, storage/security helpers, mobile models, UI wrappers,
and workspace components already provide useful boundaries. The next safe step is one pure
policy extraction, not a new architecture framework.

## Rust/Tauri Responsibility Map

- `main.rs` initializes state, tray/window lifecycle, and registers Tauri commands.
- `cmd.rs` maps IPC commands and errors to database/agent/desktop functions.
- `contracts.rs` defines serializable inputs such as Provider settings and skill/session
  commands.
- `db.rs` is 3,566 lines and owns orchestration, transaction/cache publication, migrations,
  settings/keyring commit recovery, and extensive inline tests. It delegates schema,
  queries, projections, transactions, and snapshot details to `db/*` modules.
- SQLite initialization checks `user_version`, rejects newer schemas, migrates v1 to v2,
  validates counts/foreign keys, and executes post-init migrations.
- Mutating operations use transactions and publish snapshot cache only after success.
- Provider calls are isolated under `agent/provider.rs` and use reqwest with a bearer
  header derived from runtime configuration.
- Desktop lifecycle is a separate Rust module and Tauri event contract.
- `src-tauri/capabilities/default.json` is the app capability configuration; `LOOP-001`
  does not change it.

The backend is not classified as needing full DDD. Selected domain modules plus simpler
layered extraction are more proportional. Rust blocking behavior and end-to-end IPC error
mapping were inspected structurally but not profiled under load.

## Data Model and Integrity

The v2 schema covers Provider settings (without an API-key column), sessions, messages,
activity, notes/tags, reminders, skills, session-skill mounts, and migration markers.
Foreign keys and deletion/update behavior are implemented and tested in Rust. Desktop
snapshot refresh uses cached seeded projections after successful transactions. Web preview
implements a separate sanitized model with optimistic retry/conflict detection.

User-data recovery semantics are limited to schema migration, preview corrupt-record backup,
and transaction integrity. A full user-facing backup/restore or production migration drill
was not observed and is unverified.

## Security Boundaries

- Desktop API keys use OS keyring active/staged entries and recovery logic. Provider settings
  persisted in SQLite and projected to the frontend have an empty `apiKey` value plus only
  `hasApiKey` state.
- Preview keys are volatile. Legacy plaintext localStorage keys are scrubbed; persisted
  workspace settings are sanitized. Tests cover reload/non-persistence and corrupt payloads.
- Frontend and Rust both reject credentials embedded in URLs and remote plain HTTP; localhost
  and private-network HTTP are permitted. Trusted-host enforcement is configurable.
- Import/export paths audited in App concern skills/gallery/local caches, not Provider secret
  export. No intentional secret logging was observed.
- Unverified: OS-specific keyring behavior on all platforms, malicious local process access,
  certificate pinning (not designed), production log/content retention, and real hostile
  import fuzzing.

## Test and Release Baseline

All commands below were run before product-code modification:

| Check | Observed result |
|---|---|
| `npm run lint` | pass, 5.142 s |
| `npm run typecheck` | pass, 1.081 s |
| `npm run test:unit` | pass, 16 files; 71 passed, 3 skipped; 8.989 s wall |
| `npm run build` | pass, 1,002 modules; 2.852 s wall |
| `npm run test:rust` | pass, 88 passed, 2 ignored; 49.541 s cold |
| `npm test` | pass full chain; 21.210 s wall |
| `npm run build:desktop:debug` | pass; debug executable plus MSI/NSIS bundles; 46.867 s |

Expected test stderr covered a mocked model-network fallback and corrupt preview-workspace
backup. Rust emitted existing dead-code warnings in the k6 harness. Unit coverage includes
storage conflicts/security, Provider URL validation, workspace models, mobile action routing,
and components. The active App suite has one normal integration test; two render profiling
tests are skipped unless `MMGH_PROFILE=1`.

Release scripts/docs/metadata and a manual smoke template exist. No GitHub Actions were
observed, and installers were built but not installed/launched as an end-user smoke test.

## Observed Risks and Candidate Refactor Areas

1. High-change App composition surface makes cross-domain regressions and reviews harder.
2. Snapshot identity policy is cross-domain, untyped at its boundary, and indirectly tested.
3. Runtime/lifecycle/cache effects are interleaved in App and need a later bounded Loop.
4. Core workflow handlers contain compensating/rollback behavior in the composition root.
5. Web/Tauri common contracts rely on structural convention across TS/Rust rather than an
   explicit cross-language contract test.
6. Large Rust `db.rs` retains considerable orchestration despite existing submodules.
7. No CI workflow and no observed automated end-to-end critical-flow/installer smoke gate.
8. Preview and desktop persistence deliberately differ; future changes could drift.

Candidate areas therefore map to `LOOP-001` through `LOOP-004` in `.looppilot/LOOP-MAP.md`.

## Rejected Assumptions

- “Large App means rewrite it”: rejected; extract one proven pure boundary.
- “React requires a global store/MVVM layer”: rejected; no evidence justifies it now.
- “Rust requires DDD”: rejected; current complexity supports selected modules and invariants.
- “Snapshot reference reuse proves a performance problem”: rejected; no profile exists.
- “Desktop build means release readiness”: rejected; build is not installation or release.
- “README is reliable product truth”: rejected; it is visibly encoding-damaged in this
  checkout and was corroborated through source/tests/docs.

## Unverified Areas

- Real user acceptance, long-duration usage, data scale/load, performance improvement,
  full production-data migration/recovery, installer launch, macOS/Linux builds, release,
  deployment, and automated cross-session recovery.
- Completeness of every product edge case and security property; this is a bounded audit.
