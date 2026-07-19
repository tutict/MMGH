# EXP-004 Results

## Executive Verdict

EXP-004 completed `LOOP-005` as `accepted-for-experiment` under Full Loop. The bounded correction is real and tested: a committed SQLite mutation is no longer reported as failed solely because the advisory Snapshot cache mutex is poisoned. This is not a claim that MMGH has production-grade data reliability.

## Required Findings

1. Resume boundary: recovered from EXP-003 branch `experiment/looppilot-mmgh-exp-003` at `90177dad76d84dac5386bbd6e010e0c4a732aef4`.
2. Resume Validation: `MMGH-EXP-004-RESUME-001`, `validated-with-corrections`; stale Contract/Checkpoint wording was corrected before implementation.
3. Loaded recovery sources: `CHECKPOINT.md`, `CONTEXT-COMPACTION.md`, `RESUME-VALIDATION.md`, `PROJECT.md`, `LOOP-MAP.md`, EXP-003 Results/Scorecard, frozen LoopPilot protocol files, and current EXP-004 audit/mode/Contract/Ledgers.
4. User files: `.impeccable/live/config.json` and `PRODUCT.md` remained untracked, unread, unmodified, unstaged, and uncommitted.
5. EXP-004 branch: `experiment/looppilot-mmgh-exp-004`.
6. Baseline: Node `v24.12.0`, npm `11.17.0`, rustc/cargo `1.96.0`; lint/typecheck/unit/build/Rust/unified test passed; initial desktop MSI bundling hit WiX `light.exe`.
7. Storage domain map: Session, Knowledge Note, Reminder, Skill, Settings/Provider projection; all were audited, only one cache-result cluster was selected.
8. Web adapter map: React/App action -> `src/storage/agent.ts` runtime gate -> localStorage CRUD/CAS or Tauri invoke -> complete `WorkspaceSnapshot` -> React fulfilled-state commit.
9. Tauri/Rust map: Tauri invoke -> `src-tauri/src/cmd.rs` -> Rust db service -> `TransactionBehavior::Immediate` SQLite transaction -> Snapshot projection -> commit -> advisory cache -> returned Snapshot.
10. SQLite transaction map: action and projection run before commit; cache publication follows commit and is not durable authority after this correction.
11. Mutation/refresh semantics: Web returns only after checked local write; Rust returns the transaction-built Snapshot even if cache publication is poisoned; pre-commit errors remain failures.
12. Active selection: existing create/open/delete/default rules and React fulfilled-only commit remain unchanged; stale contextual active-session parity was explicitly deferred.
13. Error taxonomy: existing validation, not-found, storage, and conflict errors remain; cache poison is recovered as an advisory condition rather than surfaced as mutation failure.
14. Sensitive projection: client-facing `apiKey` remains blank and `hasApiKey` remains boolean; Settings/keyring code was untouched.
15. DTO differences: known Rust/Web `activeReminder` nullability and loose TS numeric ID/timestamp types remain pre-existing and excluded; no DTO or command changed.
16. Real gap: Rust commit followed by fallible cache lock publication could return `Err` after durable write, risking duplicate retry.
17. Rejected suspected gaps: cross-tab Web overwrite, stale contextual active session, active-reminder nullability, and Settings post-commit refresh were not safe bounded changes for this Loop.
18. Candidate clusters: post-commit cache result (selected), stale active session (deferred), active reminder DTO (deferred), Settings partial status (excluded/high risk).
19. Mode score: 21/28; dimensions and evidence are in `MODE-SELECTION.md`.
20. Full Loop hard triggers: transaction/partial-success, duplicate-retry risk, Data and Compatibility review, multiple Worker value, integration record, and recovery boundary.
21. Final mode: Full Loop.
22. Lightweight rejection: it would under-document commit-plus-error semantics and omit required specialist/independent evidence.
23. No-implementation stop reason: not applicable; the cache defect was reproduced as a real RED target.
24. Implementation objective: preserve committed authoritative Snapshot results when optional cache publication fails.
25. Grouping rationale: mutation result, transaction commit, cache publication, and React Snapshot commit are one acceptance boundary.
26. Included scope: bounded Rust cache guard, Web/Rust characterization, Deliveries, Integration, four Reviews, validation, Checkpoint, reports, authorized branch commits/push.
27. Excluded scope: schema/migration, DTO, commands, Settings/keyring, active policy, permissions, dependencies, UI, real data, release/deploy, and user files.
28. Task DAG: TASK-001 audit -> TASK-002 Web characterization and TASK-003 Rust characterization -> TASK-004 implementation -> TASK-005 integration/reviews -> TASK-006 closure/report.
29. Worker matrix: Frontend and Rust/Data audits with Supervisor fallback; independent Spec/Standards and Data/Compatibility reviewers; serial Supervisor implementation.
30. Worker actual output: useful read-only audits and poison approach; no fabricated file-backed Worker Delivery after 429/tool failures.
31. Modified files: `src-tauri/src/db.rs` (61 additions/10 deletions) and `src/storage/agent.test.ts` (12 additions/6 deletions); no package/lock change.
32. Data invariants: SQLite remains authoritative; pre-commit rollback and one-row cache-poison result are verified; cache is advisory; secrets remain sanitized.
33. Mutation/refresh contract: successful writes return one complete Snapshot; selected post-commit cache condition no longer rejects a committed mutation.
34. Active-selection contract: unchanged and tested by existing suites; no new selection/default behavior.
35. Error contract: pre-commit errors reject and preserve caller state; cache poison is diagnosed/recovered without duplicate retry.
36. RED/GREEN: Rust RED observed committed row plus `Err`; GREEN passes in both binaries with returned session Snapshot; Web characterization passes.
37. Integration: PASS, no semantic/mechanical conflict; record is `INTEGRATION-RECORD.md`.
38. Spec Review: independent PASS, no findings.
39. Standards Review: independent PASS, no findings.
40. Data Review: independent PASS, no findings; transaction/rollback/poison rerun.
41. Compatibility Review: independent PASS, no findings; Web/Rust DTO/error/selection/secret surfaces unchanged.
42. Security Review: N/A for this Loop; keyring and sensitive projection were unchanged and explicitly checked as invariants.
43. Findings: zero open or closed product Findings; the selected RED was not converted into a review Finding.
44. Rework: none; revision 1/2 used.
45. Three-layer Acceptance: Functional PASS, Engineering PASS, Delivery PASS for the experiment boundary.
46. Checkpoint/Handoff: `CHECKPOINT-004` updated through Implementation/Integration/Review/Closure projections; cross-session recovery remains unverified.
47. Full validation: `npm.cmd test` PASS, 84 frontend passed/3 skipped, Rust 43+51 passed/2 ignored; desktop final rerun PASS.
48. Desktop build: debug exe, two MSI locales, and NSIS bundle produced; no install/run claim.
49. Temporary/secret scan: temporary SQLite only, no real DB/credentials; scoped credential-like scan had no matches; generated artifacts unstaged.
50. Commit list: `62a7857 docs: establish MMGH EXP-004 storage mode decision`; `5a780a3 fix: preserve committed snapshot after cache poison`; `70aa7a4 test: report MMGH LoopPilot EXP-004`.
51. Push result: pending at this report boundary; only EXP-004 push is authorized.
52. Final HEAD: recorded in the post-push handoff because a commit cannot pre-record its own SHA.
53. Local/remote sync: recorded after authorized push; no master/merge/PR/tag/release/deploy/force push.
54. Final status: expected only the two preserved user files untracked; exact final status is reported after push.
55. Unverified content: whole MMGH refactor, real user DB, production transaction scale, real data size, long-term consistency, multi-process writes, crash recovery, real installer execution, macOS/Linux, release, deployment, user acceptance, exact token cost, strict A/B, automatic mode-selection accuracy, and general host compatibility.

