# EXP-003 Resume Validation

## Identity and Decision

- Validation ID: `MMGH-EXP-003-RESUME-001`
- Validation date: 2026-07-19
- Source boundary: EXP-002 final result plus the persisted EXP-001 Checkpoint
- Decision: `validated`
- Scope of decision: create EXP-003 from the verified EXP-002 boundary, run a fresh
  baseline, and audit the three authorized cross-layer candidates before any product change.

## Latest Instruction and Authority

- The latest instruction authorizes an EXP-003 experiment branch, evidence-based Full Loop
  artifacts, one approved cross-layer contract change when justified, isolated tests,
  commits, and push of the EXP-003 branch.
- It does not authorize master modification or push, merge, PR, tag, release, deployment,
  force-push, production-data changes, real API-key access, Tauri/network permission
  expansion, important deletion, or modification of user-owned untracked files.
- A no-implementation decision at the Contract Barrier is explicitly valid when the audit
  finds no safe, verifiable, worthwhile gap.

## Observed Git Reality

- Repository: `C:\Users\tutic\IdeaProjects\MMGH`
- Expected EXP-002 boundary: `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`
- Actual branch before EXP-003 creation: `experiment/looppilot-mmgh-exp-002`
- Actual HEAD: `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`
- Remote freshness: observed. `git fetch origin experiment/looppilot-mmgh-exp-002`
  succeeded on 2026-07-19 after one TLS-handshake failure.
- Remote-tracking ref: `origin/experiment/looppilot-mmgh-exp-002` at the actual HEAD;
  observed ahead/behind count `0 0`.
- Tracked working tree: clean; `git diff --check` exited 0.
- User-owned untracked files: `.impeccable/live/config.json` and `PRODUCT.md`; both exist,
  remain unstaged, and are excluded. Their content was not copied into experiment records.
- Unknown changes or unpushed commits after EXP-002: none observed.

## Loaded Recovery Sources

- Latest EXP-003 user instruction.
- `.looppilot/RESUME-VALIDATION.md` (prior EXP-002 record, now replaced by this record).
- `.looppilot/CHECKPOINT.md` and `.looppilot/CONTEXT-COMPACTION.md`.
- `.looppilot/PROJECT.md` and `.looppilot/LOOP-MAP.md`.
- `.looppilot/loops/LOOP-001/LOOP-CONTRACT.md`, `TASK-LEDGER.md`,
  `FINDING-LEDGER.md`, and `LOOP-CLOSURE.md`.
- `docs/experiments/looppilot-exp-002/RESULTS.md` and `MODE-SELECTION.md`.
- `.looppilot/STATE.md` and `.looppilot/HANDOFF.md` do not exist in MMGH at this boundary.

## Protocol Source and Capabilities

- No host-native LoopPilot Skill appears in the current Skill catalog.
- Read-only fallback: `C:\Users\tutic\IdeaProjects\LoopPilot` at verified frozen HEAD
  `c9e8b3ec71936f7f3b6ab21a2fc50d15f80f74ee`.
- Loaded protocol sources are the supplied `AGENTS.md`, `SKILL.md`, and only the Full Loop,
  Ledger, review/rework, recovery, and security/data rules needed by this experiment.
- Observed host capabilities: PowerShell, Git, repository read/write, native Plan,
  independent sub-agent contexts, and frontend/Rust test runners subject to baseline checks.
- Commit and push authority applies only to the EXP-003 experiment branch.

## Conflicts and Corrections

- No conflict exists between expected and actual EXP-002 HEAD, branch ancestry, local
  tracking state, or user-owned file exclusions.
- The first remote fetch attempt failed with a TLS handshake error; a bounded retry with
  explicit network authority succeeded. Remote freshness is therefore observed, not inferred.
- The persisted Checkpoint names an old EXP-001 decision point. The latest instruction and
  EXP-002 result supersede that pending decision without reopening LOOP-001.
- The existing Loop Map reserves `LOOP-004` for Storage/Tauri Contract and Release Evidence;
  EXP-003 must use the next non-conflicting real Loop ID if implementation is approved.
- No Scope, Finding severity, risk acceptance, or permission was expanded by validation.

## Resume Decision and Exact Next Action

Recovery is `validated`. Create `experiment/looppilot-mmgh-exp-003` from the actual
EXP-002 HEAD, run the complete fresh pre-change baseline, and then produce an evidence-based
Provider Security, Web/Tauri Storage Adapter, and SQLite Migration audit. Do not modify
product code until the Full Loop Selection Gate identifies a real, safe gap and the
Contract Barrier passes. Stop before implementation on unexplained baseline failure,
user-file overlap, unauthorized product change, or absence of a justified candidate.
