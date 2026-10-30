# Data Review — Quiet Ledger Redesign

Axis of the four-axis review `MMGH-REVIEW-QUIET-LEDGER-004`.
Baseline `5ac4ca0`, reviewed change set `5ac4ca0..6f1281d`.

## Sources of truth

- `src/storage/agent.ts` — the preview persistence path and the normalisation layer.
- `src-tauri/src/db/**` — the desktop SQLite path.
- `src/state/useWorkspaceController.tsx` — the single owner of workspace state.
- `src/state/useReminderAlerts.ts` — the reminder alarm timer.
- `PRODUCT.md` §Trust Boundaries: "本地 SQLite 是桌面端已提交数据的权威来源 … 界面只提交成功返回的
  完整工作区快照。失败时保留用户当前看到的状态。"

## Verdict

**PASS with findings — 1 Major (P2), 2 Minor (P3).**

The change set does not touch persistence. `git diff --stat 5ac4ca0..6f1281d -- src/storage
src-tauri/src` is **empty**: no SQLite schema, no statement, no serialisation shape, no Rust command
and no migration changed. The only state-layer files in the range are
`src/state/useReminderAlerts.ts` and `src/state/useWorkspaceController.tsx`, and both carry
behaviour fixes rather than data-path changes. The trust-boundary rules still hold — the UI still
adopts only the snapshot a save returns, and a failed save still leaves the current state in place.

The findings are in the *presentation state* layer that sits on top of an unchanged persistence
contract: one alarm-suppression rule whose window is data-dependent, one hydration rule whose
one-shot is unguarded, and one pipeline that is still being computed for a surface that no longer
exists.

---

## D1 — P2 — The reminder seeding window is data-dependent, so a reminder created during the session can be silenced

`src/state/useReminderAlerts.ts:68-77`, added by `dc73892 fix(reminders): 启动时不再劫持逾期待办`:

```js
if (!seededRef.current && reminders.length > 0) {
  seededRef.current = true;
  const seededAt = Date.now();
  for (const reminder of reminders) {
    if (isOpenReminderWithDueTime(reminder) && Number(reminder.dueAt) <= seededAt) {
      triggeredReminderKeys.add(createReminderAlertKey(reminder));
    }
  }
}
```

**Intent.** Before this change every overdue reminder fired a `window.alert` and forced the view to
"reminders" the moment the list loaded. The fix suppresses the ones that were already overdue when
the session began.

**What the code actually suppresses.** The seed fires on the first effect run in which
`reminders.length > 0`, and it suppresses every reminder that is overdue *at that instant*. Those
are two different moments, and they diverge whenever the list is empty when the session starts.

`src/state/useWorkspaceController.tsx:1369-1374` shows the effect only runs while `active` is true,
and `active` is false while `loading` is true — so the seed moment is "when the first workspace
snapshot lands", not "when the session started":

```js
useReminderAlerts({
  active: !(hasUnsavedWorkspaceDrafts || busy !== "" || loading),
  onOpen: openDueReminder,
  reminders,
  t,
});
```

**The failing sequence.**

1. A workspace with **no reminders**. This is the normal state of a fresh desktop install: the Rust
   schema creates the `reminders` table but seeds no rows (`src-tauri/src/db/**` contains no
   starter-reminder insert outside the v1→v2 migration at `db.rs:1400` and a test fixture at
   `db.rs:2280`), and the preview path returns `[]` when the stored snapshot carries no reminders
   (`src/storage/agent.ts:791-793`).
2. The user creates their **first** reminder with a due time that has already passed — "call the
   dentist, today 09:00", entered at 10:00. `reminders` goes from `[]` to `[r1]`.
3. The effect re-runs. `seededRef.current` is still `false`, because the seed never ran while the
   list was empty, and `reminders.length > 0` is now true — so the seed runs *at this moment* and
   marks `r1` as already triggered.
4. `r1` never alarms. The tone never plays, `onOpen` never fires, and the reminder sits overdue
   with no notification.

