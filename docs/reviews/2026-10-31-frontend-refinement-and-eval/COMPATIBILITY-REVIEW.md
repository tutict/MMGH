# Compatibility Review — Frontend Refinement & Capability Assessment

Axis of the four-axis review `MMGH-REVIEW-FRONTEND-REFINEMENT-005`.
Baseline `a419f76`, reviewed change set `a419f76..95aa9d7`.

## Scope

Breakpoints and viewport behaviour, themes, keyboard and screen-reader affordances, and the
runtime seams this set touched (MUI overrides, the audio element, Vite's native config loader).

## Verdict

**PASS with findings — 1 Major (P2), fixed.**

Probe evidence (CDP, Chrome headless 9222, `npm run dev:web`):

- **320×568 and 390×844** — one `<h1>` at 18px, no horizontal overflow
  (`documentElement.scrollWidth ≤ innerWidth`), and **0** clickable elements below 44×44.
- **1280×800** — Agent chat column 704px (plan floor 660px), `.runtime-thread` scrolls
  internally so the shell never scrolls, `<h1>` 24px.
- **Breakpoint sweep** — nav 200px at 900 / 240px at 901; Agent detail rail folded at 1599 and
  restored at 1600; 761 music and settings render without overflow with the transport-aware
  stage padding (80px). The two permanently-dead 720px media queries from before are gone.
- **Themes** — both themes come from the untouched OKLCH token layer; `themeTokenParity` and
  `tokenContrast` pass unchanged, and this round introduced no new colour values.
- **Keyboard** — the sheet focus-return contract (`MobileSheet.test.tsx`) and the fallback to
  `#mobile-page-title` hold; the file inputs remain out of the tab order; focus rings stay the
  single 2px/2px-offset `--q-focus` ring.
- **Reduced motion** — the `prefers-reduced-motion` block survives in `base.css`; this round
  added no new transitions.

---

## C1 — P2 — The mobile Agent skills chip measured 32px, and its mounted state filled with accent — Fixed (`95aa9d7`)

**Measured (probe, 390px):** the MUI `Chip` behind the skills toggles rendered **32px** tall —
below the 44px touch floor the refinement enforced on segmented controls, weather actions,
music controls and the Agent bar — and the mounted variant filled with the accent colour while
the page's Send button already holds the screen's one solid accent. It also had no
`aria-pressed`, so the mounted/unmounted distinction was colour-only.

**Fix:** `min-height: var(--q-touch)`, neutral outlined chip (hairline border, muted text,
`--q-sunken` hover), mounted state `--q-selected` background + `aria-pressed`, label and
accessible name from the locale files naming the skill. Probe after the fix: 4 chips all ≥44px,
mounted background `oklch(0.945 0.02 250)` = `--q-selected`.

## R1 — Retained, not counted — Desktop compact controls stay 28px

`.section-head .ghost-button` and sibling desktop compact controls remain ~28px tall. The 44px
floor is a *touch* floor, and the plan scoped it to the mobile shell; the desktop shell is
pointer-targeted and its 28px controls follow the desktop row grammar (36px rows, 28px buttons)
the refinement established. Retaining is the deliberate reading of the plan; if MMGH ever
targets touch-capable desktops, this becomes a real finding. Not counted.

## Probe false alarms, cleared on re-measurement

Recorded so the methodology is auditable — none of these is a product defect:

1. **Send hit-test miss.** `elementFromPoint` at the Send button's centre returned the actions
   container, not the button. Cause: with an empty draft the disabled MUI button carries
   `pointer-events: none`, so the hit test hits its parent. With a draft filled, the hit lands
   inside Send. Behaviour is correct; the probe needed a non-empty draft.
2. **"Transport absent" on the music view.** The desktop transport is hidden on the music view
   by design (`showMiniPlayer = currentView !== "music"`); the probe initially read its absence
   there as a failure. On Today at 761px with a persisted track, the transport is present and
   the stage padding is transport-aware (80px).
3. **Stale-page crash under Vite HMR.** Pages left open across hook-signature changes threw
   `onAlert is not a function` — an old controller with a new hook module. Fresh loads behave;
   the probe harness now opens a clean target per run.

## Compatibility confirmations (no finding)

- **MUI 9.5 overrides stay on documented surfaces.** The Switch/Slider calibration touches size
  and colour slots only; no private DOM structure is assumed (the 9.2-pin review's finding that
  the app renders no MUI `Select` still holds, and this round adds none).
- **Node/Vite toolchain.** `engines` + `--configLoader native` behave on Node 24; the production
  build emits 18 chunks cleanly.
- **Audio.** The reminder tone reuses the existing `/reply-pulse.mp3` asset — no new network
  fetch, and the `HTMLMediaElement.load()` jsdom notice comes from the existing music stack,
  not the alert path.
- **i18n at runtime.** Both locales verified on the probed views; no raw keys or hardcoded
  labels surfaced in any screen the probes visited.
