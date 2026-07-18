# EXP-002 Resume Validation

## Identity and Decision

- Validation ID: `MMGH-EXP-002-RESUME-001`
- Validation date: 2026-07-18
- Source Checkpoint: `.looppilot/CHECKPOINT.md` (`EXP-001 Checkpoint`)
- Decision: `validated-with-corrections`
- Scope of decision: EXP-001 to EXP-002 decision recovery only.

## Latest Instruction and Authority

- The latest user instruction explicitly authorizes a new EXP-002 branch, one bounded
  Runtime/Lifecycle change, experiment records, tests, commits, and push of that branch.
- It does not authorize master changes, merge, PR, tag, release, deployment, force-push,
  important deletion, installer execution, or changes to the two user-owned untracked files.
- Current authority supersedes the Checkpoint's pending choice between stopping and drafting
  a later contract; it does not reopen `LOOP-001` or expand release/deploy authority.

## Observed Git Reality

- Repository: `C:\Users\tutic\IdeaProjects\MMGH`
- Expected EXP-001 final HEAD from the latest instruction:
  `23ae0246c0fee309a728eb6c1c1dbaba8f50435d`
- Actual branch before EXP-002 creation: `experiment/looppilot-mmgh-exp-001`
- Actual HEAD: `23ae0246c0fee309a728eb6c1c1dbaba8f50435d`
- Checkpoint delivery boundary: `64148b0d9eab0249ae7260c4ed109fa27bf4b8f7`
- Ancestry: observed; `64148b0` is an ancestor of actual HEAD.
- Local remote-tracking ref: `origin/experiment/looppilot-mmgh-exp-001` at actual HEAD;
  observed ahead/behind count `0 0`.
- Remote freshness: unverified. The authorized fetch did not execute because host approval
  infrastructure was unavailable; no network result is claimed.
- Tracked working tree: clean; `git diff --check` exited 0.
- User-owned untracked files: `.impeccable/live/config.json` and `PRODUCT.md`; both exist and
  remain excluded. Their byte-for-byte continuity is unverified because EXP-001 recorded no
  prior hashes.

## Authoritative Sources and Referenced Artifacts

- Project status: `.looppilot/PROJECT.md` (`experiment-complete`).
- Loop status: `.looppilot/LOOP-MAP.md`; `LOOP-001` is `closed`, later Loops are candidates.
- Scope and acceptance: `.looppilot/loops/LOOP-001/LOOP-CONTRACT.md` and
  `LOOP-CLOSURE.md`.
- Task/Finding status: the current `TASK-LEDGER.md` and `FINDING-LEDGER.md`; no open Task,
  Blocker, Major, or other Finding remains.
- Experiment interpretation: `docs/experiments/looppilot-exp-001/RESULTS.md` and
  `EVALUATION-SCORECARD.md`.
- Recovery authority: `.looppilot/CHECKPOINT.md`; the compaction manifest owns routing only.

## Skills and Capabilities

- No host-native LoopPilot Skill was exposed in the current Skill catalog.
- Read-only fallback used: `C:\Users\tutic\IdeaProjects\LoopPilot` at frozen baseline
  `c9e8b3ec71936f7f3b6ab21a2fc50d15f80f74ee`.
- Observed local capabilities: PowerShell, Git, repository read/write, and host-native Plan.
  Node/npm and Rust/cargo availability require the fresh EXP-002 baseline checks.
- Reviewer independence is not assumed; it must be observed or disclosed during Review.

## Conflicts, Corrections, and Invalidated Claims

- Corrected: the Checkpoint records `64148b0` as the pushed delivery boundary, while actual
  HEAD is the expected documentation-only descendant `23ae024`; the Checkpoint explicitly
  required this resolution, and ancestry plus the closing-only file delta were observed.
- Corrected: the old Exact Resume Point requested a decision; the latest instruction now
  supplies that decision and authorizes the bounded EXP-002 experiment.
- Corrected: local remote-tracking parity is observed, but current remote parity is not
  claimed without a successful fetch.
- Invalidated: the historical statement that cross-session recovery had not been exercised.
  This session exercised persisted recovery for the bounded EXP-001 to EXP-002 decision.
- No Scope, Finding severity, risk acceptance, or permission was changed by validation.

## Resume Point Validity

- The Checkpoint identified a stable Git boundary, authoritative files, exclusions,
  permissions, one exact decision point, and evidence gaps. It was actionable.
- The latest instruction answered that decision without requiring complete EXP-001 history.
- Resume is valid for creating EXP-002 from actual HEAD and then running a fresh baseline,
  focused Runtime/Lifecycle audit, and pre-implementation Mode Selection Gate.
- Stop if branch creation would overwrite existing work, baseline fails without attribution,
  or audit shows the selected boundary requires a hard Full Loop trigger.
