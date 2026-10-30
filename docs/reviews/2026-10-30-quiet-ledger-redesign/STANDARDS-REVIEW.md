# Standards Review — Quiet Ledger Redesign

Axis of the four-axis review `MMGH-REVIEW-QUIET-LEDGER-004`.
Baseline `5ac4ca0`, reviewed change set `5ac4ca0..6f1281d`.

## What "standards" means here

The repository's own standards are:

- `PRODUCT.md` — the product contract, including its Accessibility and Colour sections.
- `DESIGN.md` §5 — the class-name and style contract, and §6 — the MUI alignment rules.
- `src/ui/styleContract.test.ts` — the executable form of that contract.
- `src/theme/themeTokenParity.test.ts` — the executable form of the token-parity rule.
- `eslint.config.mjs` — flat config, `jsx-a11y` enabled, `react-hooks` on
  `recommended-latest`, `--max-warnings 0`.
- The i18n convention: every user-visible string comes from `src/i18n/locales/*.ts` or
  `src/components/mobile/mobileText.ts`; both locales carry the same key set.

## Verdict

**PASS with findings — 3 Major (P2), 3 Minor (P3).**

The executable standards are all green: `npm run lint` exits 0 with `--max-warnings 0`,
`npm run typecheck` exits 0, and all 21 test files pass. The locale files are structurally
perfect — 852 keys on each side, identical sets, no empty values, no duplicates.

The findings below share one root cause: **the style contract test can only see CSS.** It parses
`src/ui/**.css` and `src/CSS/App.css`, and it has no view of the TypeScript that consumes those
styles, nor of the MUI theme that overrides them. Every defect the review found in the TSX layer
is invisible to it by construction.

---

## T1 — P2 — Two i18n keys referenced in production exist in neither locale

`src/components/mobile/MobileSkillsView.tsx`:

```tsx
// line 140
"aria-label": `${t?.("app.skills.mountedOnSession") || "Mounted"} ${skill.name}`,

// line 263
placeholder={t?.("app.skills.forge.description")}
```

Neither key exists in `zh-CN.ts` or `en-US.ts`. What *does* exist is `app.skills.form.mountedOnSession`
("Mounted on session" / "挂载到会话"), `app.skills.forge.placeholder`, and
`app.skills.forge.description.ai` / `.description.local`.

`src/i18n/index.tsx:139` resolves a missing key as:

```js
const message = dict[key] ?? fallback[key] ?? key;
```

so `t("app.skills.mountedOnSession")` returns the **string** `"app.skills.mountedOnSession"`.
Because that string is truthy, the `|| "Mounted"` guard never fires. The two consequences are
visible to any user, in either language:

- The mounted-switch on each skill row announces `app.skills.mountedOnSession <skill name>` as its
  accessible name.
- The skill-generation textarea's placeholder reads `app.skills.forge.description`.

Both keys were introduced by the redesign (`98ab23e`, mobile tool pages). The `t?.(...)` optional-call
plus `|| "English"` pattern is the specific idiom that hides this: the fallback exists to cover a
missing translation, but the translation layer returns a truthy key instead of a falsy value, so the
fallback is unreachable.

**Disposition.** Fixed. Both call sites now use keys that exist. A locale-coverage test was added
so that a referenced-but-undefined key fails the build rather than shipping.

---

## T2 — P2 — The Agent skills sheet hardcodes English labels in a bilingual product

`src/components/mobile/MobileAgentView.tsx:201-208`:

```tsx
<Chip
  clickable
  color={isMounted ? "primary" : "default"}
  variant={isMounted ? "filled" : "outlined"}
  label={isMounted ? "On" : "Add"}
  onClick={() => handleToggleSkillMounted(skill.id)}
  disabled={busy !== ""}
/>
```

Every other string in the mobile shell goes through `t()` or `mobileText(lang, …)`. These two do
not, so the mobile Agent skills sheet shows `"On"` / `"Add"` in a product whose default language is
zh-CN. The mobile weather sheet does the same job correctly with `mobileText(lang, "remove")`
(`MobileWeatherView.tsx:185`), which is what makes the inconsistency visible.

**Disposition.** Fixed. Both labels are localised.

---

## T3 — P2 — The style contract test never scans the MUI theme

`src/ui/styleContract.test.ts:53`:

```ts
const cssFiles = [...walk(uiRoot, ".css"), join(projectRoot, "src/CSS/App.css")];
```

`src/ui/styleContract.test.ts` enforces "no backdrop filters, no gradients, no bare hex" and "every
`--q-*` variable used by CSS is defined" — but only over `src/ui/**.css` and `src/CSS/App.css`. The
MUI theme lives in `src/theme/AppThemeProvider.tsx` and is not scanned at all.

That gap is exactly where S2 lives: the theme carries the only two drop shadows and the only two
raw `rgb()` colours in the codebase, and the test that is supposed to forbid them never opens the
file. The theme also uses `var(--q-*)` 31 times; those references are correct today, but nothing
checks them.

The hex pattern has the same blind spot from the other direction:

```ts
{ pattern: /#[0-9a-f]{3,8}\b/i, label: "bare hex colour" },
```

