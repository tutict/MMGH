# Remediation — Frontend Refinement & Capability Assessment Review

Review: `MMGH-REVIEW-FRONTEND-REFINEMENT-005` · 2026-10-31 · Reviewed range `a419f76..95aa9d7`.

This file is the authoritative disposition record for the four-axis review. The axis documents
(`SPEC-REVIEW.md`, `STANDARDS-REVIEW.md`, `DATA-REVIEW.md`, `COMPATIBILITY-REVIEW.md`) hold the
evidence; this file holds what was done about it.

## Outcome

| Outcome | Count | Findings |
|---|---|---|
| Fixed | 5 | T1, D1, D2, D3, C1 |
| Accepted, documented | 2 | S1, T2 |
| Retained, not counted | 2 | R1, R2 |

7 findings were counted in the verdicts (3 P2, 4 P3). No Blocker, no Critical. Two retained
pre-existing items (R1, R2) are recorded without being counted.

## Fix commits

Each commit carries one concern and nothing else.

| Commit | Subject | Findings closed |
|---|---|---|
| `d7fb5d5` | fix(state): 提醒到期改为非阻断提示并支持测试静音 | D2, D3 |
| `f6e0cc1` | fix(ci): 能力测评 live 作业不再在 pull_request 事件下运行 | D1 |
| `95aa9d7` | fix(ui): Agent 技能 chip 达标 44px 并改中性选中态 | C1, T1 |

The review's evidence was re-measured after these commits; all numbers in the axis documents are
post-fix numbers (gate: 27 files / 118 passed / 3 skipped unit, 43 + 59 passed Rust, build clean;
CSS census 4,650; probes re-run per finding).

## Per-finding record

### D1 — CI live job ran PR code with repository secrets — Fixed (`f6e0cc1`)

The `live` job's condition now includes `github.event_name != 'pull_request'`, with a comment
naming the mechanism (same-repo PR events receive secrets and the job would check out and run
the PR's code). The offline job is unchanged — it never needed credentials.

### D2 — Blocking `window.alert` with no mute path — Fixed (`d7fb5d5`)

`useReminderAlerts` now reports through an `onAlert` callback; the controller writes the
existing notice state (`app.reminders.alertDue`), rendered as a `role="status"` banner on both
shells. The modal, its `setTimeout` wrapper and the hook's `t` prop are deleted. Muting:
`localStorage["mmgh-reminder-alerts-disabled"] = "1"` or `?disableReminderAlerts=1` before the
workspace loads — skips the tone, the notice and the view switch; documented in the README.

### D3 — Edits re-armed the alert — Fixed (`d7fb5d5`)

The trigger key is now `id:dueAt:status` instead of `id:updatedAt:status`, so only a due-time
change or a status change constitutes a new alarm. Locked by a unit test that advances past the
due time, rerenders with a changed `updatedAt`, and asserts the open callback still fired
exactly once.

### C1 — 32px accent-filled skills chip — Fixed (`95aa9d7`)

The chip is neutral outlined at `min-height: var(--q-touch)` with a `--q-sunken` hover; the
mounted state is `--q-selected` + `aria-pressed`; labels and accessible names come from the
locale files and name the skill they act on. Post-fix probe: 4 chips ≥44px, mounted background
equals `--q-selected`.

### T1 — Dead `emptyToday` keys — Fixed (`95aa9d7`)

Both definitions removed from `mobileText.ts`; the consumed sibling `emptyTodayHint` stays.

### S1 — 4,650 lines vs the plan's 4,300–4,500 — Accepted, documented

`DESIGN.md` §3 records the final count, the +159 delta from 4,491, the missed net-reduction
target and the reason (the new grammar's rules exceeded what the deduplication removed). The
plan's own checkpoint rule was honored when the review round pushed the count one line over
4,650: the chip rules were merged back to land exactly on the line. The 5,200 hard budget stays
locked by `styleContract.test.ts`.

### T2 — Scorer `FORBIDDEN_CLAIMS` superset (EN 56 vs 55) — Accepted, documented

The direction is safe (the scorer can only flag more than the runtime allows, never fewer), so
no sample can pass un-checked. The residual risk is drift without a pin: nothing fails if the
tables diverge further. The candidate repair — a parity test asserting scorer ⊇ runtime, or
one shared source — is recorded for its own decision.

## Watch items

- **R1** — desktop compact controls at 28px. Revisit only if MMGH targets touch-capable
  desktops.
- **R2** — `dev:web`'s `localStorage` preview workspace. Revisit only if the browser preview
  starts being used for real data entry.
- **T2** — pattern-table drift (above).
