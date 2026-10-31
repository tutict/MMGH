# Four-Axis Review — Frontend Refinement & Capability Assessment

## Identity

- Review ID: `MMGH-REVIEW-FRONTEND-REFINEMENT-005`
- Date: 2026-10-31
- Baseline under review: `master` = `origin/master` at `a419f76`.
- Reviewed change set: `a419f76..95aa9d7` — 21 commits, 50 files, `+2,988 / −571`.
- Axes: Spec, Standards, Data, Compatibility.
- Reviewer: Qoder primary agent, single review context.
- Remediation: [`REMEDIATION.md`](REMEDIATION.md) — the authoritative disposition record.

## Why this review exists

The set carries two workstreams:

1. **The Ragas capability assessment** (`e1b8e60`..`bd2dfff`): a Rust harness binary that drives
   the production prompt-assembly path over a committed dataset, a Python scorer with offline
   Ragas metrics plus project guardrail metrics, a baseline gate, and the repository's first CI
   workflow.
2. **The Quiet Ledger refinement** (`9e03811`..`8ede80b`): the approved mobile-first (390px) +
   desktop (1280px) refinement — token and theme calibration, one shared row/section/segmented
   grammar, the mobile shell and composer fixes, per-page re-lays, the desktop shell and Agent
   re-flow, workspaces, tools, sticky rails, breakpoints, and the doc refresh.

The refinement was executed under its own plan with per-step gates (`typecheck` + `test:unit`
after every step, CSS budget checkpoints, CDP probes at 320/390/1280). Per-step gates share one
blind spot: they verify each step against the plan, not the whole set against everything the plan
did not think about. This review asks the remaining questions — what does the set do to CI secret
handling, to the reminder alert contract, to i18n hygiene, and to every hard number the plan
promised — and fixes confirmed new defects before the set is pushed.

## Review Boundary

Included:

- Every file changed in `a419f76..95aa9d7`: `eval/ragas/**`, `.github/workflows/ragas-ci.yml`,
  `src-tauri/src/agent/**` and `src-tauri/src/bin/ragas_eval_harness.rs`, `src/ui/**`,
  `src/components/**`, `src/state/**`, `src/theme/**`, `src/i18n/**`, `README.md`, `DESIGN.md`,
  `CHANGELOG.md`.
- The reminder due-alert behaviour, which the refinement touched indirectly (tone reuse) and the
  review round rebuilt (non-blocking notice + mute switch).

Excluded:

- The Rust agent runtime's internal design (`2026-10-16-rig-runtime-and-dependencies`) and the
  dependency refresh (`2026-10-30-dependency-refresh`), both already reviewed; this set upgrades
  no crate and adds no dependency.
- Live provider calls, real API keys, real user data, installer packaging, macOS/Linux targets.

## Verdict Summary

| Axis | Verdict | Findings |
|---|---|---|
| Spec | PASS with findings | 1 Minor (P3) |
| Standards | PASS with findings | 2 Minor (P3) — one fixed, one accepted |
| Data | PASS with findings | 2 Major (P2), 1 Minor (P3) |
| Compatibility | PASS with findings | 1 Major (P2) |

7 findings in total (3 P2, 4 P3). No Blocker and no Critical. The refinement delivered the plan's
grammar on both shells: one row syntax at the 44px touch floor, one section-head and one
segmented-control implementation, `--q-selected` as the only selection treatment, at most one
solid accent per screen, the composer above the dock, transport-aware sticky rails, and the
4,650-line stylesheet under the 5,200 contract budget.

**All 5 fixable findings are fixed.** Five findings were repaired in three commits (`d7fb5d5`,
`f6e0cc1`, `95aa9d7`); two were accepted and documented (S1, T2). Two retained pre-existing
items (R1, R2) are recorded without being counted. See [`REMEDIATION.md`](REMEDIATION.md).

The three defects a user could hit in normal use:

1. The mobile Agent skills chip measured 32px tall — below the 44px touch floor the plan fixed
   everywhere else — and its mounted state was filled with the accent colour, the same accent the
   page's Send button already holds (C1).
2. A due reminder opened a blocking `window.alert` on top of the tone and the view switch, and
   there was no way to silence it for UI automation or manual walkthroughs (D2).
3. Editing a reminder re-armed its alert even when the due time had not changed, because the
   alert key included `updatedAt` (D3).

The most severe finding was not user-visible: the CI workflow's live assessment job would run on
`pull_request` events from same-repository branches — which receive repository secrets — and
would check out and execute the pull request's code with the provider key in its environment (D1).

## Findings Index

| ID | Axis | Severity | Summary | Status |
|---|---|---|---|---|
| S1 | Spec | P3 | The stylesheet ended at 4,650 non-blank lines — a net increase of 159 against the plan's 4,300–4,500 net-reduction target, exactly at the plan's 4,650 review checkpoint | Accepted, documented |
| T1 | Standards | P3 | The `emptyToday` key existed in both `mobileText.ts` locales with no consumer | Fixed |
| T2 | Standards | P3 | The scorer's `FORBIDDEN_CLAIMS` is a superset of the runtime's (EN 56 vs 55) | Accepted, documented |
| D1 | Data | P2 | The CI live-assessment job ran on `pull_request` events, executing PR code with repository secrets | Fixed |
| D2 | Data | P2 | The due reminder raised a blocking `window.alert`, and nothing could silence it for automation | Fixed |
| D3 | Data | P3 | The alert re-arm key included `updatedAt`, so any edit re-rang the alert | Fixed |
| C1 | Compatibility | P2 | The mobile Agent skills chip measured 32px (touch floor 44px) and filled its mounted state with the accent colour | Fixed |
| R1 | Compatibility | P3 | Desktop compact controls (`.section-head .ghost-button` and siblings) stay 28px tall | Retained, not counted |
| R2 | Data | P3 | `npm run dev:web` keeps its preview workspace in `localStorage` while production uses SQLite | Retained, not counted |

