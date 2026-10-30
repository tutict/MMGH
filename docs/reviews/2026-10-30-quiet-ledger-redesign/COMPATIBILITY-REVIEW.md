# Compatibility Review — Quiet Ledger Redesign

Axis of the four-axis review `MMGH-REVIEW-QUIET-LEDGER-004`.
Baseline `5ac4ca0`, reviewed change set `5ac4ca0..6f1281d`.

## Sources of truth

- `PRODUCT.md` §Accessibility: "以 WCAG 2.1 AA 为下限 … 键盘焦点可见，控件有可访问名称，页面标题可被聚焦。
  状态同时使用颜色、文字、数字或形状。"
- `PRODUCT.md` §Visual Ergonomics: "焦点使用 `2px` 实线，偏移 `2px`，只在 `:focus-visible` 出现。"
- The approved plan §7 (manual matrix): "弹层：底部贴合、内容可滚动、动作区可见、Esc/遮罩关闭、
  **关闭后焦点回到触发按钮**、打开时 dock/transport 隐藏。"
- `node_modules/@mui/material` (MUI 9.5.0) — the modal, focus-trap and scroll-lock internals the
  redesign now depends on.

## Verdict

**PASS with findings — 3 Major (P2), 6 Minor (P3).**

Every contract the redesign promised to keep is kept: the preserved accessible names, the
`data-testid` hooks, the `.audio-console__library-toggle` `aria-expanded` pair, the single `<h1>`
per shell, the desktop dialog's focus trap and restore. Nothing in the change set breaks an
existing integration point.

The findings are in the seams between the new CSS and the MUI primitives the redesign adopted —
scroll locking, focus restoration, visually hidden inputs — plus a set of heading-outline and
accessible-name inconsistencies the rewrite left behind.

Three pre-existing defects were found during the review and are recorded at the end. They were not
introduced by this change set and are not counted in the verdict.

---

## C1 — P2 — The mobile sheet's scroll lock is applied to an element that is already locked

`src/components/mobile/MobileSheet.tsx:37-40` points MUI's modal container at the shell root:

```jsx
container={() =>
  (portalAnchorRef.current?.closest(".mobile-app") as HTMLElement | null) ??
  portalAnchorRef.current
}
```

MUI 9.5's `ModalManager.handleContainer`
(`node_modules/@mui/material/Modal/ModalManager.js:98-156`) derives its scroll-lock target from
that container: `scrollContainer = container`, then writes `overflow`, `overflow-x` and
`overflow-y` as `hidden` onto it.

But the shell's own stylesheet already locks that element, and locks a *different* one as the
scroller (`src/ui/mobile/shell.css`):

```css
.mobile-app { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }   /* :1-8 */
.mobile-main { display: flex; flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }  /* :48-56 */
```

So MUI's scroll lock writes `overflow: hidden` onto an element that is already `overflow: hidden`,
and `.mobile-main` — the only element that actually scrolls — is never touched. While a sheet is
open, the page behind it still scrolls under keyboard control: PageDown, Space and the arrow keys
propagate past the sheet body to `.mobile-main` whenever the sheet body cannot consume them.

The plan's acceptance matrix requires that a sheet "内容可滚动" and that the background be inert
behind it; the dock and transport are hidden (`:210-216`) but the scroll region is not.

**Disposition.** Fixed. The shell already uses `:has()` for the dock/transport rule, so the same
selector locks the scroller: `.mobile-app:has(.mobile-sheet-host) .mobile-main { overflow: hidden }`.

---

## C2 — P2 — The mobile sheet restores focus to a trigger that may no longer exist

MUI's focus trap records the element that had focus when the modal opened
(`node_modules/@mui/material/Unstable_TrapFocus/FocusTrap.js:292-295`) and refocuses it on close
(`:146-150`):

```js
if (!disableRestoreFocus && nodeToRestore.current) {
  ignoreNextEnforceFocus.current = true;
  nodeToRestore.current.focus();
  nodeToRestore.current = null;
}
```

`nodeToRestore.current.focus()` is called on whatever node was captured, with no check that the
node is still in the document. Focusing a detached element is a no-op, so the focus falls to
`<body>`.

Measured in jsdom against the shipped `MobileSheet`:

| Scenario | `document.activeElement` after close |
|---|---|
| Trigger still present | the trigger button — correct |
| Trigger removed while the sheet was open | `BODY` — focus lost |

The second scenario is reachable in normal use: the mobile reminder editor sheet contains a
Delete action (`src/components/mobile/MobileRemindersView.tsx`), and deleting the reminder removes
the row that opened the sheet. The same applies to the knowledge editor (delete the note), the
weather city sheet (remove the city), and the skills editor (delete the skill). In each case the
keyboard user is returned to the top of the document with no focus and no announcement.

