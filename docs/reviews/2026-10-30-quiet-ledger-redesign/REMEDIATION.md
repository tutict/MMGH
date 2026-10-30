# Remediation — Quiet Ledger Redesign Review

Review: `MMGH-REVIEW-QUIET-LEDGER-004` · 2026-10-30 · Reviewed range `5ac4ca0..6f1281d`.

This file is the authoritative disposition record for the four-axis review. The axis documents
(`SPEC-REVIEW.md`, `STANDARDS-REVIEW.md`, `DATA-REVIEW.md`, `COMPATIBILITY-REVIEW.md`) hold the
evidence; this file holds what was done about it.

## Outcome

| Outcome | Count | Findings |
|---|---|---|
| Fixed | 19 | S2, S3, S4, S6, T1, T2, T3, T6, D1, D2, D3, C1, C2, C3, C4, C5, C7, C8, C9 |
| Accepted, documented | 3 | S1, S5, C6 |
| Accepted, watch item | 2 | T4, T5 |

24 findings were counted in the verdicts (11 P2, 13 P3). No Blocker, no Critical. Three
pre-existing defects (R1–R3) were recorded without being counted; they are listed at the end.

**No finding changed status as a result of the re-measurement.** Three of the review's own
counts were wrong when re-measured after the fixes — the orphaned-locale-key count in T4, the
bare-spacing count in S5, and the unreachable tone-rule count in T5, which had only scanned the
desktop alias table and missed the mobile one. Each axis document now states the definition
that produced its number and records what the first version claimed. All three corrections
strengthened or left the findings as they were.

## Fix commits

Each commit carries one concern and nothing else.

| Commit | Subject | Findings closed |
|---|---|---|
| `c19e49a` | fix(theme): 用边框与统一焦点环替代阴影与两处焦点偏差 | S2, S3 |
| `11a2cc8` | test(ui): 让样式契约覆盖主题内联样式与原始色值 | T3 |
| `306d63e` | fix(i18n): 修正失效键位并让翻译缺失可见 | T1, T2, T6 |
| `14cd17e` | fix(a11y): 修复重做引入的无障碍契约回退 | S6, C3, C4, C5, C7, C8, C9 |
| `8d0ca2c` | style(ui): normalise RuntimeWorkspace line endings to LF | line-ending normalisation for the file the a11y fix rewrote |
| `527d1a8` | fix(mobile): 让弹层独占滚动并保证焦点回到壳内 | C1, C2 |
| `262ddde` | fix(state): 修复逾期待办静默与设置首屏水合的两处状态缺陷 | D1, D2 |
| `5c2d9e0` | fix(today): 恢复桌面今日的规则建议卡并清理无消费者的管线 | S4, D3 |

## Per-finding record

### S2 — The MUI theme reintroduces drop shadows with raw `rgb()` colours — Fixed (`c19e49a`)

The two `box-shadow` declarations in `src/theme/AppThemeProvider.tsx` are gone; the surfaces that
carried them are separated by a 1px `--q-border` instead. The only `rgb()` values left in `src/`
are inside the contrast test's own fixture.

### S3 — Three focus indicators do not follow `PRODUCT.md` — Fixed (`c19e49a`)

The `OutlinedInput` focus `boxShadow` and the `Slider` thumb halo now use the `2px` / `2px`-offset
`--q-focus` ring, so the app has exactly one focus indicator.

### S4 — The redesign removed the rule-suggestion surface from the desktop Today — Fixed (`5c2d9e0`)

The desktop Today regains one compact **建议动作** card, built on the existing
`ruleActionRecommendations` and the existing copy, in the Quiet Ledger vocabulary: a title, a
status chip, one meta line, one reason line and a single action button per row. The duplicate
effectiveness card and the recurring-pattern card stay deleted, and the mobile rule block stays
deleted, as the plan authorised.

The card was checked in a static harness at 1280 px in both themes before the commit.

### S6 — The mobile "Done today" section left the heading outline — Fixed (`14cd17e`)

The disclosure keeps its behaviour and gains a real heading.

### T1 — Two i18n keys referenced in production exist in neither locale — Fixed (`306d63e`)

`app.skills.mountedOnSession` and `app.skills.forge.description` were added to both locales.

### T2 — The Agent skills sheet hardcodes English labels — Fixed (`306d63e`)

The `"On"` / `"Add"` literals moved into `src/components/mobile/mobileText.ts`.

### T3 — The style contract test never scans the MUI theme — Fixed (`11a2cc8`)

`src/ui/styleContract.test.ts` now reads `src/theme/AppThemeProvider.tsx` alongside the
stylesheets, so a shadow or a raw colour reintroduced in the theme fails the contract.

### T6 — Both translation helpers return the key string on a miss, failing silently — Fixed (`306d63e`)

`t()` and `mobileText()` now report a missing key in development, de-duplicated by language and
key, and `src/i18n/localeCoverage.test.ts` fails the build when a referenced key is absent from
either locale.

### D1 — A reminder created during the session never alarms — Fixed (`262ddde`)

The controller hands the hook the moment the workspace became available (`workspaceReadyAt`); the
hook silences a reminder only when it was both created before that anchor and already overdue at
it. The judgement is per reminder, so it no longer depends on when the list happens to arrive.
Covered by four hook tests and one App-level test; the tests were verified to fail against the
pre-fix implementation.