## Evidence Observed

Commands run against the committed tree at `95aa9d7`:

- `npm run lint` -> exit 0, zero warnings.
- `npm run typecheck` -> exit 0.
- `npm run test:unit` -> **27 files, 118 passed, 3 skipped** (121 total).
- `npm run build` -> exit 0; `dist/assets/index-ChecGXQz.css` **90.94 kB (12.92 kB gzip)**.
- `npm test` (Rust, two test targets) -> **43 passed / 1 ignored** and **59 passed / 1 ignored**,
  0 failed.
- CSS census (non-blank lines): `base.css` 172, `primitives.css` 215, `tokens.css` 100,
  `desktop/shell.css` 593, `desktop/workspaces.css` 1,248, `desktop/tools.css` 1,054,
  `mobile/shell.css` 295, `mobile/pages.css` 622, `mobile/tools.css` 342, `App.css` 9 —
  **4,650 total**, against the 5,200 budget locked by `styleContract.test.ts`.
- Token resolution: 70 unique `--q-*` names referenced across the ten stylesheets and the theme,
  **0 referenced-but-undefined**.
- Forbidden patterns re-scanned by grep over `src/ui/**`, `src/CSS/**` and the theme:
  **0** `backdrop-filter`, **0** `gradient`, **0** `text-transform: uppercase`; the only grep
  hits live inside `styleContract.test.ts`'s own pattern list. **0** raw `#hex` / `rgb()` /
  `hsl()` in stylesheets and theme; the only hits are `tokenContrast.test.ts`'s OKLCH→sRGB
  helper.
- Browser probes (CDP against `npm run dev:web` at `127.0.0.1:5173`, Chrome headless 9222;
  screenshots under the gitignored `artifacts/style-review/`):
  - Mobile **320×568 and 390×844**: exactly one `<h1>` at **18px**; `documentElement.scrollWidth`
    never exceeds `innerWidth`; **0** `button` / `[role=button]` / `[role=switch]` click rects
    below 44×44.
  - Desktop **1280×800 Agent**: chat column **704px** (plan floor 660px), `.runtime-thread`
    scrolls internally, page `<h1>` **24px**; nav width **200px at 900** and **240px at 901**;
    **1599** folds the Agent detail rail, **1600** restores it, no overflow at either; **761**
    music/settings keep the stage padding-bottom at **80px** (`--q-desk-transport` 56px +
    24px) under `.desk:has(.desk-transport)`.
  - Mobile Agent skills chips: 4 chips all **≥44px** tall; mounted chip background
    `oklch(0.945 0.02 250)` = `--q-selected`, `aria-pressed` present (C1 evidence).
  - Reminder alert, unmuted: a confirmed-created due reminder raises the in-app notice
    "Reminder due: …", plays the tone **exactly once**, switches the view to reminders, and no
    `window.alert` fires. Muted (`localStorage["mmgh-reminder-alerts-disabled"] = "1"`):
    **0** tones, **0** alerts, no view switch (D2 evidence).
- Eval toolchain static checks: `run_agent_for_evaluation` is `pub` but absent from
  `src-tauri/src/main.rs`'s `generate_handler` (lines 132–154), so the Tauri IPC surface does not
  expose it. The harness reads keys only from `MMGH_EVAL_BASE_URL` / `MMGH_EVAL_API_KEY` /
  `MMGH_EVAL_MODEL`, writes an explicit provider configuration, never touches the system
  keyring, and never prints the key. `eval/ragas/out/` and `/artifacts` are gitignored, so
  evaluation reports cannot be committed.
- `FORBIDDEN_CLAIMS` parity: the runtime holds **55 EN + 47 ZH** patterns
  (`src-tauri/src/agent/contract.rs:254-459`); the scorer holds **56 EN + 47 ZH**
  (`eval/ragas/evaluate.py:65-169`).

## Independence and Limitations

- Single review context: the reviewer is the same agent that authored the reviewed commits.
- Browser probes ran against the dev server (`dev:web`), whose preview workspace lives in
  `localStorage` (R2), not against the packaged Tauri app; the alert path itself is exercised
  against the real hook and controller by `useReminderAlerts.test.ts`.
- The live Ragas job was not executed — it needs provider credentials; the review verified the
  harness's key handling and the CI guard statically.
- Three probe readings started as suspected defects and were cleared on re-measurement; they are
  recorded in [`COMPATIBILITY-REVIEW.md`](COMPATIBILITY-REVIEW.md) so the methodology is
  auditable: the Send hit-test miss (disabled buttons carry `pointer-events: none`), the
  "transport absent" reading on the music view (the transport is hidden on the music view by
  design), and a stale-page crash under Vite HMR (an environment artifact).
- No runtime diffing against a pre-refinement build; the refinement's per-step screenshots under
  `artifacts/style-review/` were the baseline evidence, and they are gitignored by policy.
