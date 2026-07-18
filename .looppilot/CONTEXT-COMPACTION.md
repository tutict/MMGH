# EXP-001 Context Compaction

## Purpose

Restore the closed experiment boundary and make one later LOOP-002 decision without loading
the full prior conversation or treating historical authority as current.

## Must Load

Load only:

1. the latest user instruction for the resumed task;
2. `.looppilot/CHECKPOINT.md`;
3. `.looppilot/PROJECT.md`;
4. `.looppilot/LOOP-MAP.md`;
5. `.looppilot/loops/LOOP-001/LOOP-CONTRACT.md`;
6. `.looppilot/loops/LOOP-001/TASK-LEDGER.md` and `FINDING-LEDGER.md`;
7. `.looppilot/loops/LOOP-001/LOOP-CLOSURE.md`;
8. `docs/experiments/looppilot-exp-001/RESULTS.md` and
   `EVALUATION-SCORECARD.md`.

Load the detailed Integration Record, Deliveries, or Review reports only if current Git
revalidation contradicts Closure, a Finding is reopened by new evidence, or a new Contract
needs an exact prior invariant. Inspect only code relevant to the new bounded decision.

## Must Not Assume or Load by Default

- Do not load the complete historical chat, all repository code, all old Deliveries/Reviews,
  or the full LoopPilot repository.
- Do not restore a cancelled or narrowed task, reopen LOOP-001 without new observed evidence,
  or infer permission to implement LOOP-002.
- Do not assume MMGH is fully refactored, other candidate Loops are approved, Windows bundles
  were installed, cross-session recovery was observed, or release/deployment is authorized.

## Compressed State

- EXP-001 executed one Full Loop only. LOOP-001 extracted the pure workspace-snapshot
  reconciliation policy from `App.tsx`, added five focused tests, passed the full quality
  chain and Windows debug packaging, passed Spec Review, and passed Standards Review after
  one Major state-projection Finding and scoped Rework.
- The delivery boundary `64148b0d9eab0249ae7260c4ed109fa27bf4b8f7` was pushed to the
  experiment remote branch. The final closing-projection commit is a documentation-only
  descendant and must be resolved from Git on resume.
- Two untracked user artifacts were preserved: `.impeccable/live/config.json` and
  `PRODUCT.md`.
- Full Loop showed useful scope/review governance but high context/document overhead. Default
  recommendation is Lightweight for small single-owner changes; Full Loop remains suitable
  for cross-runtime/storage/security or multi-role risks.

## Single Resume Point

Use only `LOOP-002-CONTRACT-DECISION` from `.looppilot/CHECKPOINT.md`. Revalidate Git first;
then the Supervisor either stops or starts a new Contract Barrier. No implementation action
is implied.
