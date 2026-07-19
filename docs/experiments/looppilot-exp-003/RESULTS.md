# EXP-003 Results

## 54-Point Final Report

1. **Recovery-start branch/HEAD (observed):** `experiment/looppilot-mmgh-exp-002` at
   `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`.
2. **EXP-002 expected boundary (observed):** local/remote final boundary was
   `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`.
3. **Resume Validation (observed):** `MMGH-EXP-003-RESUME-001`, `validated`.
4. **Loaded files (observed):** repository `AGENTS.md`, `SKILL.md`, validation/protocol
   references, `.looppilot/RESUME-VALIDATION.md`, Checkpoint/Manifest, project/map/ledgers,
   EXP-002 Results/Mode Selection, the EXP-003 risk audit/selection, Loop Contract/tasks,
   Deliveries/reviews/Integration, current source/tests, and the latest user instruction.
5. **Workspace/user state (observed):** only the two pre-existing user files remain untracked;
   both were preserved, not read into reports, staged, modified, or deleted.
6. **EXP-003 branch (observed):** `experiment/looppilot-mmgh-exp-003`.
7. **Fresh baseline (observed):** lint/typecheck pass; 82 frontend tests/3 skips; Web 1004
   modules; Rust 88/2 ignored; unified test and desktop debug build pass; package/lock hashes
   recorded in OBSERVATIONS.
8. **Three-candidate audit (observed):** Provider 20/24 with two gaps; Storage 19/24 with no
   safe isolated defect; Migration 20/24 with no safe schema change.
9. **Real gaps (observed):** Rust strict mode rejected the default OpenAI host when its list
   was empty; TypeScript failed to canonicalize DNS trailing dots.
10. **Rejected suspected gaps (observed/inferred):** Storage adapter CRUD/fallback/refresh and
    SQLite migration/version/foreign-key/rollback paths showed no safe bounded defect; redirect,
    DNS rebinding, live keyring, and real provider behavior remain unverified rather than fixed.
11. **Candidate scores (observed):** A 20/24, B 19/24, C 20/24.
12. **Full Loop hard triggers (observed):** TypeScript/Rust contract, sensitive provider
    configuration, network-security policy, Web/Tauri parity, Security/Compatibility reviews,
    multiple Workers, integration, and active recovery Checkpoint.
13. **Implementation approval (observed):** Contract Barrier passed; one bounded Provider
    parity implementation was approved.
14. **No-implementation stop reason:** not applicable; audit found two reproducible isolated
    gaps. No schema/storage change was forced.
15. **Loop Objective (observed):** align strict trusted-host decisions while preserving URL,
    API-key, storage, data, and permission invariants.
16. **Grouping Rationale (observed):** default trusted set and host canonicalization are one
    cross-runtime policy invariant.
17. **Included Scope (observed):** two provider policy files, focused tests, Full Loop
    artifacts, reviews, recovery, validation, and experiment results.
18. **Excluded Scope (observed):** keyring lifecycle, requests, redirects/timeouts, storage,
    SQL/schema/migration, DTO/commands, UI, dependencies, capabilities, real data/network,
    release/deploy, and user files.
19. **Task DAG (observed):** TASK-001 audit/contract; TASK-002 TS characterization; TASK-003
    Rust characterization; TASK-004 implementation; TASK-005 integration/review/rework;
    TASK-006 validation/closure/report.
20. **Worker Matrix (observed):** Frontend Contract Worker, Rust Contract Worker, one serial
    Implementation Worker, independent characterization reviewer, and four Loop reviewers.
21. **Worker output (observed):** TS/Rust target REDs, implementation GREENs, Deliveries,
    reviews, and no unauthorized files.
22. **Worker fallback (observed):** first Frontend assignment returned 429 and follow-up
    succeeded; Compatibility report was written before a final 429, then inspected.
23. **Modified files (observed):** `src/security/provider.ts`,
    `src/security/provider.test.ts`, `src-tauri/src/db/settings.rs`, focused tests in
    `src-tauri/src/db.rs`, plus authorized protocol/experiment artifacts.
24. **TS/Rust contract (observed):** same default host, trailing-dot normalization, strict
    truthy semantics, exact/subdomain matching, and unchanged URL rejection rules.
25. **Security invariants (observed):** no public HTTP, credential, query/fragment, keyring,
    log, capability, or permission relaxation.
26. **Data invariants (observed):** API-key snapshots remain blank/sanitized; SQLite schema,
    transactions, journal, rollback, and key migration code are unchanged.
27. **RED/GREEN (observed):** TS target was 7/8 before fix and 8/8 after; Rust default-host
    target was 0/1 before fix and Provider focused suite 6/6 after.
28. **Integration Record (observed):** `LOOP-004-INTEGRATION-001`, Integration Barrier PASS,
    semantic differences resolved without mechanical conflict.