### D2 — The settings hydration overwrites an edit made before the snapshot arrived — Fixed (`262ddde`)

The controller records the fields the user actually edited and keeps their values through the
first hydration, while the untouched fields are still filled in from the workspace. Covered by
`src/App.settingsHydration.test.tsx`, verified to fail against the pre-fix implementation.

### D3 — The rule-insight pipeline still runs for a surface that no longer exists — Fixed (`5c2d9e0`)

`buildRuleEffectivenessSignals`, `resolvePatternStatusTone`, `resolveRuleEffectivenessTone`,
`handleOpenReminderPattern` and `handlePromoteReminderPattern` are deleted, along with the two
rule fields that were still threaded across the mobile shell boundary. The pipeline that feeds
the restored card (`buildRecurringPatternInsights` → `buildRuleEffectivenessInsights` →
`buildRuleActionRecommendations`) is kept, and now has a consumer.

### C1 — MUI's scroll lock lands on an element that is already locked — Fixed (`527d1a8`)

`.mobile-app:has(.mobile-sheet-host) .mobile-main { overflow: hidden }` locks the element that
actually scrolls. The style contract asserts the rule exists.

### C2 — Focus restoration fails when the sheet's trigger row was deleted — Fixed (`527d1a8`)

`MobileSheet` records the trigger on open and restores it on close with the same `isConnected`
guard the desktop shell already used, falling back to the sheet's own close control.

### C3 — Four invisible, unnamed keyboard tab stops — Fixed (`14cd17e`)

The four file inputs now go through `src/components/ui/AppFileInput.tsx`, which takes them out of
the tab order and the accessibility tree. The visible button is the single control for each
action.

### C4 — The mobile menu does not expose the current view — Fixed (`14cd17e`)

The menu rows carry the same `aria-current` as the dock.

### C5 — Repeated chip accessible names — Fixed (`14cd17e`)

Each chip's accessible name includes the item it acts on.

### C7 — The heading outline is inconsistent across the nine workspaces — Fixed (`14cd17e`)

The Agent and Knowledge pages get their headings back, the three `<h3>`-only workspaces gain an
`<h2>`, and the Knowledge empty state stops duplicating the sidebar's control.

### C8 — The desktop page title is focused without a focus ring — Fixed (`14cd17e`)

`.desk-header h1:focus:not(:focus-visible) { outline: none }` scopes the suppression to the
pointer case, so the focus the shell moves to the title on every view change is visible.

### C9 — The desktop reminder severity is carried by colour alone — Fixed (`14cd17e`)

The row's meta line carries the severity as text beside the dot.

## Accepted findings

| ID | Why it is accepted | What would close it |
|---|---|---|
| S1 | The plan's CSS budget was replaced by a different number without being recorded. The number is now recorded in `DESIGN.md`; the file itself was never wrong, only undocumented. | — |
| S5 | 51 bare spacing values bypass the `--q-space-*` tokens. They are hairline half-steps the 0.25rem scale cannot express, mostly the 2px gap between a status dot and its label. The token scale is the rule; the hairline is the documented exception. | A `--q-hairline` token would absorb most of them. |
| C6 | `theme.focusVisible` stays disabled so the product has exactly one focus ring. The two overrides that decision forced were removed by S3. | Enable the MUI option only after the `--q-focus` rule and the MUI ring are reconciled. |
| T4 | 291 orphaned locale keys and 12 unused `mobileText` keys. Pruning them is mechanical but a key reachable only through a template literal is invisible to a static scan. 222 of the orphans predate the redesign; 69 are its casualties. | Its own commit, after the S4 fix moved seven keys back into use (291 orphans remain, down from 294 before the fixes). A dead-key assertion in `localeCoverage.test.ts` would stop the count drifting in either direction. |
| T5 | 22 unreachable status tone rules — 14 in the desktop `status-*` table and 8 in the mobile `is-*` table. An alias table is a lookup table; an unused alias costs one line. | A pruning pass over `src/ui/primitives.css` and `src/ui/mobile/pages.css`. |

## Pre-existing defects retained — not counted in the verdict

| ID | Defect |
|---|---|
| R1 | MUI `select` fields have no accessible name (`ReminderWorkspace.tsx`). |
| R2 | Two controls named "Close" in the completion dialog. |
| R3 | The Music page repeats the same string as `<h1>` and `<h2>`. |

## Verification after the fixes

| Command | Result |
|---|---|
| `npm run lint` | exit 0, zero warnings (`--max-warnings 0`) |
| `npm run typecheck` | exit 0 |
| `npm run test:unit` | **26 files, 113 passed, 3 skipped** (116 total) |
| `npm run build` | exit 0; `index.css` 84.9 kB |
| `npm run test:rust` | `mygh` **59 passed / 1 ignored**, 0 failed |
| CSS census (non-blank lines) | 4,531 across the ten layers — 669 under the 5,200 budget |

The five new test files added by the fixes (`useReminderAlerts.test.ts`,
`App.settingsHydration.test.tsx`, `MobileSheet.test.tsx`, `TodayWorkspace.test.tsx`,
`localeCoverage.test.ts`) raise the suite from 21 files / 95 tests to 26 files / 116 tests.