`rgb(0 0 0 / 0.16)` is not a hex colour and passes. A theme that wrote `rgb(0 0 0 / 0.16)` where
`tokens.css` forbids out-of-token colours would sail through.

**Disposition.** Fixed. The contract test now also scans the theme source for the forbidden
patterns — shadows, gradients, hex and raw colour functions — and for undefined `--q-*` references.

---

## T4 — P3 — 291 orphaned locale keys and 12 unused `mobileText` keys

Both locale files carry 852 keys. 291 of them (34.1%) are defined but never referenced by any
`.ts` / `.tsx` file. The largest families are `app.today.*` (49), `app.weather.*` (28),
`app.skills.*` (23), `app.music.*` (20), `danmu.notes.*` (15), `app.capability.*` (14),
`app.inspector.*` (13), `app.agent.*` (12).

`src/components/mobile/mobileText.ts` is a second, parallel copy layer — 61 keys, identical key
sets between `en-US` and `zh-CN`, of which 12 are unused: `allNotes`, `clock`, `currentSession`,
`details`, `flowSignals`, `inspector`, `language`, `more`, `openTasks`, `provider`,
`quickSettings`, `today`.

Two things were checked before calling these dead:

- `app.reminders.status.open/scheduled/done` are still referenced (`ReminderWorkspace.tsx:251`) —
  the mobile reminders page did remove its status selector, but the desktop one keeps it. Not
  orphans.
- `app.theme.light/dark` are still referenced in `MobileSettingsView.tsx:102,110`,
  `SettingsWorkspace.tsx:42,49` and `DesktopShell.tsx:107`. The theme toggle moved from the mobile
  top bar into the mobile settings page; the key did not die. Not orphans.

**Disposition.** Accepted, recorded as a watch item. Pruning 291 keys is mechanical, but a key
reachable only through a template literal (`t(\`app.reminders.bucket.${bucket}\`)`) is invisible to
a static scan; all 30 dynamic call sites were checked by hand and resolve, so the prune is safe in
principle — it is still a ~600-line mechanical diff across two files, and it belongs in its own
commit rather than inside a defect fix.

**Correction after an independent measurement.** The first version of this finding claimed "277
orphans, every one of them a casualty of the rewrite, no pre-existing orphans". Both halves of
that claim were wrong, and the error was in the review's own evidence rather than in the code.
Re-measured with the scan `src/i18n/localeCoverage.test.ts` already defines — the same
`/\bt\??\.?\(\s*"([^"]+)"/` literal pattern, the same template-prefix pattern, the same exclusion
of `.test.ts` / `.test.tsx` files — across four trees:

| Tree | Locale keys | Orphaned keys |
|---|---|---|
| `5ac4ca0` — pre-redesign baseline | 847 | **226** |
| `6f1281d` — end of the redesign | 852 | **294** |
| `262ddde` — after the state-layer fixes | 852 | **292** |
| `5c2d9e0` — HEAD | 852 | **291** |

The baseline already carried 226 orphaned keys, so "no pre-existing orphans" was never true. Of the
291 orphans at HEAD, **222 predate the redesign** and only **69 are redesign casualties** — the
signal grid, the rule-suggestion cards, the summary grid and the shot-count badge. The redesign
also re-used four keys that had been orphaned at the baseline (`app.music.progressLabel`,
`app.music.mode.loop|single|shuffle`).

The rewrite's own share is therefore a quarter of the backlog, not all of it. The finding stands
as a watch item and the prune is still worth doing, but two things follow that the original text
got wrong: the scope of any prune must be decided deliberately (dropping 222 keys that no
component referenced for a year is a different change from dropping the 69 the redesign left
behind), and the missing guard is the more actionable half. `localeCoverage.test.ts` proves that
every *referenced* key exists on both sides, but nothing proves the reverse, which is why the
count could drift in either direction without a test failing.

**Update after the S4 fix.** The restore of the desktop rule-suggestion card moves seven keys back
into use (`app.today.review.rule.actionTitle`, the three `action.*.badge` labels, `action.unmount.button`,
`rule.loop` and `app.today.review.skill.open`) and takes six out (`rule.signal.working|idle|ready`,
which belonged to the deleted effectiveness signal set, and `skill.description|notice|trigger`,
which belonged to the deleted pattern-to-skill promotion). The orphan set therefore shrank from 292
to 291 by the same scan, and the remaining `app.today.review.*` orphans (27 in total) are the copy
of the surfaces the redesign removed — the effectiveness card and the recurring-pattern list. The
prune is still worth doing, and still belongs in its own commit.

---

## T5 — P3 — 22 unreachable status tone rules

`src/ui/primitives.css:111-151` defines a tone-alias table for `AppStatusChip`:

| Bucket | Aliases defined | Aliases reachable |
|---|---|---|
| success | `completed`, `done`, `ready`, `trusted`, `success` | `completed`, `ready` |
| warning | `warning`, `pending`, `dirty`, `open`, `scheduled` | `warning` |
| accent | `running`, `active`, `accent` | `running` |
| danger | `danger`, `error`, `failed`, `overdue`, `critical` | `failed` |
| neutral | `idle`, `neutral` | `idle` |

