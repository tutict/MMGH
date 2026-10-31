# Data Review — Frontend Refinement & Capability Assessment

Axis of the four-axis review `MMGH-REVIEW-FRONTEND-REFINEMENT-005`.
Baseline `a419f76`, reviewed change set `a419f76..95aa9d7`.

## Sources of truth

- The repository's security contract: provider API keys live in the system keyring, never in
  SQLite; the frontend snapshot always returns an empty `apiKey`; the eval harness never reads
  the keyring.
- `useReminderAlerts.ts` — the reminder due-alert semantics this set both relied on (the tone)
  and rebuilt (non-blocking notice, mute switch, re-arm key).
- `.github/workflows/ragas-ci.yml` — the first CI workflow, and therefore the first place
  repository secrets can meet third-party-triggered code.

## Verdict

**PASS with findings — 2 Major (P2), 1 Minor (P3). All three fixed.**

The persistent-data layer is untouched by this set — no migration, no schema change, no new
storage — and the keyring contract is intact (the runtime test
`complete_reply_never_echoes_the_api_key_in_errors` passes; the frontend snapshot contract is
asserted by the existing suite). The findings are in the two seams the set newly created or
re-shaped: CI secret handling, and the alert state machine.

---

## D1 — P2 — The CI live job ran on `pull_request` events, executing PR code with secrets — Fixed (`f6e0cc1`)

**Mechanism.** `pull_request` events from same-repository branches receive repository secrets,
unlike `pull_request_target`-style protections or fork PRs (which get none). The workflow's
`live` job checked out the pull request's own commit and ran the Rust harness and Python scorer
with `MMGH_EVAL_API_KEY` in the environment. Any pull request — including a malicious one —
could print the key or exfiltrate it via a network call from its own eval script. The offline
job was never exposed (it needs no credentials); the exposure was confined to the live job.

**Fix:** the live job's `if` now also requires `github.event_name != 'pull_request'`, with a
comment stating why. Same-repo PRs run the offline job only; the live job spends the key only on
pushes to trusted branches and manual `workflow_dispatch` runs.

## D2 — P2 — The due reminder raised a blocking `window.alert`, and nothing could silence it — Fixed (`d7fb5d5`)

**Mechanism.** `useReminderAlerts` fired a tone and 120ms later a blocking `window.alert`
carrying the reminder title, then hijacked the view to the reminders page. Three costs:

- The modal blocked the JS thread — in UI automation or a manual walkthrough the app stops until
  dismissed, which is why test sessions rang alarms "often" (probes had to dismiss dialogs
  mid-run).
- There was no mute path: any due reminder in the dataset alerted, every time.
- The blocking modal delivered no information the in-app surface could not.

**Fix.** The hook gained an `onAlert` callback and dropped `window.alert` (and its `t` prop);
the controller writes the existing `notice` state (`app.reminders.alertDue`, "提醒到期：{title}"),
which renders as a non-blocking `role="status"` banner on both shells. A mute switch suppresses
the entire path — tone, notice and view switch — via
`localStorage["mmgh-reminder-alerts-disabled"] = "1"` or `?disableReminderAlerts=1`, evaluated
before the workspace loads; it is documented in the README for automation and manual QA.
Normal (unmuted) behaviour keeps the tone and the view switch.

**Measured.** Unmuted probe: notice "Reminder due: Due soon probe" rendered, tone played exactly
once, view switched to reminders, zero `window.alert` calls. Muted probe with a
confirmed-created due reminder: 0 tones, 0 alerts, no view switch. The hook's six unit tests
cover both paths plus the re-arm rule (D3).

## D3 — P3 — The alert re-arm key included `updatedAt`, so edits re-rang the alert — Fixed (`d7fb5d5`)

**Mechanism.** The trigger key was `id:updatedAt:status`. Any save — a typo fix in the title, a
severity change — produced a new key, so an already-triggered reminder became "untriggered"
again and alarmed a second time on the next pass. The key now encodes what actually constitutes
a new alarm: `id:dueAt:status`. Editing any other field no longer re-arms; moving the due time
or re-opening the reminder does.

**Fix:** key change in `createReminderAlertKey` plus a unit test — advance past due, rerender
with a changed `updatedAt`, assert the open callback still fired exactly once.

---

## R2 — Retained, not counted — `dev:web` keeps its preview workspace in `localStorage`

`npm run dev:web` runs against an in-`localStorage` preview workspace so the browser preview
needs no Tauri backend; the production app persists in SQLite. This is deliberate, pre-existing
dev-mode behaviour, not introduced here — but this round's probes (which ran on `dev:web`) mean
the browser evidence above was collected against the preview workspace. The reminder-alert
semantics themselves are covered by the real hook and controller in the unit suite, so the
conclusion does not rest on the preview storage. Recorded so the evidence's provenance is
explicit.

## Data confirmations (no finding)

- **Keyring contract intact.** No file in the range touches `keyring` usage; the eval harness
  reads `MMGH_EVAL_*` env vars only and injects an explicit provider config, so an evaluation
  run cannot read the system keyring (source-verified in `src-tauri/src/bin/ragas_eval_harness.rs`).
- **`run_agent_for_evaluation` is not reachable from the frontend.** It is `pub` for the harness
  binary but absent from `generate_handler` (`src-tauri/src/main.rs:132-154`); the IPC surface
  is unchanged.
- **`FORBIDDEN_CLAIMS` direction is safe** (scorer superset, see T2 in the Standards axis).
- **No data leakage paths added.** `eval/ragas/out/` and `/artifacts` are gitignored, so
  evaluation samples (which contain model replies) cannot be committed; the dataset
  (`eval/ragas/dataset.json`) is synthetic and carries no user data.
- **No destructive persistence changes.** The range contains no migration, no `DROP`, and no
  schema edit; `rusqlite` and the db module are untouched.