29. **Spec Review (observed):** independent PASS.
30. **Standards Review (observed):** independent PASS.
31. **Security Review (observed):** independent PASS; redirect/DNS/keyring limits retained.
32. **Data/Compatibility Review (observed):** Data Review N/A; independent Compatibility
    Review PASS with DTO/storage/command surfaces unchanged.
33. **Findings (observed):** one Major recovery Finding, closed; zero open product Findings.
34. **Rework (observed):** TASK-005-R1 corrected four stale recovery fields in two revisions.
35. **Reviewer reverification (observed):** original Recovery Reviewer PASS revision 2/2;
    task and Loop review axes PASS.
36. **Active recovery rehearsal (observed):** fresh-context Checkpoint rehearsal found and
    corrected a real recovery defect.
37. **Fresh-context vs cross-session (observed):** the rehearsal used a new review context in
    the same host/session; separate cross-session host recovery remains unverified.
38. **Three-layer Acceptance (observed):** Functional PASS, Engineering PASS, Delivery PASS
    for the experiment boundary.
39. **Loop Closure (observed):** `LOOP-CLOSURE.md` records accepted-for-experiment, not whole
    project completion.
40. **Checkpoint (observed):** CHECKPOINT-003 was corrected and updated through review/closure
    boundary; final projection is revalidated before push.
41. **Full validation (observed):** all required commands passed after integration.
42. **Desktop build (observed):** debug build passed and produced app/MSI/NSIS artifacts;
    artifacts were not installed or committed.
43. **Secret/temporary scan (observed):** no credential-like literal matched in scoped source,
    state, and EXP-003 docs; generated `dist`/`target` remained untracked/ignored.
44. **EXP comparison:** see table below.
45. **Full Loop cost (observed/inferred):** material but proportionate to this security and
    cross-runtime boundary; not justified for every low-risk edit.
46. **Rules with value (observed):** Contract Barrier, independent characterization, Integration
    Record, role authority, Finding/Rework/Reverification, and Checkpoint recovery caught real
    cross-layer and state defects.
47. **Rules with no direct value (observed):** Data Reviewer was N/A; schema migration,
    production network, release/deploy, and cross-session recovery were not triggered.
48. **Next MMGH recommendation (inferred):** use Full Loop for future storage/security/schema or
    cross-runtime work; use Lightweight for a single-runtime, low-risk, independently testable
    change.
49. **Commits (observed):** `ba5dc32` baseline artifacts; `bd3ab1c` parity fix and task evidence;
    `86427b8` integration boundary; final documentation/state commit(s) are recorded by the
    final Git report after staging.
50. **Push result:** recorded as observed in the final Git report after authorized EXP-003 push;
    no master/merge/PR/tag/release/deploy action was performed.
51. **Final HEAD:** recorded as observed in the final Git report after the final documentation
    projection commit.
52. **Local/remote sync:** recorded as observed by `git rev-list --left-right --count` after
    push; expected `0 0`, with no inference used.
53. **Final `git status --short`:** user files remain untracked and excluded; exact output is
    recorded after the final push.
54. **Unverified content:** whole-MMGH refactor, long-term security, real attacks, penetration
    testing, real keys/paid Provider, production DB/migration, installer installation,
    macOS/Linux, release/deployment, exact token cost, same-task A/B, automatic mode/Worker
    selection, general host compatibility, and real user acceptance.

## EXP-001 / EXP-002 / EXP-003 Comparison

| Measure | EXP-001 | EXP-002 | EXP-003 |
|---|---|---|---|
| Mode | Full Loop | Lightweight | Full Loop |
| Risk class | Pure application policy | Single lifecycle cluster | Storage/Provider Security/Cross-runtime |
| Product files | observed historical data | observed historical data | 4 touched product/test files |
| Protocol files | 32 | 6 | observed 24 before final artifacts; final count is recorded by Git report |
| Protocol lines | 2,375 | 552 | observed 1,274 before final artifacts |
| Review independence | yes, 2 axes | no | yes, Spec/Standards/Security/Compatibility |
| Findings | 1 Major | 1 Minor | 1 Major recovery, 0 product |
| Formal Rework | yes | no | yes, TASK-005-R1 |
| Worker attempts | observed historical data | 0 | Frontend retry after 429, Rust, implementation, and review contexts |

## Conclusion

EXP-003 produced real engineering value: it found and corrected a TypeScript/Rust provider
policy disagreement, and its recovery rehearsal found a separate authoritative-state defect.
The evidence supports selective Full Loop use for storage/security/schema/cross-runtime work.
It does not show that Full Loop is universally superior, that MMGH is production-secure, or
that the entire MMGH refactor is complete.

Token usage: unavailable.
