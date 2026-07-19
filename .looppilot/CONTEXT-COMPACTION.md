# EXP-003 Active Loop Context Manifest

## Identity

- Manifest ID: `MMGH-EXP-003-COMPACTION-001`
- Checkpoint: `CHECKPOINT-003`
- Project ID: `MMGH-REFACTOR-EXP-003`
- Loop ID: `LOOP-004`
- Created: 2026-07-19
- Created by: Codex primary agent
- Manifest Status: `final`

## Current Objective

No implementation Task is active. Revalidate the final EXP-003 branch/remote boundary if a
new instruction resumes work. `FINDING-002` is closed after original Recovery Reviewer PASS
and must not be reopened without new evidence.

## Must Load

| Artifact | Source | Reason | Revalidate |
|---|---|---|---|
| latest user instruction | current input | scope/authority | yes |
| Checkpoint | `.looppilot/CHECKPOINT.md` | exact active Resume Point | yes |
| Project/Map | `.looppilot/PROJECT.md`, `LOOP-MAP.md` | scope/status | yes |
| Contract/Ledgers | `loops/LOOP-004/LOOP-CONTRACT.md`, `TASK-LEDGER.md`, `FINDING-LEDGER.md` | authority/dependencies | yes |
| active Task/Rework | `tasks/TASK-004*.md`, `tasks/TASK-005-R1.md` | implementation and recovery correction boundaries | yes |
| Deliveries/review/Finding | `deliveries/TASK-002/003/004`, `reviews/CHARACTERIZATION-REVIEW.md`, `reviews/FINDING-002.md` | evidence and open recovery Finding | yes |
| current Git/test state | repository tools | reality overrides stale docs | yes |

## Load On Demand

- Detailed Rust/TS source only for current diff or review conflict.
- Integration Record, review reports, Finding Detail, Rework Task, and Closure when each
  barrier becomes active.
- EXP-001/EXP-002 historical artifacts only for final comparison or contradiction.

## Must Not Load by Default

- Complete chat, private reasoning, large raw logs, unrelated source, generated artifacts,
  real user content/credentials, and inactive candidate Loop templates.

## Authoritative Sources

| State | Authority |
|---|---|
| Project scope | `PROJECT.md` |
| Loop status | `LOOP-MAP.md` |
| Task status | `loops/LOOP-004/TASK-LEDGER.md` |
| Finding status | `loops/LOOP-004/FINDING-LEDGER.md` |
| Recovery | `CHECKPOINT.md` |

## Compacted Facts

- FACT-001: EXP-002 boundary is `afa5540...`; source: resume validation; verified: yes.
- FACT-002: Candidate A has observed TS/Rust strict policy gaps; source: risk audit; verified: yes.
- FACT-003: characterization Deliveries approved; source: characterization review; verified: yes.
- FACT-004: TASK-004 is the only authorized implementation; source: Contract; verified: yes.
- FACT-005: fresh-context recovery found `FINDING-002`; TASK-005-R1 corrected the invalid HEAD
  and missing implementation inputs before Integration; source: Finding/Rework; verified: yes.
- FACT-006: Integration Barrier passed at `86427b8`; Loop-level review is active; source:
  Integration Record and Review Contract; verified: yes.
- FACT-007: Spec, Standards, Security, and Compatibility reviews passed; final validation and
  LOOP-004 Closure passed; source: review reports and Closure; verified: yes.

## Uncertainty and Rationale

- Token usage is unavailable; no estimate is made.
- Host-native cross-session recovery and Reviewer independence beyond this observed review
  remain unverified until actually exercised.
- This minimal set retains Scope, invariants, authority, open work, evidence, and one Resume Point.

## Authority Note

This manifest routes recovery context only. `CHECKPOINT.md`, Ledgers, Map, and Project remain
their respective authorities; this file cannot expand Scope, permissions, or status.
