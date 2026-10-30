# Four-Axis Review — Quiet Ledger Redesign

## Identity

- Review ID: `MMGH-REVIEW-QUIET-LEDGER-004`
- Date: 2026-10-30
- Baseline under review: `master` = `origin/master` at `5ac4ca0` (last pre-redesign commit).
- Reviewed change set: `5ac4ca0..6f1281d` — 17 commits, 183 files, `+9,436 / −33,945`.
- Axes: Spec, Standards, Data, Compatibility.
- Reviewer: Qoder primary agent, single review context.
- Remediation: [`REMEDIATION.md`](REMEDIATION.md) — the authoritative disposition record.

## Why this review exists

The Quiet Ledger redesign replaced the product UI end to end: a new `--q-*` token layer, a new
MUI theme, nine rewritten mobile views, nine rewritten desktop workspaces, and a new style contract
test. It also shipped two behaviour fixes (reminder start-up seeding, settings draft hydration) and
a dependency refresh (MUI 9.5, `globals` 17, `rig` 0.45, `rusqlite` 0.41, both lockfiles, the
vendored-crate removal).

The redesign shipped with its own guards — `src/ui/styleContract.test.ts`,
`src/theme/themeTokenParity.test.ts`, `src/ui/tokenContrast.test.ts` — and its own design record
(`DESIGN.md`). Those guards prove the stylesheet matches the *rules as written*. They do not prove
the rules as written were the rules that were *approved*, and they cannot see defects that live in
the TypeScript layer. This review asks the remaining questions: where did the delivery diverge from
the approved plan and from `PRODUCT.md`, and what did the rewrite introduce that the guards could
not catch?

## Review Boundary

Included:

- Every file changed in `5ac4ca0..6f1281d` — `src/ui/**`, `src/theme/**`, `src/components/**`,
  `src/state/**`, `src/shell/**`, `src/i18n/**`, `src/CSS/App.css`, `DESIGN.md`, and the two
  behaviour fixes in `src/state/`.
- The dependency refresh and the vendored-crate removal, checked for behavioural drift rather than
  re-reviewed for lockfile layout (that was `MMGH-REVIEW-DEPS-REFRESH-003`).

Excluded:

- Live provider calls, real API keys, real user data, installer packaging, macOS/Linux targets.
- `node_modules/` and `src-tauri/target/`, which are build products, not reviewed sources.
- The Rust agent runtime's internal design, which `2026-10-16-rig-runtime-and-dependencies` covered.

## Verdict Summary

| Axis | Verdict | Findings |
|---|---|---|
| Spec | PASS with findings | 4 Major (P2), 2 Minor (P3) |
| Standards | PASS with findings | 3 Major (P2), 3 Minor (P3) |
| Data | PASS with findings | 1 Major (P2), 2 Minor (P3) |
| Compatibility | PASS with findings | 3 Major (P2), 6 Minor (P3) |

24 findings in total (11 P2, 13 P3). No Blocker and no Critical. The redesign delivered what it
promised structurally: the stylesheet collapse is gone (every structural class name in every TSX now
has a rule), the decorative layers stay deleted, the token layer is complete, and the contrast and
parity contracts hold.

**The defects the review did find are concentrated in the seams the contract test cannot reach** —
the TypeScript layer, the MUI theme's inline styles, and the two behaviour fixes — plus one
governance gap: the plan's CSS budget was replaced by a different number without saying so.

Four findings are user-visible without any unusual setup:

1. Two i18n keys referenced in the mobile skills view exist in neither locale, so the mobile
   "mounted on session" switch announces a raw translation key and the skill-generation textarea
   shows a raw translation key as its placeholder (T1).
2. The Agent skills sheet labels its toggles `"On"` / `"Add"` in hardcoded English, in a bilingual
   product (T2).
3. The MUI theme reintroduces the only two drop shadows in the codebase, with the only two raw
   `rgb()` colours, against the design system's own "hierarchy comes from background, hairline and
   spacing" rule (S2).
4. A reminder created — or back-dated — during a session never alarms, because the start-up
   seeding pass marks every currently-overdue reminder as already triggered (D1).

