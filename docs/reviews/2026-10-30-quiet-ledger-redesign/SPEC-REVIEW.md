# Spec Review — Quiet Ledger Redesign

Axis of the four-axis review `MMGH-REVIEW-QUIET-LEDGER-004`.
Baseline `5ac4ca0`, reviewed change set `5ac4ca0..6f1281d`.

## Sources of truth

- The approved plan `tender-heath-elk.md` — the eight-phase Quiet Ledger rebuild.
- `PRODUCT.md` — the product contract. Per `DESIGN.md`'s own preamble, `PRODUCT.md` wins on
  conflict.
- `DESIGN.md` — the design record written *by* this change set. It is evidence of intent, not an
  independent authority; where it contradicts the plan or `PRODUCT.md`, that is itself a finding.

## Verdict

**PASS with findings — 4 Major (P2), 2 Minor (P3).**

The redesign's structural promises were met. Every one of the plan's nine mobile views and nine
desktop workspaces exists; the decorative layers stay deleted; the token layer is complete and
every `var(--q-*)` resolves; the desktop column geometry matches the plan's specification
(Today `minmax(0, 2fr) minmax(16rem, 1fr)`, Knowledge `18.75rem minmax(0,1fr)`,
Skills `18.75rem minmax(0,1fr) 20rem`); the mobile dock is a 4-column grid and the gallery and
weather metric grids are 2-column; `src/ui/desktop/pages.css` was deleted and nothing imports it;
`src/CSS/App.css` imports the nine layers in the order the plan fixed.

The failures are of four kinds: a budget that was quietly replaced, two places where the theme
reintroduces what the design system forbids, a focus indicator that does not match
`PRODUCT.md`, and a product capability that the rewrite removed without the plan authorising it.

---

## S1 — P2 — The plan's CSS budget was replaced without recording the change

**Plan, section 4:** "总预算：`src/ui/**/*.css` ≤ 2,600 行（目标约 2,100）；禁止 `backdrop-filter`、
`gradient`、裸 hex（`tokens.css` 的 oklch 除外）。"

**Delivered:** 4,491 non-blank lines across `src/ui/**` + `src/CSS/App.css` — 173% of the
approved ceiling, and 213% of the target.

```
 172  src/ui/base.css
 169  src/ui/primitives.css
 103  src/ui/tokens.css
 571  src/ui/desktop/shell.css
1216  src/ui/desktop/workspaces.css
1079  src/ui/desktop/tools.css
 278  src/ui/mobile/shell.css
 613  src/ui/mobile/pages.css
 281  src/ui/mobile/tools.css
   9  src/CSS/App.css
4491  total
```

**Where the number changed.** `src/ui/styleContract.test.ts:81` sets `CSS_LINE_BUDGET = 5200`, and
`DESIGN.md:102` documents "样式总预算 5,200 非空行（当前约 4,500）". Both are internally
consistent, and the test passes. But neither says that 5,200 supersedes the plan's 2,600 — the
figure 2,600 appears nowhere in the repository. A reader of `DESIGN.md` alone cannot tell that the
budget was raised.

**Why this is a finding and not a non-issue.** The budget exists to stop the stylesheet regrowing
toward the 45,000 lines that were deleted. At 5,200 the ceiling permits another 709 lines; at 2,600
it would have forced the desktop workspaces (1,216 + 1,079 = 2,295 lines alone) to be split or
simplified. The realistic reading is that the plan's figure was an estimate made before the work
was done, and the delivered stylesheet is the honest answer to how much CSS nine desktop
workspaces and nine mobile views need when nothing is decorative.

**Disposition.** Accepted. The delivered number is recorded; the plan's estimate was wrong. The
fix is to state the deviation, not to cut working styles to hit an estimate made in advance. The
budget stays enforced at 5,200 so the stylesheet still cannot regrow.

**Update after the fixes.** The remediation commits added 40 non-blank lines — `desktop/shell.css`
571 → 573, `desktop/workspaces.css` 1,216 → 1,244, `mobile/shell.css` 278 → 284,
`mobile/pages.css` 613 → 617 — for a total of **4,531**, leaving 669 lines of headroom under the
5,200 ceiling. `DESIGN.md` §3 now states that the plan's 2,600 was an estimate, that 5,200 is the
enforced figure, and what the current count is.