The desktop shell already handles this correctly — `useWorkspaceController.tsx:684-695` guards the
restore with `trigger?.isConnected`. The mobile sheet path has no equivalent guard.

**Disposition.** Fixed. The sheet captures the trigger on open and restores it on close with the
same `isConnected` guard, falling back to the sheet's own close control when the trigger is gone.

---

## C3 — P2 — The redesign created four invisible, unnamed keyboard tab stops

`src/ui/primitives.css:183-193` (new in this change set) hides the file input:

```css
.upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

This is the classic "visually hidden" recipe, but it keeps the element focusable and in the
accessibility tree. There is no `display: none`, no `tabIndex={-1}` and no `aria-label`.

Before the redesign there was **no** `.upload-input` rule anywhere — `git show 5ac4ca0` finds the
class in none of the seven stylesheets — so the input rendered as a visible native file control.
The redesign hid it without removing it from the tab order.

Four instances exist:

| File | Line | Purpose |
|---|---|---|
| `src/components/GalleryWorkspace.tsx` | 194 | gallery image upload |
| `src/components/MusicWorkspace.tsx` | 368 | audio upload |
| `src/components/MusicWorkspace.tsx` | 374 | lyrics upload |
| `src/components/SkillWorkspace.tsx` | 673 | skill import |

Each is driven by a visible button that calls `inputRef.current?.click()`, so the input itself is
a redundant control — and a redundant one that is:

- **unnamed** — `<input type="file">` with no label has no accessible name;
- **invisible** — the element is 1×1 px and clipped to nothing;
- **focus-invisible** — the app's focus ring (`src/ui/base.css:65-68`,
  `outline: 2px solid var(--q-focus); outline-offset: 2px`) is drawn on a 1×1 px clipped box, so a
  keyboard user who tabs onto it cannot see where the focus went. This is a WCAG 2.4.7 Focus
  Visible failure.

**Disposition.** Fixed. The inputs are removed from the tab order and the accessibility tree
(`tabIndex={-1}` plus `aria-hidden`), leaving the visible button as the single accessible control
for each action.

---

## C4 — P3 — The mobile menu does not expose the current view

`src/components/mobile/MobileAppShell.tsx:156-178` renders the menu sheet as a plain list of
`MobileRowButton`s:

```jsx
{menuItems.map((item) => (
  <MobileRowButton key={item.id} className="mobile-menu-row" onClick={() => { ... }}>
```

There is no `aria-current`, no `aria-selected` and no active styling. The primary dock does it
correctly — `MobileAppShell.tsx:146` sets `aria-current={currentView === item.id ? "page" :
undefined}` — so the inconsistency is visible within the same shell: the dock says where you are,
the menu does not.

Settings is reachable only from this menu, so the common path "open Settings → open the menu again"
lands on a list in which nothing is marked as current.

**Disposition.** Fixed. The menu rows carry the same current-view marker as the dock.

---

## C5 — P3 — Repeated chip accessible names in the mobile sheets

Two sheets expose several identically named controls:

- `src/components/mobile/MobileAgentView.tsx:205` — every skill row's toggle chip is labelled
  `"On"` or `"Add"` in hardcoded English, with no skill name in the accessible name. A sheet with
  five skills presents five buttons called "Add" and up to five called "On".
- `src/components/mobile/MobileWeatherView.tsx:185` — every saved city row's chip is labelled
  "Remove". A sheet with three cities presents three buttons called "Remove".

Neither can be disambiguated by a screen reader's button list, and neither name says which row it
belongs to. The same component's rows do carry the item name in a nearby `<strong>`, but the chip's
own name does not.

The hardcoded English is separately recorded as **T2** in the Standards axis; the naming collision
is the compatibility defect.

**Disposition.** Fixed. Each chip's accessible name includes the item it acts on, and the
English literals move into the locale files.

---

## C6 — P3 — `theme.focusVisible` stays disabled by a prior decision, and two overrides pay for it

MUI 9.5 exposes a `focusVisible` theme option
(`node_modules/@mui/material/styles/focusVisible.js:47-63`) that resolves to exactly the ring this
product specifies:

```js
resolveFocusVisible = (input, outlineColor) => wireFocusVisibleVars({
  outlineStyle: 'solid',
  outlineColor,
  outlineWidth: 2,
  outlineOffset: 2,
  boxShadow: `var(${focusVisibleShadowVar}, 0 0)`,
  ...(input === true ? null : input)
});
```

`src/theme/AppThemeProvider.tsx` does not set it — and that is a **recorded decision**, not an
oversight. `MMGH-REVIEW-DEPS-REFRESH-003` (C2) left it disabled deliberately: the Quiet Ledger
ring is driven by `--q-focus` in `src/ui/base.css`, and enabling the MUI option would draw a second
ring on top of the token-driven one.

The cost of that decision shows up in the change set. Without `theme.focusVisible`, MUI contributes
nothing to the focus indicator: `ButtonBase` resets `outline: 0` on its root
(`node_modules/@mui/material/ButtonBase/ButtonBase.js:60`) and `Button`'s `.Mui-focusVisible` block
(`node_modules/@mui/material/Button/Button.js:130-132`) spreads `theme.focusVisible`, which is
`undefined` here, so the only thing drawing a ring on a MUI button is the app's global
`:focus-visible` rule — and it wins a specificity tie against MUI's `outline: 0` purely because
`StyledEngineProvider injectFirst` puts MUI's styles first in the cascade.

That tie is why **S3** needed two ad-hoc per-component overrides: the MUI `OutlinedInput` focus
`boxShadow` and the `Slider` thumb halo. The decision stands; the overrides are the price, and
they are the two places where the price was not paid.

**Disposition.** Accepted and documented, consistent with `MMGH-REVIEW-DEPS-REFRESH-003` C2. The
opt-in stays disabled so there is exactly one focus ring in the product, and S3 removes the two
deviations it forced. Enabling it later would require the `--q-focus` rule and the MUI ring to be
reconciled first, not wired up alongside.

---

## C7 — P3 — The heading outline is inconsistent across the nine workspaces

The redesign normalised most workspaces to `<h1>` → `<h2>`, but three workspaces and two
components were left out, and the desktop Agent and Knowledge pages lost headings entirely.

| Surface | Heading state | Note |
|---|---|---|
| `src/components/RuntimeWorkspace.tsx` | `<h2>` only, all in the sidebar (`:115`, `:149`, `:190`) | **new** — the main column's `<h3>{t("app.agent.conversation.title")}</h3>` and `<h4>{t("app.common.send")}</h4>` were removed by the redesign (`git show 5ac4ca0:src/components/RuntimeWorkspace.tsx` shows them at `:81` and `:142`). The conversation thread — the page's primary content — is now an unheaded region, and the composer textarea falls back to its placeholder for a name. |
| `src/components/KnowledgeVault.tsx` | no heading at all | **new** — the redesign removed the `<h3>{t("app.knowledge.title")}</h3>` that `git show 5ac4ca0:src/components/KnowledgeVault.tsx` had at `:33`. The page has no heading of its own under the shell's `<h1>`. |
| `src/components/GalleryWorkspace.tsx` | `<h3>` at `:188`, `:215`, no `<h2>` | pre-existing skip, not normalised |
| `src/components/SkillWorkspace.tsx` | `<h3>` at `:139` and four more, no `<h2>` | pre-existing skip, not normalised |
| `src/components/WeatherWorkspace.tsx` | `<h3>` at `:295`, `:340`, `:362`, `:398`, no `<h2>` | pre-existing skip, not normalised |

Separately, `src/components/KnowledgeVault.tsx:37` and `:183` both render a button labelled
`t("app.knowledge.newPage")` with the same action, and both are visible at the same time when no
note is active — the sidebar's "new page" button and the empty state's "new page" button. Two
identically named controls with identical behaviour is ambiguous for anyone navigating by button
list.

**Disposition.** Fixed. The Agent and Knowledge pages get their headings back, the three
`<h3>`-only workspaces gain an `<h2>`, and the Knowledge empty state stops duplicating the
sidebar's control.

---

## C8 — P3 — The desktop page title is focused on every view change, without a focus ring

`src/shell/DesktopShell.tsx:55-57` moves focus to the page title whenever the view changes:

```jsx
useEffect(() => {
  titleRef.current?.focus();
}, [currentView]);
```

The target is `<h1 id="desk-page-title" tabIndex={-1} ref={titleRef}>` (`DesktopShell.tsx:148`),
so the focus is programmatic, not a Tab stop — which is the intent: the change of view should be
announced from the top of the page.

The redesign's `src/ui/desktop/shell.css` gave that heading `outline: none`:

```css
.desk-header h1 {
  ...
  outline: none;
}
```

The rule is not scoped to the pointer case, and it outranks the app's global focus ring
(`src/ui/base.css`: `outline: 2px solid var(--q-focus); outline-offset: 2px`) on specificity —
`.desk-header h1` is `0-1-1`, `:focus-visible` is `0-1-0`. So the focus the shell deliberately
moves to the title is invisible: a keyboard or screen-reader user gets no indication that the page
changed. `PRODUCT.md` §Accessibility requires both "页面标题可被聚焦" and "键盘焦点可见".

The pre-redesign stylesheet had no such rule (`git show 5ac4ca0:src/ui/desktop/shell.css` shows
only `font-size`), so the defect was introduced by this change set.

**Disposition.** Fixed. The suppression is scoped to the pointer case — `.desk-header
h1:focus:not(:focus-visible) { outline: none }` — so the ring is drawn whenever the title is
focused for a reason a keyboard user would notice.

---

## C9 — P3 — The desktop reminder severity is carried by colour alone

`src/components/ReminderWorkspace.tsx` marks each row's severity with a coloured dot:

```jsx
<span className={`desk-status-dot severity-${item.severity}`} aria-hidden="true" />
```

The dot is the only carrier of the severity: it is `aria-hidden`, and the row's own text carried
neither the severity, nor any other shape or number that distinguishes it. A user who cannot
separate `--q-warning` from `--q-danger`, or who reads the row through a screen reader, sees the
same list of reminders regardless of severity.

`PRODUCT.md` §Accessibility is explicit: "状态同时使用颜色、文字、数字或形状" — a state must
never be encoded in colour alone. The redesign introduced the dot (`git show
5ac4ca0:src/components/ReminderWorkspace.tsx` had no severity marker on the row), so this is a
regression, not a retained defect.

**Disposition.** Fixed. The row's meta line now carries the severity as text
(`app.reminders.severity.*`) beside the dot, so the colour becomes a redundant second cue instead
of the only one.

---

## Pre-existing defects retained — not counted in the verdict

Recorded because the redesign rewrote the surrounding code and could have fixed them.

### R1 — MUI `select` fields have no accessible name (P2)

`src/components/ReminderWorkspace.tsx:216-235`, `:237-254` and `:256-277` wrap
`<AppTextField select>` in `<label className="reminder-field">`. MUI renders the native input with
`aria-hidden="true"` (`node_modules/@mui/material/Select/SelectInput.js:745`) and puts
`aria-labelledby` only on the display node (`:728`), so the `<label>` binds to the hidden input and
the visible `role="combobox"` element — which is a tab stop — has no name. The markup is identical
at `5ac4ca0`.

### R2 — Two controls named "Close" in the completion dialog (P3)

`src/components/ReminderCompletionDialog.tsx:14-19` renders a full-screen scrim `<button>` with
`aria-label={t("app.common.close")}`, and `:27-29` renders a visible "Close" button with the same
name. The scrim is outside the panel that `trapFocusWithinPanel` cycles within
(`src/state/useWorkspaceController.tsx:637-648`), so it is not reachable by Tab, but it is still
exposed to assistive technology as a second "Close" button.

### R3 — The Music page repeats the same string as `<h1>` and `<h2>` (P3)

`src/shell/DesktopShell.tsx:148` renders `viewMeta.music.title`, which the controller sets to the
current track title (`src/state/useWorkspaceController.tsx:2826`), and
`src/components/MusicWorkspace.tsx:151` renders `<h2>{currentTrackLabel}</h2>` — the same string at
two heading levels. The redesign rewrote that `<h2>` and left the duplication in place.

---

## Verified against the change set — no findings

- **Preserved accessible names.** `app.settings.title` still resolves to `"Provider"` and
  `app.settings.save` to `"Save settings"`; `SettingsWorkspace.tsx:84` and `:211` are unchanged in
  that respect, and `MobileAppShell.test.tsx:480-485` still asserts them.
- **Preserved test hooks.** `data-testid="weather-workspace"`, `.desk-music`, `.desk-knowledge`,
  `.desk-weather` and the `.audio-console__library-toggle` `aria-expanded` / `aria-controls`
  contract are all still asserted by `WorkspaceStyleIsolation.test.tsx`.
- **One `<h1>` per shell.** Two `<h1>` in the codebase — `MobileAppShell.tsx:100` and
  `DesktopShell.tsx:148` — and only one shell mounts at a time.
- **Desktop dialog focus management.** The completion dialog still traps Tab within the panel and
  restores focus to the recorded trigger, with an `isConnected` guard
  (`src/state/useWorkspaceController.tsx:630-712`, `:696-709`).
- **Icon buttons are named.** Every `AppIconButton` in the desktop workspaces carries an
  `aria-label`; the mobile topbar's back and menu buttons carry `aria-label` plus
  `aria-haspopup="dialog"` / `aria-expanded` (`MobileAppShell.tsx:91-111`).
- **Sheet semantics.** `MobileSheet.tsx:50-56` renders `role="dialog"`, `aria-modal="true"` and
  `aria-labelledby` pointing at the sheet's own `<h2>`; MUI's trap focuses the first focusable
  descendant inside the dialog (`FocusTrap.js:132`), which is the close button.
- **Nav current state.** The desktop nav sets `aria-current="page"`; the mobile dock sets the same
  (`MobileAppShell.tsx:146`).
- **Keyboard shortcuts.** `Ctrl`/`Cmd` + `1`–`8` and `Ctrl`/`Cmd` + `,` are unchanged and are
  still blocked inside inputs and text areas.
