# EXP-003 Evaluation Scorecard

Scale: 0 absent/harmful, 1 weak, 2 adequate/partial, 3 strong observed support.
Each basis is labelled as observed, inferred, unmeasured, or not applicable.

| # | Metric | Score | Evidence and status |
|---:|---|---:|---|
| 1 | Resume accuracy | 3 | observed: recovery corrected the invalid HEAD and stale inputs, then original Reviewer passed revision 2/2 |
| 2 | Risk-audit quality | 3 | observed: three candidates mapped with source paths, invariants, tests, gaps, and limits |
| 3 | Candidate selection quality | 3 | observed: Provider selected at 20/24 from two reproducible gaps; Storage 19/24 and Migration 20/24 deferred |
| 4 | Full Loop justification | 3 | observed: cross-runtime security, sensitive configuration, specialist review, multiple Workers, and active Checkpoint triggered Full Loop |
| 5 | Grouping rationale | 3 | observed: default host and trailing-dot normalization are one policy invariant |
| 6 | Scope discipline | 3 | observed: product diff is limited to two policy files and focused tests; excluded surfaces unchanged |
| 7 | Cross-layer contract clarity | 3 | observed: Integration Record compares defaults, normalization, strict flags, URL outcomes, snapshots, DTOs, and storage |
| 8 | Security invariant quality | 3 | observed: Security Review PASS; no public HTTP, credential, query/fragment, keyring, log, or permission relaxation |
| 9 | Data invariant quality | 3 | observed: sanitization, journal/rollback, SQLite schema and migration paths unchanged; Data Review N/A |
| 10 | Frontend Worker value | 3 | observed: TypeScript characterization isolated the trailing-dot behavior and produced a target RED |
| 11 | Rust Worker value | 3 | observed: Rust characterization isolated the empty-default allowlist behavior and produced a target RED |
| 12 | Worker reliability | 2 | observed: Rust and implementation Workers delivered; first Frontend assignment returned 429 and a follow-up succeeded; one Compatibility context wrote its report before a final 429 |
| 13 | Integration value | 3 | observed: Integration Barrier compared semantic conflicts and preserved authority boundaries |
| 14 | Spec Review quality | 3 | observed: independent Spec Review PASS with explicit scope and unverified limits |
| 15 | Standards Review quality | 3 | observed: independent Standards Review PASS with focused code and evidence checks |
| 16 | Security Review quality | 3 | observed: independent Security Review PASS and explicit redirect/DNS/keyring limits |
| 17 | Data Review quality | N/A | not applicable: SQL/schema/persistence implementation was not changed; data invariants were still inspected |
| 18 | Finding specificity | 3 | observed: one Major recovery Finding identified stale hash, status, boundary, and resume inputs precisely |
| 19 | Rework effectiveness | 3 | observed: TASK-005-R1 corrected four recovery gaps in two bounded revisions; original Reviewer reverification PASS |
| 20 | Recovery rehearsal quality | 3 | observed: fresh-context rehearsal found a real defect; this is not evidence of a separate host session |
| 21 | Test evidence honesty | 3 | observed: target REDs, focused GREENs, full results, skips, warnings, and expected stderr are recorded |
| 22 | Secret-safety quality | 3 | observed: no key value read or emitted; scoped credential-like scan had no matches |
| 23 | Rollback quality | 3 | inferred from Contract/source: rollback is removal of two bounded policy changes and tests; no durable format changed |
| 24 | Protocol cost | 2 | observed: 24 tracked EXP-003 protocol/state files before final artifacts and 1,274 lines in the initial integrated diff; cost is material but justified by security/cross-runtime risk |
| 25 | Coordination cost | 2 | observed: multiple Workers and four review axes added coordination; one initial 429 required reassignment |
| 26 | Human intervention | 3 | observed: no scope-changing human intervention; user supplied continuation nudges only |
| 27 | Final closure honesty | 3 | observed: Closure retains unverified production, platform, runtime, token, and user-acceptance limits |

Total: **72/78** using N/A excluded from the denominator. Token usage: unavailable.

The score is evidence for this bounded experiment only. It does not establish universal
Full Loop superiority or host compatibility.