---

## S2 — P2 — The MUI theme reintroduces the only two drop shadows in the codebase

`src/theme/AppThemeProvider.tsx:233` (MUI `Menu`) and `:316` (MUI `Dialog`):

```js
boxShadow: "0 12px 32px rgb(0 0 0 / 0.16)",
boxShadow: "0 24px 64px rgb(0 0 0 / 0.24)",
```

`DESIGN.md` §1.1: "层级只来自底色差（`bg` / `surface` / `sunken`）、1px 分隔线与间距。**不使用玻璃
拟态、渐变、阴影堆叠或装饰场景。**" §5: "**面板**：`.panel-surface` 是唯一的卡片外观：`surface`
底、1px `border`、8px 圆角，**不加阴影**。"

These two lines are the **only** drop shadows in `src/` — the four `box-shadow` declarations in the
stylesheet are all `inset` hairlines — and they are the **only** raw `rgb()` colours in `src/`.
There is no `--q-shadow` token; the design system's entire elevation vocabulary is
background + border.

The shadows are also invisible to `styleContract.test.ts`: the test scans `src/ui/**.css` and
`src/CSS/App.css`, and never opens `src/theme/`. See T3.

**Disposition.** Fixed. Both overlays lose the shadow and gain the system's 1px `border` and 8px
radius, which is what the design system says a raised surface looks like.

---

## S3 — P2 — Three focus indicators do not follow `PRODUCT.md`

`PRODUCT.md`, Visual Ergonomics: "焦点使用 `2px` 实线，偏移 `2px`，只在 `:focus-visible` 出现。
鼠标点击不留下永久焦点框。"

`DESIGN.md` §2 documents the same rule in the token table: "`--q-focus` … 2px 焦点环，offset 2px".
`src/ui/base.css:65` implements it correctly as a global `:focus-visible` rule.

Three places diverge:

1. **`src/theme/AppThemeProvider.tsx:162`** — `MuiOutlinedInput` focused state uses
   `boxShadow: "0 0 0 1px var(--q-accent)"`. One pixel, no offset.
2. **`src/theme/AppThemeProvider.tsx:268`** — `MuiSlider` thumb focus uses
   `boxShadow: "0 0 0 6px var(--q-accent-soft)"`. A six-pixel soft halo, not the token ring.
3. **`src/ui/mobile/shell.css:33`** — `.mobile-topbar__title { outline: none }`. This class is the
   shell's `<h1 id="mobile-page-title" tabIndex={-1}>`, which `MobileAppShell.tsx:76` focuses on
   every view change. `shell.css` is imported after `base.css` (`src/CSS/App.css:2` vs `:7`), so
   the blanket `outline: none` beats `base.css`'s `:focus-visible` rule for that element.

On (3): the element is `tabIndex={-1}`, so it is never in the tab order and a mouse user never
leaves a ring on it. But a keyboard user who switches views with the keyboard lands focus on it,
and `outline: none` means the focus ring the design system promises is not drawn. The precise fix
is to scope the suppression to `:focus:not(:focus-visible)`, which keeps the ring for keyboard
focus and removes it for pointer focus.

**Disposition.** Fixed. All three use the `2px` / `2px`-offset `--q-focus` ring.

---

## S4 — P2 — The redesign removed the whole rule-suggestion capability from Today

`PRODUCT.md`, Information Architecture: "今日：未完成提醒、可续接会话、最近捕获和**规则建议**。它是开工页，
不是仪表盘装饰。"

The plan authorised two deletions:

- Phase 3 (mobile Today): "**删除信号网格与规则建议**".
- Phase 6 (desktop Today): "右栏「今日回顾」只保留 2–3 条信号，**删除重复规则卡**".

The desktop instruction deletes the *duplicate* rule card; it keeps one. The implementation deleted
all three rule surfaces from the desktop view as well.

`git show 5ac4ca0:src/components/TodayWorkspace.tsx` shows what was there before:

| Surface | Pre-redesign markup | Data source |
|---|---|---|
| Rule actions | `<details open className="today-rule-block">` — `app.today.review.rule.actionTitle`, with promote and unmount buttons | `ruleActionRecommendations` |
| Rule effectiveness | `<details className="today-rule-block">` — `app.today.review.ruleTitle`, a signal grid plus an insight list | `ruleEffectivenessSignals`, `ruleEffectivenessInsights` |
| Recurring patterns | `app.today.review.recurringTitle` — a pattern list with counts | `recurringPatternInsights` |

After the redesign, `TodayWorkspace.tsx` receives none of `ruleActionRecommendations`,
`ruleEffectivenessSignals`, `ruleEffectivenessInsights` or `recurringPatternInsights`
(`git diff 5ac4ca0..6f1281d -- src/state` shows all of them removed from the props list), and the
mobile view lost its rule block. The right column now holds 今日回顾 with three count signals
(`src/utils/todayInsights.ts:117-161`) and nothing else.

So the capability named in `PRODUCT.md` is no longer surfaced on either shell.

**Why the mobile deletion is fine and the desktop deletion is not.** The plan's scope statement
("移动端允许删除低价值/重复模块") and its Phase 3 instruction explicitly authorise removing the
rule block on the phone, where a compact list of rules is low-value. The desktop Today is the
product's opening page and the plan asked for *one* rule card there, not zero. `PRODUCT.md` wins
on conflict — `DESIGN.md`'s own preamble says so — and the desktop page is the one the contract is
about.

**The cost of the removal was not paid.** The machinery still runs (see **D3** in the Data axis):
the rule-effectiveness model, the signal set and the action recommendations are still derived on
every render, two of them are still shipped across the mobile shell boundary, and two handlers that
mutate workspace state (`handleOpenReminderPattern`, `handlePromoteReminderPattern`) are retained
with no caller. The feature was disconnected from its surface, not removed.

**Disposition.** Fixed. The desktop Today regains one compact rule-suggestion card built on the
existing `ruleActionRecommendations` — the action list, which is the surface the plan kept — while
the duplicate effectiveness card and the recurring-pattern card stay deleted. The mobile rule block
stays deleted, as the plan authorised. The plumbing with no consumer is removed.

---

## S5 — P3 — 51 bare spacing values bypass the `--q-space-*` tokens

`DESIGN.md` §2: "间距只有 `--q-space-1` … `--q-space-10`（0.25rem 步进，含 7 / 8 / 10 / 12 档），
**不写裸间距**。"

Tally of `padding*` / `margin*` / `gap` / `row-gap` / `column-gap` declarations in
`src/ui/**/*.css` whose value is a bare length (no `var(--q-*)`), with the token definitions in
`tokens.css` excluded:

| Value | Count | Example |
|---|---|---|
| `2px` | 40 | `src/ui/desktop/shell.css:33` |
| `-1px` | 2 | `src/ui/base.css:190` |
| `0.375rem` | 2 | `src/ui/desktop/tools.css:433` |
| `1px` | 2 | `src/ui/desktop/tools.css:687` |
| `0.25rem` | 1 | `src/ui/desktop/tools.css:174` — duplicates `--q-space-1` |
| `5rem` | 1 | `src/ui/desktop/tools.css:237` — scroll offset, not a spacing step |
| `-0.125rem` | 1 | `src/ui/mobile/pages.css:368` |
| `-6px` | 1 | `src/ui/mobile/shell.css:296` |
| `-8px` | 1 | `src/ui/mobile/shell.css:297` |

**51 in total** at HEAD; **50** at `6f1281d`, the extra one being a `2px` gap added by the
restored rule card. One of these is a literal token value written out (`0.25rem` = `--q-space-1`);
the rest are half-steps or hairline nudges that no token covers. The `5rem` on
`.audio-console__lyrics-track` is a functional scroll offset for the active lyric line, not a
spacing step.

Most of the 40 `2px` values are the gap between a status dot and its label — a sub-token
hairline that the 0.25rem scale cannot express. This is a systematic gap in the token set, not 51
separate mistakes.