`seededRef.current = true` sits *inside* the `reminders.length > 0` guard, so "the session has
started" and "the list has something in it" are conflated into one flag. The flag is meant to
answer "has the seed already happened?" and is being used to answer "has the session started?".

**The second, milder divergence.** The seed compares against `Date.now()` at the seed moment
rather than against a recorded session start. If the workspace snapshot takes a long time to
arrive — a large SQLite file, a cold Rust start — a reminder that becomes due *inside that window*
is treated as pre-session and silenced, even though the user was in the app for it.

**Why "move the flag out of the guard" is not the fix.** The correct predicate is per-reminder:
*was this reminder already overdue when the session began?* The data needed for it already exists —
`normalizeReminder` (`src/storage/agent.ts:704-707`) preserves `createdAt`, and the Rust row carries
`created_at` (`src-tauri/src/db/reminders.rs:28`). A reminder created after the session start can
therefore be excluded from the seed regardless of its due time, and the "seeded" flag can be set
once, unconditionally, at session start.

**Disposition.** Fixed. The controller hands the hook the moment the workspace first became
available (`workspaceReadyAt`), and the hook judges each reminder against that fixed anchor: a
reminder is silenced only when it was both created before the anchor and already overdue at it.
The judgement is per reminder, so it no longer depends on when the list happens to arrive — a
reminder created during the session alarms whether or not it is already overdue, and a reminder
that was overdue before the workspace loaded stays silent. Covered by four hook tests and one
App-level test.

---

## D2 — P3 — The settings hydration is a one-shot whose first run is unconditional

`src/state/useWorkspaceController.tsx:922-936`, added by `008659b fix(settings): 切换 Provider 时不再覆盖未保存的设置草稿`:

```js
useEffect(() => {
  if (workspace?.settings) {
    if (!settingsHydratedRef.current) {
      settingsHydratedRef.current = true;
      setSettingsForm({ ...workspace.settings, clearApiKey: false });
    } else if (!hasUnsavedSettings) {
      setSettingsForm({ ...workspace.settings, clearApiKey: false });
    }
  }
  ...
}, [hasUnsavedNote, hasUnsavedSettings, hasUnsavedSkill, noteDraft.id, skillDraft.id, workspace]);
```

**What it fixes, and it is a real fix.** The previous guard was `if (workspace?.settings &&
!hasUnsavedSettings)`. The form's initial state (`useWorkspaceController.tsx:224-232`) is
`{providerName: "OpenAI Compatible", baseUrl: "", model: "", …}` while the stored defaults are
`{baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", …}`
(`src/storage/agent.ts:245-253`). So on the very first snapshot `hasUnsavedSettings` was already
**true** — an empty form compared against a populated workspace — and the form was therefore never
hydrated at all. The Settings page showed an empty Base URL and Model for a workspace that had
both. The new unconditional first branch fixes exactly that.

**What is left.** The ref is never reset, so the unconditional branch is a one-shot, and it is the
one branch that ignores `hasUnsavedSettings`. The decision "this form has been hydrated" is
therefore taken at the first moment `workspace.settings` is truthy, and it overwrites whatever the
form holds at that moment — including an edit in progress.

**Why the edit can exist at that moment.** `hasUnsavedSettings` is not a usable guard for the first
hydration, because before hydration it is trivially true. The correct signal is "has the user
edited this form", which is a different fact and is not tracked anywhere. Reachability:
`SettingsWorkspace` is rendered from `settingsForm` / `setSettingsForm`
(`useWorkspaceController.tsx:3246-3262`) and does not depend on `workspace` being loaded, so the
form is editable as soon as the user navigates to Settings. The navigation is available during the
initial load, so a user who opens Settings before the snapshot arrives can type a Base URL; the
snapshot then lands and the first branch overwrites it. The window is narrow, but it is the exact
failure the commit set out to remove, and it is not covered by any test.

**Disposition.** Fixed. A "the user touched this form" flag distinguishes an untouched form (which
must be hydrated from the workspace) from an edited one (which must not be).

---

## D3 — P3 — The rule-insight pipeline still runs for a surface that no longer exists

