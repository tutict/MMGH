# EXP-001 Evaluation Scorecard

Experiment: `EXP-001`
Scale: 0 absent/harmful; 1 weak or disproportionately costly; 2 adequate/partial;
3 strong observed support.
Assessment boundary: one completed `LOOP-001`, not the whole MMGH refactor.

## Scores

| # | Metric | Score | Evidence class | Basis |
|---|---|---:|---|---|
| 1 | Problem understanding | 3 | observed | Audit maps the user, product flows, React/Tauri/Rust/data/security/release boundaries. |
| 2 | Requirement coverage | 3 | observed | Contract, Deliveries, reviews, Closure inputs, and experiment artifacts trace the bounded request. |
| 3 | Loop grouping quality | 3 | observed for this Loop | One semantic snapshot policy formed an independently testable and committable boundary. |
| 4 | Grouping rationale quality | 3 | observed | Contract explains why equality and merge stay together and why lifecycle/domain/storage work stays out. |
| 5 | Scope discipline | 3 | observed | Exactly one candidate Loop ran; no UI, storage, Rust, schema, dependency, or release change entered the diff. |
| 6 | Business invariant identification | 3 | observed | Seven reconciliation invariants were specified, implemented with source parity, and independently reviewed. |
| 7 | Architecture fitness | 3 | observed | App now depends on one pure application policy module with no framework or infrastructure dependency. |
| 8 | Frontend responsibility separation | 2 | observed | One real policy left `App.tsx`; the wider composition root remains intentionally large and coupled. |
| 9 | Storage/runtime boundary clarity | 2 | observed/inferred | Audit clarified Web/Tauri ownership and the refactor preserved it, but this Loop did not improve the adapter contract. |
| 10 | Security preservation | 3 | observed/inferred | No security/storage/runtime path changed; existing frontend/Rust security tests passed. No live keyring/network test ran. |
| 11 | Test evidence honesty | 3 | observed | RED, intermediate type failure, skips, expected stderr, build limitations, and final passes were all retained. |
| 12 | Characterization coverage | 2 | observed | Five public-boundary cases cover representative identity behavior, not every comparator-field mutation. |
| 13 | Integration quality | 3 | observed | Deliveries were collected in order, conflict ownership stayed serial, and the full quality chain passed. |
| 14 | Review independence | 3 | observed | Separate Spec and Standards agents inspected a fixed commit boundary and reran checks independently. |
| 15 | Finding specificity | 3 | observed | FINDING-001 names evidence, expected/actual state, risk, required outcome, and verification method. |
| 16 | Rework effectiveness | 3 | observed | Scoped Rework corrected only authoritative projection; the original Reviewer verified it and no product scope changed. |
| 17 | Closure honesty | 3 | observed | Closure distinguishes automated/source evidence from UI, installer, platform, migration, release, and user gaps. |
| 18 | Checkpoint completeness | 2 | observed/static | Recovery inputs and one exact Resume Point are recorded, but no real cross-session recovery was exercised. |
| 19 | Context overhead | 1 | observed | Protocol/review artifacts and repeated coordination materially exceed the small code extraction; two Worker attempts produced no output. |
| 20 | Human intervention count | 3 | observed | Zero user interventions were required after the initial experiment brief. |

Total: **54/60**.

## Interpretation

The result supports Full Loop for bounded work where authority, recovery, or independent
risk judgment matters. It does not establish that Full Loop is cost-effective for every
small refactor: this Loop's process footprint was substantially larger than its product-code
change. A future controlled Baseline/Lightweight/Full Loop comparison is required before
making a general efficiency claim.

Token usage: unavailable. Exact token cost was not measured and is excluded from the score.

## Measurement Limits

- `App.tsx` changed from 5,855 to 5,547 lines; hook counts were unchanged. This is a boundary
  indicator, not proof that fewer lines are inherently better.
- Five new tests passed; the repository total became 76 passed and 3 skipped across 17
  frontend files. Rust remained 88 passed and 2 ignored.
- Findings: one Major, zero Blocker/Minor/Suggestion. One scoped Rework revision was used.
- Automated Loop grouping quality and automated Reviewer selection quality were not tested;
  the Supervisor made both decisions using repository evidence.