**Correction after an independent measurement.** The first version of this finding claimed "47 bare
spacing values" and listed a `1.75rem` row. Neither number was right: the table's own rows summed
to 50, which is the figure the same definition produces at `6f1281d`, and the `1.75rem` row was an
artefact of the scan matching the token *definitions* `--q-space-7: 1.75rem` and
`--q-mobile-gap: 1.75rem` in `tokens.css`. The genuine `1.75rem` uses are `width` / `height` /
`min-height` — sizing, not spacing. The finding's substance is unaffected: the hairlines are real
and the token scale genuinely does not cover them.

**Disposition.** Accepted and documented. The token scale is the rule; the hairline half-step is
the exception, and it is now recorded rather than left implicit.

---

## S6 — P3 — The mobile "Done today" section left the heading outline

`src/components/mobile/MobileTodayView.tsx:120-125` — the "Done today" block is a
`<details><summary>` with the count in a `<span>`. Every other mobile section uses
`<MobileSectionHead line><h2>…</h2></MobileSectionHead>` (`MobileTodayView.tsx:66`, `:105`;
`MobileRemindersView.tsx:138`; `MobileSettingsView.tsx:62`, `:122`, `:146`;
`MobileWeatherView.tsx:114`, `:131`).

The section is a real, collapsible region of the Today page, so it belongs in the outline. A
`<summary>` is a legitimate accessible control, but it is not a heading, and a screen-reader user
navigating by heading now skips the section entirely — they reach the end of the list with no
indication that a completed group exists.

This was introduced by the redesign (`c0fca5c`): before it, the block carried its own heading.

**Disposition.** Fixed. The summary keeps its disclosure behaviour and gains a heading.

---

## Verified against the plan — no findings

- **Token contract.** All 73 tokens defined; 1,319 `var(--q-*)` references across the nine CSS
  files plus 31 in the theme; **0 referenced-but-undefined**. The token-parity test proves the MUI
  palette matches `tokens.css` value-for-value in both themes.
- **Contrast.** `src/ui/tokenContrast.test.ts` holds: text/bg 15.96 light / 17.27 dark,
  muted/bg 7.47 / 10.24, faint/bg 4.86 / 6.64, accent-ink/accent 5.35 / 8.46, control/surface
  4.58 / 3.61, status colours 6.00–6.41 / 8.44–11.16 against background and ≥5.54 / ≥6.75 against
  their own soft backgrounds — all above the `PRODUCT.md` floors (7 / 4.5 / 3 / 4.5 / 3 / 4.5).
- **Forbidden patterns.** 0 `backdrop-filter`, 0 `gradient`, 0 raw hex in `src/ui/**`; `tokens.css`
  contains no hex at all.
- **Decorative layers stay deleted.** All 12 names in the contract test's ban list are absent from
  both the stylesheets and the TSX.
- **Style architecture.** `src/CSS/App.css` imports the nine layers in the plan's fixed order;
  `src/ui/desktop/pages.css` is gone and no file imports it.
- **Column geometry.** Today `minmax(0, 2fr) minmax(16rem, 1fr)`; Agent `minmax(0,1fr) 18rem`;
  Knowledge `18.75rem minmax(0,1fr)`; Reminders `15rem minmax(0,1fr) 21rem`; Skills
  `18.75rem minmax(0,1fr) 20rem`; shell `var(--q-nav-w) minmax(0,1fr)`.
- **Mobile shell.** `.mobile-app` is a `100dvh` flex column with a single scroll container
  (`.mobile-main`), 4-column dock, 44px touch targets, and `.mobile-main`'s bottom padding
  accounts for dock + transport + safe-area.
- **Density.** The mobile Today page keeps hero + one primary CTA + todo rows + ≤3 sessions +
  a collapsed "done" group; the signal grid and rule suggestions are gone.
- **MUI alignment.** `createTheme({ cssVariables: { cssVarPrefix: "mui", nativeColor: true } })`
  inside `<StyledEngineProvider injectFirst>`; `CssBaseline` carries only the reset.