The desktop Today workspace used to carry three rule surfaces. `git show
5ac4ca0:src/components/TodayWorkspace.tsx` shows them: the rule-action list
(`ruleActionRecommendations`, `today-rule-block`, with promote and unmount actions), the
rule-effectiveness block (`ruleEffectivenessSignals` + `ruleEffectivenessInsights`, a second
`today-rule-block`), and the recurring-pattern list (`recurringPatternInsights`). The redesign
removed all three from the desktop view, and the mobile view lost its rule block as well.

The pipeline that fed them is intact and still runs:

| Symbol | Location | State |
|---|---|---|
| `ruleEffectivenessInsights` | `useWorkspaceController.tsx:1099` | computed, feeds only D3's other two |
| `ruleEffectivenessSignals` | `useWorkspaceController.tsx:1108`, returned at `:3430` | computed, rendered nowhere |
| `ruleActionRecommendations` | `useWorkspaceController.tsx:1112`, returned at `:3428` | computed, rendered nowhere |
| `ruleActionRecommendations` / `ruleEffectivenessSignals` | `src/shell/MobileShell.tsx:45-46` | still threaded across the mobile shell boundary |
| `handleOpenReminderPattern` | `useWorkspaceController.tsx:2575`, returned at `:3367` | **0 consumers** |
| `handlePromoteReminderPattern` | `useWorkspaceController.tsx:2602`, returned at `:3372` | **0 consumers** |

So every render still derives the rule-effectiveness model, the signal set and the action
recommendations, still builds the two recommendation lists, and still ships two of them across the
mobile shell boundary, for a surface that no longer exists. Two handlers that mutate workspace
state — one opens a recurring pattern, one promotes it into a skill — are retained with no caller.

This is the data-side of the Spec finding **S6**: `PRODUCT.md` names 规则建议 as a responsibility of
the Today workspace, and the implementation removed the surface while leaving the machinery
running.

**Disposition.** Fixed together with S6 — one compact rule-suggestion surface is restored on the
desktop Today, and the plumbing that no longer has a consumer is removed rather than left to run.

---

## Verified against the change set — no findings

- **No persistence surface changed.** `git diff --stat 5ac4ca0..6f1281d -- src/storage
  src-tauri/src` is empty. No schema, statement, migration, serialisation shape or Rust command was
  touched.
- **Snapshot discipline intact.** `commitWorkspaceSnapshot` still adopts only the snapshot a save
  returns, and both behaviour fixes keep the existing state on failure
  (`handleSaveSettings` at `useWorkspaceController.tsx:1497-1499` sets the error and leaves the form
  alone; the reminder fix adds keys to an in-memory set and never writes).
- **Reminder identity.** `createReminderAlertKey` (`useReminderAlerts.ts:6-8`) keys on
  `id:updatedAt:status`, so an edited or re-opened reminder is correctly treated as a new alert
  target rather than a suppressed one.
- **Reminder normalisation.** `normalizeReminder` (`src/storage/agent.ts:669-716`) preserves
  `createdAt` / `updatedAt` across both the camelCase and snake_case shapes and defaults them to
  `now()`; `dueAt` is normalised to a finite number or `null`. The alert hook's
  `isOpenReminderWithDueTime` therefore sees a consistent shape.
- **Session and skill drafts.** The `hasUnsavedNote` / `hasUnsavedReminder` / `hasUnsavedSkill`
  guards are unchanged by the redesign, and the `skillDraft.id !== workspace.activeNote.id` style
  identity checks that prevent one draft from overwriting another are intact.
- **No secret moved.** The API key still lives in the system keyring; `sanitizeSettingsForPersistence`
  (`src/storage/agent.ts:272-278`) still forces `clearApiKey: false`, `hasApiKey: false`,
  `apiKey: ""` into anything that gets persisted, and the preview path still keeps its key in
  volatile memory / `localStorage` rather than in the snapshot.
- **Locale parity.** `zh-CN.ts` and `en-US.ts` hold 852 identical keys with no empty values — the
  redesign added no key and removed none.
- **Rust tests.** `npm run test:rust` → `mygh` 59 passed / 1 ignored, 0 failed.
