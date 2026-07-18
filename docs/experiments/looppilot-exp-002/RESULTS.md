# EXP-002 Results

## Outcome

EXP-002 completed one bounded Desktop Window Lifecycle Projection refactor in Lightweight
Mode. It exercised real persisted recovery from EXP-001, selected process depth before
implementation, moved Tauri lifecycle sequencing out of `App.tsx`, added six focused tests,
and preserved the existing Rust/event/storage/security contracts.

This result applies only to the selected MMGH boundary. It does not establish universal
LoopPilot host compatibility or prove that Lightweight is generally superior to Full Loop.

## Recovery Answers

1. Resume Validation succeeded as `validated-with-corrections` under validation ID
   `MMGH-EXP-002-RESUME-001`.
2. Recovery genuinely depended on the Checkpoint for its verified ancestor, authoritative
   sources, user-file exclusions, evidence gaps, authority, and exact decision point.
3. Nine manifest Must Load repository files were read, plus the compaction routing manifest;
   total MMGH recovery files read was 10. The latest instruction was a separate input.
4. Complete EXP-001 history was not read. Worker Deliveries, detailed Integration, full
   Reviews, closed Finding history, chat history, and unrelated source stayed unloaded.
5. Useful fields were repository/branch/ancestor, final-state owners, open work/Findings,
   user files, authority, evidence gaps, and one exact Resume Point.
6. Corrected fields: current HEAD was the anticipated documentation descendant `23ae024`
   of Checkpoint delivery boundary `64148b0`; the old pending decision was answered by the
   latest instruction; remote freshness was initially unverified.
7. Missing/redundant information: prior hashes for the two user files were absent, so their
   presence/exclusion is observed but byte identity cannot be proven. Full Deliveries and
   Review history were unnecessary for the decision.
8. Cross-session recovery is observed only for EXP-001 to EXP-002 decision recovery. A later
   authorized fetch succeeded and confirmed remote access; no general host claim follows.

## Audit and Mode Decision

The focused audit identified four candidates:

1. Desktop Window Lifecycle Projection.
2. Visibility and Focus Synchronization.
3. Reminder Timer and Alert Scheduling.
4. Bootstrap and Deferred Refresh.

Desktop Window Lifecycle Projection had the clearest independent acceptance boundary: one
initial native read, two related subscriptions, one projection owner, explicit App outputs,
and symmetric cleanup. Visibility/clock had competing browser/native event sources; reminder
scheduling combined timer, suppression, audio, navigation, async selection, and alert;
bootstrap/refresh crossed drafts, busy/loading refs, storage events, and transitions.

Mode score: **7/24** (`1,1,1,0,1,0,0,1,0,0,1,1` in the twelve declared dimensions).
Hard triggers: none. No React/Rust event contract, persistence, schema, security, multi-Worker,
specialist, cross-session implementation, data-loss, or complex integration trigger occurred.
Lightweight was selected before product implementation; Full Loop was rejected as
disproportionate for this single consumer-side stream.

## Delivered Boundary

- `src/application/useDesktopRuntime.ts` now owns Tauri availability, initial window state,
  window/lifecycle subscriptions, desktop projection state, equivalent-state reuse, error
  degradation, late-registration disposal, current output callbacks, and unlisten cleanup.
- `src/storage/tauri.ts` gives existing frontend desktop event payloads explicit types without
  changing event names, runtime data, commands, Rust, or permissions.
- `App.tsx` supplies two stable outputs: update App visibility and show the existing
  restored-from-tray notice. It no longer imports, sequences, or stores the Tauri lifecycle
  state machine.
- Web fallback stays unavailable/already-synced and registers no Tauri resources. Tauri keeps
  the existing initial read, two listeners, visibility calculation, restored notice, logs,
  and cleanup behavior.

This is more than line movement: App loses direct infrastructure imports, one state owner,
one lifecycle effect, listener ordering, disposal bookkeeping, and projection equality. The
new application boundary has typed inputs/outputs and public characterization tests.

## TDD and Implementation Evidence

- RED: `npm.cmd run test:unit -- src/application/useDesktopRuntime.test.tsx` exited 1 before
  collection because `./useDesktopRuntime` did not exist.
- First implementation run: 4/5 passed. The failure exposed callback-identity reconnection;
  the failure path reached 80,607 listener calls during the wait window.
