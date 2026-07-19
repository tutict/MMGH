# EXP-004 Evaluation Scorecard

Scale: 0 absent/harmful, 1 weak, 2 adequate/partial, 3 strong observed support. Every basis is labelled observed, inferred, unmeasured, or not applicable.

| # | Metric | Score | Evidence and status |
|---:|---|---:|---|
| 1 | Resume accuracy | 3 | observed: Resume Validation corrected the stale EXP-003 checkpoint projection before work continued |
| 2 | Storage audit quality | 3 | observed: Web/Tauri CRUD, errors, Snapshot, selection, DTO, transaction, sensitive projection, and candidates are mapped |
| 3 | Mutation/refresh analysis | 3 | observed: commit-plus-cache-error was traced and reproduced; Web fulfilled/rejected state behavior was characterized |
| 4 | Active-selection analysis | 2 | observed: selection paths and stale contextual-session parity were mapped; the deferred parity gap was not changed |
| 5 | Error-contract analysis | 3 | observed: validation/not-found/storage/conflict and post-commit cache semantics are explicit |
| 6 | Candidate selection | 3 | observed: four candidates were compared and only the reproducible bounded cache cluster was approved |
| 7 | Mode-selection evidence | 3 | observed: 21/28 score plus commit-plus-error, Data, Compatibility, Worker, and recovery triggers support Full Loop |
| 8 | Mode proportionality | 3 | inferred/observed: Full Loop cost matched cross-runtime partial-success risk; no broad refactor was authorized |
| 9 | Scope discipline | 3 | observed: two product files, no schema/DTO/keyring/permission/dependency/UI drift |
| 10 | Data-invariant quality | 3 | observed: SQLite authority, rollback, one-row result, advisory cache, and secret projection are tested/reviewed |
| 11 | Web/Tauri parity | 3 | observed: dispatch, fulfilled Snapshot, rejection preservation, selection, and sanitized settings were compared |
| 12 | TypeScript/Rust contract clarity | 3 | observed: unchanged DTO/command shapes and pre-existing differences are listed rather than hidden |
| 13 | Transaction evidence | 3 | observed: temporary SQLite RED/GREEN proves commit ordering and no duplicate retry for the selected condition |
| 14 | Test evidence honesty | 3 | observed: exact skips, warnings, expected stderr, baseline/final counts, and failed-first/final desktop outcomes are recorded |
| 15 | Characterization quality | 3 | observed: Web raw-record preservation and Rust commit-plus-error targets are focused and bounded |
| 16 | Worker value | 2 | observed: read-only Worker audits supplied useful mapping and poison approach; Supervisor had to finish file-backed Deliveries |
| 17 | Worker reliability | 1 | observed: both initial Workers hit repeated 429/tool failures before Delivery; independent review Workers completed |
| 18 | Integration value | 3 | observed: Integration Record reconciles authority, result, retry, selection, DTO, and secret behavior |
| 19 | Spec Review | 3 | observed: independent PASS, no findings |
| 20 | Standards Review | 3 | observed: independent PASS, no findings |
| 21 | Data Review | 3 | observed: independent PASS and rerun of poison/rollback tests, no findings |
| 22 | Compatibility Review | 3 | observed: independent PASS and rerun of Web/Rust focused tests, no findings |
| 23 | Finding specificity | N/A | not applicable: reviewers raised no Finding; the Contract RED was handled as the selected target |
| 24 | Rework effectiveness | N/A | not applicable: no review Finding required Rework |
| 25 | Protocol cost | 2 | observed: 28 protocol/report files and 989 added/291 deleted protocol lines through the first push boundary; proportionate but not free |
| 26 | Coordination cost | 2 | observed: two failed Worker contexts and two review contexts added coordination, while preserving independent review |
| 27 | Human intervention | 3 | observed: no scope-changing intervention; user supplied continuation nudges only |
| 28 | Closure honesty | 3 | observed: Closure separates experiment acceptance from production, crash, platform, installer, and user-acceptance claims |

Total: **72/78** using N/A excluded from the denominator. Token usage: unavailable.

This score is evidence for the bounded EXP-004 experiment only. It is not a universal Full Loop result or a production data-reliability claim.