## EXP-001 / EXP-002 / EXP-003 / EXP-004 Comparison

| Experiment | Risk type | Mode | Product files | Protocol/review shape | Findings/Rework | Main conclusion |
|---|---|---|---:|---|---|---|
| EXP-001 | Pure application policy | Full Loop | historical | Spec/Standards, formal Major/Rework | 1 Major, reworked | Governance had value but was heavy for a small pure policy extraction |
| EXP-002 | Single lifecycle cluster | Lightweight | historical | bounded plan, no formal Full Loop rework | 1 Minor, no formal rework | Better proportionality for one owner/one effect cluster |
| EXP-003 | Provider cross-runtime security | Full Loop | historical | four review axes, formal recovery rework | 1 recovery Major, reworked; 0 product | Specialist review and cross-layer integration added value |
| EXP-004 | Storage adapter/data consistency | Full Loop | 2 | four independent axes, two Worker fallbacks, no rework | 0 | Full Loop was proportionate to commit-plus-error and duplicate-retry risk |

Observed/inferred answers: the Storage Adapter risk did need Full Loop for the selected cluster; Data Review did not find a missed implementation defect but materially validated partial-success boundaries; Integration found no new TS/Rust inconsistency because the change was Rust-internal and test-only on Web; mutation/refresh distinction had direct value by separating durable commit from cache publication; multiple Workers supplied useful independent mapping but reliability was weak under 429s; audit, Contract, Integration, and Reviews were used, while Security and Rework artifacts were not triggered; Full Loop cost was material but more reasonable than EXP-003 because the product change was narrower; the mode heuristic is supported for this case but not enough to revise formal rules; no SQLite Migration experiment is recommended yet because no migration gap was selected.

## Cost, Proportionality, and Next Work

- Integrated-boundary diff: 22 tracked files and 711 added/305 deleted lines including protocol/audit artifacts; final report/review files are additional documentation. Product diff is 73 additions/16 deletions.
- Main validation wall times observed: `npm.cmd test` 23.7s; final desktop debug build 38.6s. Token usage: unavailable.
- Full Loop is recommended for future storage/security/schema/cross-runtime or commit-plus-error work; Lightweight remains appropriate for a single-runtime low-risk change.
- Do not enter SQLite Migration solely from this experiment. A separate authorized audit should first identify a real version/transaction defect.
- Do not update LoopPilot formal mode rules from four experiments alone; retain the heuristic and collect same-scope comparisons.

## Commit and Push Boundary

The review/report/closure commit and authorized EXP-004 push are recorded in the final handoff after they succeed. No master, merge, PR, tag, release, deployment, or force push is performed.
