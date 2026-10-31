# Spec Review — Frontend Refinement & Capability Assessment

Axis of the four-axis review `MMGH-REVIEW-FRONTEND-REFINEMENT-005`.
Baseline `a419f76`, reviewed change set `a419f76..95aa9d7`.

## Sources of truth

- The approved plan `sleek-lake-osprey.md` — the mobile-first + desktop refinement (Steps 0–9).
- `PRODUCT.md` — the product contract. The refinement was scoped as a *refinement*: keep the
  identity, information architecture, copy and behaviour; change density, hierarchy and detail.
- `DESIGN.md` — the design record written *by* this change set; evidence of intent, not an
  independent authority.
- For the assessment workstream: the committed evaluation docs (`eval/ragas/` and the README
  section) that define the intended scoring contract.

## Verdict

**PASS with findings — 1 Minor (P3).**

The plan's design directions were delivered and measured on both shells:

- **One row syntax.** Row titles 0.875rem/600, meta 0.75rem/400 single line, 56px mobile rows;
  one `.section-head` (0.75rem/600 muted) and one segmented control instead of the previous nine
  and four implementations — confirmed by the `primitives.css` consolidation and by the style
  contract's class-coverage rule.
- **One container.** Lists sit on the page with hairline separators; `.panel-surface` collapsed
  to one selector group; cards remain only where grouping semantics need them (sheets, dialogs,
  Today review, Agent thread).
- **Type floor.** Meta text bottoms out at 0.75rem; `--q-text-2xs` only on dock labels and
  numeric badges; desktop `<h1>` 1.5rem (24px measured), mobile 1.125rem (18px measured);
  `text-transform: uppercase` is banned by the style contract and the scan finds zero
  occurrences.
- **Accent discipline.** One solid accent per screen (Send / New / Save); outlined chips
  neutral, selected state `--q-selected` + 600; sliders and switches neutral — with one
  exception caught by this review (C1: the skills chip), fixed in `95aa9d7`.
- **Touch floor.** At 390 and 320 the probe finds **0** clickable rects below 44×44.
- **Composer and transport.** The mobile composer sits above the dock at any scroll position
  (`bottom: calc(var(--q-mobile-dock) + env(safe-area-inset-bottom))`); desktop sticky rails and
  stage padding subtract `--q-desk-transport` via `.desk:has(.desk-transport)` (80px measured at
  761px).
- **Breakpoints.** The two unreachable 720px media queries are gone; 900/901 (nav 200↔240),
  1180, 1399/1599/1600 and 1400 behave as the plan specifies (probe-measured).
- **Docs.** `DESIGN.md` and `CHANGELOG.md` carry the final numbers, including the honest
  statement that the stylesheet grew instead of shrinking (S1).

The single failure is a number: the stylesheet did not reach the plan's net-reduction target,
and the review round's chip fix pushed it onto the checkpoint line.

---

## S1 — P3 — The stylesheet ends at 4,650 lines, above the plan's 4,300–4,500 target

**Plan:** "CSS 预算：现 4,531 非空行，预计净减 ~170，目标 4,300–4,500；任一步超过 4,650 立即回头合并重复项。"

**Delivered:** **4,650 non-blank lines** — a net **+159** from the 4,491 the refinement started
from, and exactly at the plan's own "go back and merge" checkpoint.

```
 172  src/ui/base.css
 215  src/ui/primitives.css
 100  src/ui/tokens.css
 593  src/ui/desktop/shell.css
1248  src/ui/desktop/workspaces.css
1054  src/ui/desktop/tools.css
 295  src/ui/mobile/shell.css
 622  src/ui/mobile/pages.css
 342  src/ui/mobile/tools.css
   9  src/CSS/App.css
4650  total
```

**Why it grew.** The consolidation deleted the duplicates (nine section heads → one, four
segmented controls → one, eight `.panel-surface` copies → one selector group), but the same
round added the new grammar's own rules: the composer/dock padding calc, the transport-aware
`:has()` offsets, scroll-snap and 44px touch sizing, the fold breakpoints at 1399/1599/1600,
and per-page empty-state and hero rules the purge had taken out. Consolidation removes
duplication; a new grammar adds rules. The two did not cancel.

**The checkpoint rule was honored.** The review round's chip grammar pushed the count to 4,651 —
one line over the checkpoint — and the round went back and merged (`background: transparent;`
dropped from the chip rules, MUI outlined's default) to land exactly on 4,650. The hard budget
5,200 holds with 550 lines of headroom.

**Disposition.** Accepted. The number is recorded in `DESIGN.md` §3 with the delta and the
missed target stated plainly. Cutting working rules to hit an estimate made before the grammar
existed would trade real UI states for a rounder number. The contract test still blocks
regrowth at 5,200.

---

## Spec confirmations (no finding)

- Step 0's two commits landed as planned (a11y names; Node engines + `--configLoader native`,
  mirrored in the README).
- Token step: 4 dead tokens removed, `--q-desk-transport` added, theme `h1` and `base.css` now
  agree at 1.5rem, sliders/switches neutral, `uppercase` added to the style contract's ban list.
- The plan's test-impact table held: `MobileSheet`, `MobileAppShell` (dock = 4 buttons),
  `frontendAccessibility`, `WorkspaceStyleIsolation`, `TodayWorkspace`, `SkillWorkspace`,
  `styleContract`, `tokenContrast`, `themeTokenParity` all green without assertion changes.
- The assessment workstream matches its documented contract: one sample per dataset case,
  offline metrics plus project metrics, gated against the committed `baseline.json`; the harness
  drives the production prompt-assembly path (`agent::mod`) rather than a copy.
