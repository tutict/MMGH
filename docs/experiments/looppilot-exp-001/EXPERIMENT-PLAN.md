# EXP-001 Experiment Plan

## Identity and Objective

- Experiment ID: `EXP-001`
- Project: `MMGH-REFACTOR-EXP-001`
- Method: real-project observational Full Loop pilot, not a strict A/B experiment.
- Objective: determine whether frozen LoopPilot Phase 1–5 contracts can guide one useful,
  bounded MMGH refactor with honest evidence, independent review, and recoverable state.

MMGH is suitable because it is a real local-first React/Tauri/Rust product with multiple
user workflows, persistence/security boundaries, a passing quality chain, and an observable
application-composition risk. Full Loop is used because this pilot explicitly evaluates
contract barriers, Worker/Reviewer separation, ledgers, Closure, and Checkpoint—not because
every later MMGH change must use Full Loop.

## Baseline and Selected Loop

- Baseline commit: `e0a4953e0dfd69b7f21e3be7c190a11c95def43f`.
- Quality chain: all requested pre-change checks passed; details in
  `BASELINE-OBSERVATIONS.md`.
- Selected: `LOOP-001`, Workspace Snapshot Reconciliation Boundary.
- Expected code change: one pure application module, focused characterization tests, and
  replacement of the two existing App call sites after removing embedded policy code.

## Evaluation Questions

1. Was product/architecture understanding grounded in more than README?
2. Did Loop grouping prevent a whole-App rewrite?
3. Did `LOOP-001` create a real dependency/test boundary while preserving behavior?
4. Did independent review find a specific issue missed by Worker self-check, if one exists?
5. Was Rework effective if required?
6. Was documentation/review overhead proportional to this relatively small change?
7. Is the final Checkpoint sufficient for a later session to choose the next action?

## Metrics

Twenty scored dimensions (0–3) are defined in `EVALUATION-SCORECARD.md`: problem and
requirements understanding, grouping/rationale, scope/invariants, architecture/front-end/
runtime/security fitness, evidence/characterization/integration/review/Finding/Rework/
Closure/Checkpoint quality, context overhead, and human intervention count.

Engineering measurements: App lines/imports/hooks/responsibilities, new boundary modules,
tests, changed files/lines, validation duration/results, Worker revisions, Finding counts,
and manual decisions when reliably observable. Token usage is unavailable and will not be
estimated.

## Process and Expected Overhead

1. Preserve baseline evidence and approve the Contract before product code.
2. Use a serial conflict group: characterization Worker, then extraction Worker, then root
   integration. Multiple Workers will not concurrently edit `App.tsx`.
3. Run focused checks during work and the full frontend/Rust/desktop chain at integration.
4. Use independent Spec and Standards reviewers; specialist security/data review is not
   activated because storage, Provider, permissions, and schema are excluded.
5. Create Rework only for a concrete Finding; revision budget is two.

Expected overhead is material: contracts, deliveries, ledgers, two review reports,
integration/closure/checkpoint, and experiment reporting for a small code extraction. The
pilot measures whether the clarity/recovery evidence offsets that cost.

## Stop Conditions

- Any required behavior demands storage/schema/Provider/permission or product-scope change.
- Baseline or implementation reveals an unexplained failing required check.
- A Worker must edit outside its Task Contract, or shared-file conflict cannot be resolved.
- Two failed revisions of the same approach.
- Context pressure becomes critical before a minimal safe unit: persist Checkpoint and stop.
- User changes overlap the selected files or current authority is revoked.

## Limitations

- No Baseline/Lightweight/Full Loop three-branch comparison.
- One repository, one Loop, one host/session path, and a small refactor cannot establish
  universal LoopPilot compatibility or long-term maintenance/user-performance outcomes.
- Real cross-session recovery is unverified unless a later session actually validates it.
- No release/deployment/installer smoke, production migration, or user study is authorized.
