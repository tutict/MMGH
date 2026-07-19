# EXP-004 Resume Validation

## Identity and Decision

- Validation ID: `MMGH-EXP-004-RESUME-001`
- Validation date: 2026-07-19
- Source boundary: verified EXP-003 final boundary
- Decision: `validated-with-corrections`
- Scope of decision: create EXP-004 from the observed EXP-003 final boundary, run a fresh
  baseline, then audit Web/Tauri storage contracts before approving any product change.

## Latest Instruction and Authority

- The latest instruction authorizes an EXP-004 experiment branch, required experiment
  artifacts, one evidence-backed Storage Adapter contract boundary, focused TypeScript/Rust
  tests, temporary SQLite, commits, and push of the EXP-004 branch.
- It permits an audit-only stop before the Contract Barrier when no safe worthwhile gap is
  observed.
- It does not authorize master changes, merge, PR, tag, release, deploy, force-push, real
  credential or user-database access, migration, permission expansion, important deletion,
  or modification of user-owned untracked files.

## Observed Git Reality

- Repository: `C:\Users\tutic\IdeaProjects\MMGH`
- Expected EXP-003 boundary: `90177dad76d84dac5386bbd6e010e0c4a732aef4`
- Actual pre-EXP-004 branch: `experiment/looppilot-mmgh-exp-003`
- Actual HEAD: `90177dad76d84dac5386bbd6e010e0c4a732aef4`
- EXP-004 branch: `experiment/looppilot-mmgh-exp-004`, created directly at that HEAD.
- Remote freshness: `git fetch origin experiment/looppilot-mmgh-exp-003` succeeded on
  2026-07-19 after the sandbox denied its first attempt to write `.git/FETCH_HEAD`.
- Remote-tracking ref equals actual HEAD; observed ahead/behind count: `0 0`.
- Tracked working tree was clean before this validation record.
- User-owned untracked files are `.impeccable/live/config.json` and `PRODUCT.md`; they remain
  unstaged and excluded. Their contents were not copied into experiment artifacts.
- No unknown user modification or unpushed EXP-003 commit was observed.

## Loaded Recovery and Protocol Sources

- Latest EXP-004 user instruction.
- `.looppilot/CHECKPOINT.md`, `.looppilot/CONTEXT-COMPACTION.md`, prior
  `.looppilot/RESUME-VALIDATION.md`, `.looppilot/PROJECT.md`, and `.looppilot/LOOP-MAP.md`.
- `docs/experiments/looppilot-exp-003/RESULTS.md` and `EVALUATION-SCORECARD.md`.
- No host-native LoopPilot Skill is installed in the exposed Skill catalog or inspected
  Codex/agent skill directories.
- Read-only fallback protocol: `C:\Users\tutic\IdeaProjects\LoopPilot` at frozen commit
  `c9e8b3ec71936f7f3b6ab21a2fc50d15f80f74ee`.
- Loaded fallback sources: `SKILL.md`, `AGENTS.md`, mode/state rules, Full Loop
  contract/Ledger rules, delivery/review/rework rules, recovery rules, and the engineering
  concern/reviewer rules covering Data and Compatibility review.

## Authority Sources and EXP-003 Closure

- Project Scope authority: `.looppilot/PROJECT.md`.
- Loop status authority: `.looppilot/LOOP-MAP.md`.
- EXP-003 Task/Finding authorities: `.looppilot/loops/LOOP-004/TASK-LEDGER.md` and
  `.looppilot/loops/LOOP-004/FINDING-LEDGER.md`.
- Recovery authority: `.looppilot/CHECKPOINT.md` until EXP-004 closure updates it.
- `LOOP-004` is closed in the authoritative Map; EXP-003 reviews, closure commits, final push,
  and the `90177da` post-push evidence commit are present.

## Conflicts, Corrections, and Invalidated Claims

- The old Checkpoint contains stale intermediate wording that final documentation and push
  still remained, while observable Git and EXP-003 Results show they completed. This stale
  projection is corrected by the observed `90177da` boundary and does not reopen LOOP-004.
- The first fetch failure was a sandbox write restriction, not remote unavailability; the
  approved fetch succeeded.
- No local or fetched remote EXP-004 branch existed before creation. A network-only
  `ls-remote` probe later failed for missing Windows credentials; push will detect any unseen
  remote collision without force.
- The existing `LOOP-004` ID is historical Provider work and cannot be reused. If Full Loop
  is selected, the next real Loop ID must be derived from the Map, not assumed from EXP-004.
- No Scope, Finding severity, risk acceptance, or permission is changed by validation.

## Exact Next Action

Run the complete fresh pre-change baseline on `experiment/looppilot-mmgh-exp-004`, then audit
the actual Storage Adapter call chains before selecting Lightweight, Full Loop, or no
implementation. Stop before product changes on unexplained baseline failure, user-file
overlap, unauthorized scope, or absence of an evidence-backed candidate.

Recovery is `validated-with-corrections`.
