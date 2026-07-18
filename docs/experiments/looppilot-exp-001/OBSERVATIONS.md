# EXP-001 Process Observations

## Observed Process

- The Supervisor first mapped product flows, ownership, state, persistence, security, tests,
  and release boundaries, then proposed four candidate Loops. File size was treated as a
  risk signal, not as the objective.
- `LOOP-001` grouped semantic equality and structural sharing for a complete workspace
  snapshot. App lifecycle, domain actions, storage/Tauri contracts, and release work were
  excluded because they have different side effects and acceptance boundaries.
- The Contract Barrier passed before the characterization Worker changed a test. The Test
  Worker delivered an expected RED caused only by the intentionally absent module.
- Two assigned implementation-agent attempts produced no artifact or blocker and were
  interrupted. The Supervisor disclosed a scoped Worker-role fallback and did not claim
  delegated implementation success. No Worker changed authoritative Ledgers.
- Integration kept the high-conflict App boundary serial. There were no mechanical file
  conflicts. One structural-type mismatch was observed, corrected, and retained in the
  Delivery rather than hidden.
- Independent Spec and Standards agents reviewed fixed commits. Spec passed. Standards found
  one Major protocol defect that the Integrator had missed: `review-ready` had been used as
  an undefined authoritative Task status after integration.
- The Supervisor created `TASK-004-R1`; the Integrator corrected only Task projection; the
  original Standards Reviewer reverified the correction and passed the Standards axis.

## Assumptions Changed by Evidence

- A broad App controller/ViewModel extraction was initially plausible, but the audit showed
  that it would mix lifecycle, domain, UI, and storage risks. The first Loop was narrowed to
  one pure state-transition policy.
- A large `App.tsx` did not justify a whole-file rewrite. The measured hook counts and direct
  domain/storage responsibilities support later work, while only the snapshot policy had a
  safe independent seam in this experiment.
- The large Rust database facade did not justify automatic DDD. Existing submodules,
  transactions, migrations, keyring rules, and tests supported preserving that boundary.
- Snapshot structural sharing was not treated as a performance optimization. It is preserved
  compatibility behavior; no profiling evidence supports a speed claim.

## Process Footprint and Cost

- The baseline/Contract commit added 18 protocol and experiment files with 1,095 insertions
  before product implementation.
- The implementation commit changed ten files with 892 insertions and 318 deletions,
  including required Deliveries/Integration state; product code itself was one 478-line
  module, one 181-line test, and a 309-line helper removal plus one import in `App.tsx`.
- Additional Review, Finding, Rework, Closure, scorecard, result, and recovery artifacts were
  required after implementation. This is substantial overhead for a small pure extraction.
- Full validation was repeated by Integrator and reviewers. The repetition increased cost
  but provided independent evidence and exposed the state-projection defect.
- Worker coordination was the largest avoidable process cost: two implementation-agent
  attempts yielded no files, forcing a disclosed Supervisor fallback.

## Controls That Produced Value

- Single-authority Map/Ledgers and the Contract Barrier constrained scope and made the
  Standards Finding objectively verifiable.
- Task DAG/conflict grouping prevented concurrent edits to `App.tsx`.
- RED/GREEN characterization, Worker Deliveries, and the Integration Record separated local
  implementation evidence from parent verification.
- Permanent Spec/Standards axes produced independent judgment. Finding, Rework, and original
  Reviewer reverification preserved the initial adverse decision instead of rewriting it.
- Closure and Checkpoint force explicit disclosure of missing UI/platform/release/user
  evidence and future authority.

## Controls With Little or No Direct Value Here

- Conditional Security, Data, Accessibility, and separate Architecture/Frontend reviewers
  were not activated because their risky boundaries did not change; Standards covered the
  small architecture/frontend surface.
- OOP, full DDD, DI frameworks, MVVM terminology, and zero-copy were evaluated but correctly
  rejected; they did not contribute implementation machinery.
- Budget Stop, Resume Validation, Cross-Loop Validation, Project-wide Acceptance, Release
  Readiness, and Final Release Delivery were not triggered by this delivery-only one-Loop
  experiment.
- No strict three-arm A/B experiment ran, so the process cannot quantify Full Loop's causal
  advantage over Baseline or Lightweight.

## Recovery and Tool Limits

- No LoopPilot Budget Stop occurred. The host compacted context during the same active task,
  but work continued from host-provided state rather than a fresh session restoring solely
  from the final Checkpoint. Real cross-session recovery therefore remains unverified.
- The final Checkpoint is statically understandable and defines one exact next action, but
  this is readiness evidence, not an observed recovery trial.
- Token usage is unavailable. Exact token cost must not be inferred from document size.
- Human intervention after the initial brief: 0. This is an observed count, not a claim that
  future Loops will require none.
