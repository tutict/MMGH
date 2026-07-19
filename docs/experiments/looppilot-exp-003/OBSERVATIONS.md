# EXP-003 Observations

## Recovery and Boundary

- Observed starting boundary: `experiment/looppilot-mmgh-exp-002` at
  `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`; local and remote matched after a bounded
  read-only fetch retry.
- Observed EXP-003 branch: `experiment/looppilot-mmgh-exp-003`.
- Observed Resume Validation: `MMGH-EXP-003-RESUME-001`, decision `validated`.
- Observed user files preserved and excluded: `.impeccable/live/config.json` and `PRODUCT.md`.
- A fresh-context recovery rehearsal observed an invalid Checkpoint hash and four stale/missing
  recovery fields. `FINDING-002` was Major, TASK-005-R1 corrected it in revision 2/2, and the
  original Recovery Reviewer returned PASS. This was a fresh-context rehearsal, not a proven
  cross-session host recovery.

## Baseline and Audit

- Fresh baseline observed: Node `v24.12.0`, npm `11.17.0`, rustc/cargo `1.96.0`.
- Baseline package SHA256: `2C7ACA962E08593A470940A3A57C28FD585A519C80A4FE0B7C61380E50271AF5`.
- Baseline lock SHA256: `60C5E0DD9E7B01C30B1855546617A1455DA3F112C2348960FCBF0D951396BC91`.
- Baseline observed: lint, typecheck, 82 frontend tests/3 skips, 1004-module Web build,
  Rust 88 tests/2 ignored, unified test, and desktop debug build passed.
- Candidate A Provider Security scored 20/24 and exposed two reproducible gaps: Rust's empty
  strict allowlist rejected the TypeScript default OpenAI host, and TypeScript retained a DNS
  trailing dot that Rust removed.
- Candidate B Storage scored 19/24; no safe bounded product defect was isolated.
- Candidate C Migration scored 20/24; existing schema/version/transaction tests were adequate
  for this audit and no schema change was authorized.

## Workers, Reviews, and Integration

- Frontend Contract Worker added TypeScript characterization and a target RED. Its first
  assignment returned 429; a follow-up delivered the scoped result.
- Rust Contract Worker added Rust characterization and a target RED.
- Implementation Worker made the single approved parity change: TypeScript strips repeated
  trailing DNS dots; Rust supplies `api.openai.com` only when configured hosts are empty.
- Independent characterization, TASK-004, Spec, Standards, Security, and Compatibility
  reviews all recorded PASS. The Compatibility context wrote its report before a final 429;
  the report was independently inspected and contains the PASS decision.
- Integration Record reports no mechanical conflicts, resolves the two semantic policy
  differences, and records the Integration Barrier as PASS.

## Final Validation

- Observed final frontend: lint and typecheck exit 0; 18 files, 84 passed and 3 skipped;
  Web build transformed 1004 modules.
- Observed final Rust: `npm.cmd run test:rust` exit 0; first binary 42 passed/1 ignored and
  second binary 50 passed/1 ignored. Existing dead-code warnings remained.
- Observed `npm.cmd test` exit 0 and `npm.cmd run build:desktop:debug` exit 0. Desktop produced
  the app, two MSI locales, and an NSIS bundle; it was not installed.
- Expected stderr remained limited to mocked model-network fallback and corrupt preview JSON
  backup in existing tests.
- Observed `git diff --check` exit 0. A scoped credential-like literal scan found no matches.

## Limits and Cost

- Unmeasured: token usage, strict same-task A/B cost, long-term security benefit, and general
  host compatibility. No estimates are made.
- Unverified: real Provider/network, redirect authorization, DNS rebinding, live keyring,
  production database/migration, installer execution, macOS/Linux, penetration testing,
  release/deployment, and real user acceptance.
- The protocol cost is material: 24 tracked EXP-003 protocol/state files and 1,274 lines were
  present in the initial integrated diff before the final review/result artifacts. The cost was
  proportionate to the observed security and cross-runtime coupling, but not universal.
