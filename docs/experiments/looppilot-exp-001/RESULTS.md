# EXP-001 Results

## Result Summary

EXP-001 completed one bounded, behavior-preserving architecture Loop. It demonstrates that
the frozen LoopPilot protocol can constrain a real MMGH change, collect independent evidence,
and drive a discovered Major process defect through scoped Rework. It does not demonstrate
completion of the MMGH refactor or general superiority of Full Loop.

## Evaluation Questions

1. **Why this first Loop?** Snapshot reconciliation was a coherent pure policy embedded in
   the composition root, used by two paths, safely characterized without storage or UI
   change, and independently acceptable within the available budget.
2. **Did the Grouping Rationale hold?** Yes for the observed boundary. Equality and merge
   jointly enforce one identity invariant; lifecycle, domain actions, adapters, and release
   checks remained separate without leaving the delivered module unusable.
3. **What engineering value was produced?** `App.tsx` no longer owns the policy; one typed
   pure module with five behavior tests provides an explicit application boundary. The App
   remains the only state owner and both existing call paths are unchanged.
4. **Was unnecessary abstraction added?** No meaningless class, state store, DI framework,
   controller pass-through, or third-party equality dependency was introduced. The new
   module exposes one operation and keeps its mechanics private.
5. **Was user behavior preserved?** Source parity, focused tests, full frontend/Rust suites,
   Web build, and Tauri debug packaging support bounded preservation. Interactive use,
   installer execution, and real user acceptance were not performed.
6. **What did Reviewer find?** Standards found a Major mismatch between the authoritative
   Task Ledger and the observed integration: `review-ready` was not an allowed lifecycle
   state. The implementation itself passed both reviewers' technical/spec checks.
7. **What did Worker/Integrator self-review miss?** The Integrator had conflated review
   readiness with Task status. Worker evidence could not catch this parent-state defect and
   did not claim authority to do so.
8. **Was Rework effective?** Yes. `TASK-004-R1` changed only the Ledger projection, kept
   readiness separate, preserved original judgment/severity, and passed original Reviewer
   reverification in one of two allowed revisions.
9. **What was the documentation cost?** High relative to a small pure extraction. Contracts,
   Ledgers, Deliveries, independent reports, Rework, Closure, recovery, and experiment files
   materially exceed the product-code delta. The cost bought traceability and a real Finding,
   but would be disproportionate for many routine low-risk edits.
10. **Which rules were actually used?** Project/Loop scope sources, Contract Barrier, Task
    DAG and conflict group, role authority, TDD RED/GREEN, Deliveries, Integration Barrier,
    permanent dual-axis review, Finding Ledger, scoped Rework, Reviewer reverification,
    three-layer acceptance, Closure, Checkpoint, compaction, and explicit Git authority.
11. **Which rules added no clear direct value?** Extra specialist reviews, Budget Stop,
    Resume Validation, Cross-Loop Validation, release/deployment protocols, complete DDD,
    OOP, framework DI, MVVM layering, and zero-copy were not needed or not triggered.
12. **What should the next Loop be?** `LOOP-002`, App Shell Runtime and Lifecycle
    Orchestration, after a new Contract Barrier narrows one side-effect cluster and adds
    characterization for loading/error/deferred-sync behavior. No implementation is
    automatically authorized by this result.
13. **Full Loop or Lightweight next?** Default to Lightweight for a bounded single-owner
    extraction. Use Full Loop for `LOOP-002` only if planning confirms multiple lifecycle
    effects, cross-runtime risk, multiple Workers, or recovery/review needs that justify the
    overhead. Storage/security/schema work in `LOOP-004` is a stronger Full Loop candidate.
14. **What remains unverified?** Whole-project completion, all candidate Loops, long-term
    maintainability, performance or UX improvement, production migration, release/deploy,
    installer execution, macOS/Linux, automated grouping/reviewer selection, real
    cross-session recovery, strict A/B results, exact tokens, user acceptance, and universal
    named-host compatibility.

## Measured Engineering Delta

- Baseline/final `App.tsx`: 5,855 / 5,547 lines; state/effect/callback/memo counts unchanged.
- New product boundary: `src/application/workspaceSnapshot.ts`.
- New focused tests: five, all passing after the expected pre-implementation RED.
- Integrated frontend result: 17 files, 76 passed, 3 skipped.
- Integrated Rust result: 88 passed, 2 ignored.
- One Major Finding, one successful Rework revision, zero open Findings.
- No package/lockfile, storage, Rust, SQLite, security, permission, or release-path change.

## Conclusion

Full Loop produced real governance value in EXP-001: it limited a tempting broad rewrite,
made behavior and authority explicit, and enabled an independent Reviewer to find a closure-
relevant defect. Its overhead was also clearly high. The defensible conclusion is selective
use based on risk, not universal adoption.