A fifth finding was a capability loss rather than a defect: the rewrite removed the rule-suggestion
surface from the desktop Today, which `PRODUCT.md` names as the page's responsibility and which the
plan only authorised removing on the phone (S4).

**All 19 fixable findings are fixed.** 19 findings were repaired in eight commits between
`c19e49a` and `5c2d9e0`; three were accepted and documented (S1, S5, C6) and two were accepted as
watch items (T4, T5). See [`REMEDIATION.md`](REMEDIATION.md).

## Findings Index

| ID | Axis | Severity | Summary | Status |
|---|---|---|---|---|
| S1 | Spec | P2 | The plan's CSS budget (≤2,600 lines) was replaced by 5,200 without recording the change | Accepted, documented |
| S2 | Spec | P2 | The MUI theme reintroduces drop shadows with raw `rgb()` colours | Fixed |
| S3 | Spec | P2 | Focus indicators do not follow `PRODUCT.md`'s 2px / 2px-offset rule in three places | Fixed |
| S4 | Spec | P2 | The redesign removed the rule-suggestion surface from the desktop Today, which `PRODUCT.md` names | Fixed |
| S5 | Spec | P3 | 51 bare spacing values bypass the `--q-space-*` tokens | Accepted, documented |
| S6 | Spec | P3 | The mobile "Done today" section left the heading outline | Fixed |
| T1 | Standards | P2 | Two i18n keys referenced in production exist in neither locale | Fixed |
| T2 | Standards | P2 | The Agent skills sheet hardcodes English `"On"` / `"Add"` labels | Fixed |
| T3 | Standards | P2 | The style contract test never scans `src/theme/AppThemeProvider.tsx` | Fixed |
| T4 | Standards | P3 | 291 orphaned locale keys (222 pre-existing, 69 redesign casualties) and 12 unused `mobileText` keys | Accepted, watch item |
| T5 | Standards | P3 | 22 unreachable status tone rules (14 desktop, 8 mobile) | Accepted, watch item |
| T6 | Standards | P3 | Both translation helpers return the key string on a miss, failing silently | Fixed |
| D1 | Data | P2 | A reminder created during the session never alarms | Fixed |
| D2 | Data | P3 | The settings hydration overwrites an edit made before the snapshot arrived | Fixed |
| D3 | Data | P3 | The rule-insight pipeline still runs for a surface that no longer exists | Fixed |
| C1 | Compatibility | P2 | MUI's scroll lock is applied to an element that is already locked | Fixed |
| C2 | Compatibility | P2 | Focus restoration fails when the sheet's trigger row was deleted | Fixed |
| C3 | Compatibility | P2 | The redesign created four invisible, unnamed keyboard tab stops | Fixed |
| C4 | Compatibility | P3 | The mobile menu does not expose the current view | Fixed |
| C5 | Compatibility | P3 | Repeated chip accessible names ("On", "Add", "Remove") | Fixed |
| C6 | Compatibility | P3 | MUI 9.5's opt-in `theme.focusVisible` stays disabled | Accepted, documented |
| C7 | Compatibility | P3 | The heading outline is inconsistent across the nine workspaces | Fixed |
| C8 | Compatibility | P3 | The desktop page title is focused on every view change, without a focus ring | Fixed |
| C9 | Compatibility | P3 | The desktop reminder severity is carried by colour alone | Fixed |
| R1–R3 | Compatibility | P2 / P3 / P3 | Three pre-existing defects the rewrite had the chance to fix | Retained, not counted |

## Evidence Observed

Commands run against the committed tree at `6f1281d`, and again after the fixes:

- `npm run lint` -> exit 0, zero warnings (`--max-warnings 0`).
- `npm run typecheck` -> exit 0.
- `npm run test:unit` -> **21 files, 95 passed, 3 skipped** (98 total), 8.00 s at `6f1281d`;
  **26 files, 113 passed, 3 skipped** (116 total) after the fixes.
- `npm run build` -> exit 0, 18 chunks emitted; `index.css` 86.27 kB (12.42 kB gzip) at `6f1281d`;
  84.9 kB after the fixes.