- Correction: current callbacks moved behind refs and subscriptions remain mount-scoped.
- Lint then rejected render-time ref writes. Ref synchronization moved into a dedicated
  effect; focused tests, lint, and typecheck passed.
- Initial GREEN: 5/5 focused tests.
- Review correction added malformed-payload guard coverage; final focused result is 6/6.

The six tests cover Web fallback, initial Tauri sync, state/lifecycle events and explicit
outputs, equal-state identity reuse, contained read/listener failures, normal cleanup, late
subscription cleanup after unmount, and malformed-payload visibility preservation.

## Review

Review sources were the latest user specification, `CHANGE-CONTRACT.md`, `.eslintrc.cjs`,
`tsconfig.json`, and the fixed Git diff. No independent reviewer was used: repository
Lightweight constraints and the no-delegation decision made the two-agent review skill
disproportionate. The following verdicts are limited Supervisor self-review, not independent
evidence.

### Initial Fixed Boundary

- Boundary: implementation commit `8e871d4532004d7fe365a5a9c11bd1bccef4baf1`.
- Spec Verdict: correction required for one Minor behavior-preservation Finding.
- Standards Verdict: pass. Hook ownership, callback freshness, effect dependencies, async
  disposal, cleanup, TypeScript, test scope, dependency direction, and excluded security/data
  surfaces were acceptable.
- `LW-FINDING-001` (Minor): the extraction removed the original runtime type guard before
  updating App visibility, so a malformed event could emit `false` where the old consumer
  emitted no visibility update.

### Correction and Reverification

- Correction commit: `92dde3461fd4122ce808f45b0a9374c1e898919d`.
- The original guard was restored and a regression test added. No runtime contract or Scope
  changed.
- Final Spec Verdict: **pass** at `92dde34`.
- Final Standards Verdict: **pass** at `92dde34`.
- Open Blocker/Major/Minor Findings: zero.
- Mode escalation: no. One Lightweight Minor correction occurred; no Full Loop Rework Task
  was created.

Review therefore found one issue not identified by the implementer passes. Earlier callback
and ref-rule defects were found by characterization/lint during implementation, not Review.

## Final Validation

| Command/evidence | Final observed result |
|---|---|
| Focused lifecycle test | exit 0; 1 file, 6 passed |
| `npm.cmd run lint` | exit 0 in final unified chain |
| `npm.cmd run typecheck` | exit 0 in final unified chain |
| `npm.cmd run test:unit` | 18 files; 82 passed, 3 skipped |
| `npm.cmd run build` | exit 0; 1,004 modules |
| `npm.cmd run test:rust` | 88 passed, 2 ignored; 28 existing dead-code warnings in test build |
| `npm.cmd test` | exit 0; 23.6 seconds wall |
| `npm.cmd run build:desktop:debug` | exit 0; 36.7 seconds wall; app, two MSI locales, and NSIS produced |
| Desktop warning profile | 67 existing dead-code warnings in harness build |
| `git diff --check` | exit 0 at corrected review boundary |

Expected frontend stderr remained: mocked model-network fallback and corrupt-preview JSON
backup. Generated desktop bundles were not installed and are not committed. Package and
lockfile hashes match baseline; no dependency changed.

## Scope and Cost Comparison

| Measure | EXP-001 Full Loop | EXP-002 Lightweight |
|---|---:|---:|
| Product/runtime source files | 2 (`App`, snapshot module) | 3 (`App`, hook, typed adapter) |
| Test files/new tests | 1 / 5 tests | 1 / 6 tests |
| Product plus test diff | +660 / -309 | +413 / -143 |
| Product source diff excluding test | +479 / -309 | +208 / -143 |
| `App.tsx` lines before/after | 5,855 / 5,547 | 5,547 / 5,420 |
| Protocol/experiment files | 32 | 6 including this Results file |
| Protocol/experiment lines | 2,375 | 552 |
| Independent Reviewers | 2 axes, independently executed | 0; one Supervisor self-review with two axes |
| Findings | 1 Major | 1 Minor |
| Correction/Rework | 1 formal Rework plus reverification | 1 same-Change Minor correction plus reverification |
| Delegated Worker attempts | 1 successful test Worker; 2 implementation assignments produced no output; fallback | 0 delegated; one planned Supervisor implementation fallback |
| Material human intervention | 0 after brief | 1 permission confirmation; continue nudges changed no Scope |
| Final unified test wall | 21.583 s | 23.6 s |
| Final desktop build wall | 32.915 s | 36.7 s |
| Token usage | unavailable | unavailable |