The reachable set is `{idle, ready, running, completed, warning, failed}`, confirmed from every
`AppStatusChip` call site: the literals `"running"`, `"completed"`, `"warning"`, `"idle"`; the
session status domain (`RuntimeWorkspace.tsx:32`); the weather status mapping
(`WeatherWorkspace.tsx:568-580`, which returns `idle` / `completed` / `warning` / `failed`); and
the rule-action tone resolver added by the S4 fix (`todayWorkflow.ts:232-242`, which returns
`ready` / `warning` / `idle`). `src/ui/desktop/shell.css:479` adds `status-error`, likewise
unreachable.

`done`, `trusted`, `success`, `pending`, `dirty`, `open`, `scheduled`, `active`, `accent`,
`danger`, `error`, `overdue`, `critical` and `neutral` — **14 rules** — have no producer anywhere
in the codebase.

**The mobile dot table is a second instance of the same table.** `src/ui/mobile/pages.css:585-606`
defines an equivalent alias table for `MobileStatusDot`, which renders `is-${tone}` rather than
`status-${tone}`:

| Bucket | Aliases defined | Aliases reachable |
|---|---|---|
| success | `ready`, `configured`, `trusted`, `success` | `ready`, `success` |
| warning | `pending`, `dirty`, `warning` | `pending`, `warning` |
| danger | `blocked`, `danger`, `error` | — |
| accent | `accent`, `running` | — |

`MobileStatusDot` has two call sites — `MobileAgentView.tsx:103` (`"ready"` / `"pending"`) and
`MobileSettingsView.tsx:124` (`"success"` / `"warning"`) — plus a `"ready"` default. So
`configured`, `trusted`, `dirty`, `blocked`, `danger`, `error`, `accent` and `running` are
unreachable: **8 more dead rules**, and a danger and an accent bucket that nothing can enter.

The first version of this finding counted only the desktop table and reported 14. The two tables
are the same pattern in two files, and the count that matters for a pruning pass is 22.

**The related finding in the same area was checked and is not a defect.** `AppStatusChip`'s
`tone` prop is a free string, and the family is written as five buckets with aliases so a caller
can pass the semantic name it already has. The unreachable aliases are the price of that
convenience.

**Disposition.** Accepted, recorded as a watch item. The alias tables are coherent as tables; the
dead entries are a pruning opportunity, not a bug.

---

## T6 — P3 — Both translation helpers return the key string on a miss, failing silently

`src/i18n/index.tsx:139` and `src/components/mobile/mobileText.ts:128`:

```js
const message = dict[key] ?? fallback[key] ?? key;   // i18n
return copy[locale][key] || copy["en-US"][key] || key; // mobileText
```

A missing key returns the key itself — no throw, no warning, no console output. Worse, in the
`en-US` locale the i18n fallback dictionary is `zh-CN`, so a key missing only from `en-US.ts`
silently renders **Chinese** rather than the key.

This is the mechanism that made T1 ship. The `t?.("…") || "English"` idiom was intended to catch a
missing translation; because the miss returns a truthy string, the idiom can never fire.

The `mobileText` helper has the same problem, but its `copy` objects are complete for both
locales, so no key is missing there today.

**Disposition.** Fixed. A locale-coverage test now fails the build when a referenced key is
undefined in either locale, which closes the silent-failure path that T1 slipped through.

---

## Verified against the standards — no findings

- **Lint.** `eslint src vite.config.ts --report-unused-disable-directives --max-warnings 0` exits 0
  with `jsx-a11y` enabled, including `label-has-associated-control` configured for
  `AppCheckbox` at depth 3.
- **Typecheck.** `tsc --noEmit` exits 0.
- **Locale parity.** 852 keys on both sides; 0 missing in either file; 0 empty values; 0 values
  equal to their own key; 0 duplicate key literals. `zh-CN.ts:958` assigns
  `zhCN["app.agent.recommend.patternReason"]` after the literal while `en-US.ts:165` has it inline
  — both counted, no drift.
- **Interpolation.** All 47 keys called with variables supply exactly the placeholders the locale
  strings contain, and every placeholder in those strings is supplied. The helper supports named
  placeholders only (`/\{(\w+)\}/g`); no locale string uses positional ones.
- **Dynamic key families.** All 30 template-literal `t(\`…\`)` call sites resolve to families that
  exist — `app.reminders.bucket.*`, `app.status.*`, `app.skills.category.*`, `app.weather.status.*`,
  `app.common.*`, `app.session.group.*`, `app.nav.group.*`, `app.mode.*`.
- **Class-name contract.** Every static `className`, `className:` slot prop and `joinClassNames(...)`
  argument in the TSX has a matching rule in `src/ui/**.css`; dynamic templates resolve to an
  existing family.
- **Token parity.** `src/theme/themeTokenParity.test.ts` compares all 19 palette entries against
  `tokens.css` in both themes.
- **Unused imports / dead exports.** `no-unused-vars` at `error` with `--max-warnings 0` passes.