- `npm run test:rust` -> `mygh` **59 passed / 1 ignored**, 0 failed.
- CSS census (non-blank lines): at `6f1281d` — `base.css` 172, `primitives.css` 169,
  `tokens.css` 103, `desktop/shell.css` 571, `desktop/workspaces.css` 1,216,
  `desktop/tools.css` 1,079, `mobile/shell.css` 278, `mobile/pages.css` 613,
  `mobile/tools.css` 281, `App.css` 9 — **4,491 total**. At HEAD — `desktop/shell.css` 573,
  `desktop/workspaces.css` 1,244, `mobile/shell.css` 284, `mobile/pages.css` 617, the rest
  unchanged — **4,531 total**, against the 5,200 budget.
- `grep` for `box-shadow` across `src/` -> 4 hits, all `inset` in CSS; the only two *drop* shadows
  were `src/theme/AppThemeProvider.tsx:233` and `:316`, and both are gone.
- `grep` for `rgb(|rgba(|hsl(` across `src/` -> only the same two theme lines, now gone.
- Token resolution: 1,325 `var(--q-*)` references across the nine CSS files and 34 in the theme;
  **0 referenced-but-undefined**.
- Forbidden patterns: **0** `backdrop-filter`, **0** `gradient`, **0** raw hex outside the test's own
  pattern list.
- Heading census: **2** `<h1>` in the entire codebase — `MobileAppShell.tsx:100` and
  `DesktopShell.tsx:148` — and only one shell mounts at a time.
- Locale parity: `zh-CN.ts` and `en-US.ts` hold **852 identical keys**, 0 missing on either side,
  0 empty values, 0 duplicate literals.
- Orphaned locale keys, measured with the scan `src/i18n/localeCoverage.test.ts` already defines:
  **226** at the pre-redesign baseline `5ac4ca0` (847 keys), **294** at `6f1281d`, **292** at
  `262ddde`, **291** at HEAD (852 keys). Of the 291, **222 predate the redesign** and **69 are its
  casualties**; the redesign also re-used four keys that had been orphaned at the baseline
  (`app.music.progressLabel`, `app.music.mode.loop|single|shuffle`). `mobileText.ts` holds 61 keys
  per locale with identical key sets, 12 of them unused.
- Preserved contracts confirmed: `app.settings.title` still resolves to `"Provider"`,
  `app.settings.save` to `"Save settings"`; `data-testid="weather-workspace"`,
  `.desk-music`, `.desk-knowledge`, `.desk-weather` and the `.audio-console__library-toggle`
  `aria-expanded` contract are all still asserted by `WorkspaceStyleIsolation.test.tsx`.
- MUI 9.5 source inspection (`node_modules/@mui/material`): `ModalManager.handleContainer` writes
  `overflow: hidden` onto the `container` element; `Unstable_TrapFocus/FocusTrap.js` focuses
  `getFocusTarget(root) ?? root` on open and calls `nodeToRestore.current.focus()` on close.

## Independence and Limitations

- Single review context: the reviewer is the same agent that authored the reviewed commits.
- The review's own evidence was re-measured after the fixes, and three of its numbers did not
  survive: the orphaned-locale-key count (T4), the bare-spacing count (S5), and the unreachable
  tone-rule count (T5, which had only scanned the desktop table and missed the mobile one). Each
  finding now carries the measurement definition that produced its number, and each carries a
  paragraph recording what the first version claimed. The corrections are of the review's
  accounting, not of the code — no finding was withdrawn or downgraded as a result.
- No runtime diffing against the pre-redesign build; the mobile manual matrix (320/390/768/1280/
  1440 px, light/dark, zh/en) was executed during the redesign, not re-executed here.
- The review is static plus the automated suite. Rendering defects that only appear at a specific
  viewport or with a specific data shape would not be caught — the restored rule card was checked
  in a static harness at 1280 px in both themes instead, because it needs seeded recurring
  reminders to appear.
- The dependency refresh was checked for behavioural drift only; its lockfile layout was reviewed
  separately in `2026-10-30-dependency-refresh`.