EXP-002 process cost decreased sharply: six compact artifacts instead of 32 Full Loop
artifacts, no Ledgers/Deliveries/Integration/Closure tree, no delegated coordination, and one
Minor correction. The reduced review independence is a real tradeoff, not a hidden pass.

## Evaluation Scorecard

Scale: 0 absent/harmful, 1 weak/limited, 2 adequate/partial, 3 strong observed support.

| # | Metric | Score | Basis |
|---|---|---:|---|
| 1 | Resume accuracy | 3 | Git, sources, authority, and stale decision were reconciled |
| 2 | Checkpoint usefulness | 3 | Enabled bounded recovery without history replay |
| 3 | Compaction sufficiency | 3 | Must Load set preserved Scope, state, evidence, and authority |
| 4 | Mode-selection evidence | 3 | Twelve dimensions, candidates, and hard triggers recorded first |
| 5 | Mode-selection proportionality | 3 | Lightweight matched one low-risk consumer stream |
| 6 | Problem understanding | 3 | Owners, sources, cleanup, failures, and runtime differences mapped |
| 7 | Side-effect clustering quality | 3 | Four behavior clusters, not mechanical file splits |
| 8 | Scope discipline | 3 | Exactly four contracted code/test files; excluded surfaces unchanged |
| 9 | Runtime ownership clarity | 3 | Hook owns projection/resources; App owns explicit outputs |
| 10 | Cleanup correctness | 3 | Normal, failed, and late registration paths characterized |
| 11 | Web/Tauri compatibility | 2 | Automated/source evidence passes; interactive tray flow unverified |
| 12 | Test evidence honesty | 3 | RED, failed GREEN, lint failure, skips, stderr, and warnings retained |
| 13 | Characterization coverage | 3 | Six focused public-boundary cases cover declared contract |
| 14 | Architecture fitness | 3 | Small hook/adapter typing; no store, DI, class, or event framework |
| 15 | Review independence | 1 | Dual axes ran, but only as disclosed Supervisor self-review |
| 16 | Finding value | 2 | Review found one real but low-impact preservation gap |
| 17 | Rework effectiveness | 3 | One scoped guard/test correction passed reverification |
| 18 | Protocol artifact cost | 3 | Six-file budget met; no Full Loop tree |
| 19 | Execution coordination cost | 2 | No delegation overhead; permission interruption remained |
| 20 | Human intervention count | 2 | One material permission confirmation |
| 21 | Full validation quality | 3 | Focused, unified, Rust, Web, and desktop debug chain passed |
| 22 | Final result honesty | 3 | Review limitation and unverified runtime/platform claims disclosed |

Total: **60/66**. Token usage: unavailable; no estimate is made.

## Conclusions and Next Recommendation

Lightweight was proportionate for this observed single-cluster consumer refactor. The result
does not prove that all Runtime/Lifecycle changes should be Lightweight. The next candidate
is Visibility and Focus Synchronization, now that the native projection has a typed output;
it requires an explicit ordering policy across browser and desktop signals before selection.

Storage/Security/Schema work should default to Full Loop because it is expected to trigger
persistence, migration, secret/trust, React/Rust contract, specialist Review, rollback, and
potentially cross-session conditions. That is a mode recommendation, not evidence that such
a Full Loop has succeeded.

## Git and Remaining Limits

- Branch: `experiment/looppilot-mmgh-exp-002`.
- Decision commit: `86b08b804117d923c81a2922b8196500171e4d21`.
- Implementation commit: `8e871d4532004d7fe365a5a9c11bd1bccef4baf1`.
- Review correction commit: `92dde3461fd4122ce808f45b0a9374c1e898919d`.
- This Results commit and final push cannot self-record their own SHA; the observed final Git
  report records both. No master modification, merge, PR, tag, release, or deploy occurred.
- `.impeccable/live/config.json` and `PRODUCT.md` remain user-owned and excluded.

Unverified: the whole MMGH refactor, long-term maintainability, performance improvement,
real user experience, interactive tray/focus ordering, installer installation, macOS/Linux,
production data, release, deployment, automatic mode-selection accuracy, automatic Loop
grouping, automatic Reviewer selection, exact token cost, strict same-task A/B, general host
compatibility, and actual Storage/Security/Schema Full Loop effectiveness.
