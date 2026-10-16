# Remediation Log — Frontend Major Dependency Upgrade

## Purpose

Records how each finding from the four-axis review was dispositioned. The review
documents are left unchanged so the review record stays intact; this log is the
authoritative status.

## Status Summary

| ID | Axis | Severity | Disposition | Evidence |
|---|---|---|---|---|
| S1 | Spec | P3 | Fixed | The two frontend CHANGELOG bullets are merged into one |
| T1 | Standards | P2 | Fixed | `@eslint/js` and `globals` declared in `devDependencies`; lint still green |
| T2 | Standards | P3 | Fixed | `eslint-plugin-jsx-a11y` enabled; its five violations resolved |
| T3 | Standards | P3 | Fixed | react-hooks switched to `configs["recommended-latest"]` |
| T4 | Standards | P3 | Fixed | The lint script now lints `vite.config.ts`, so its override is live |
| D1 | Data | P3 | Fixed | `npm ls` is clean; the extraneous `yaml` is gone |
| D2 | Data | P3 | Fixed | The stale `dist/` audio artifact is untracked (kept on disk) |
| C1 | Compatibility | P2 | Fixed | `"type": "module"` added; the Vite `configLoader` warning is gone |
| C2 | Compatibility | P3 | No action | The `inert` boolean adaptation was already in place |
| C3 | Compatibility | P3 | No action | The optional-catch adaptation was already in place |
| C4 | Compatibility | P3 | Accepted | Bundle-composition shift; parity held by build + tests |
| C5 | Compatibility | P3 | Verified | No React 19 removed API is used |
| C6 | Compatibility | P3 | Accepted | Test-environment change; suite green |
| C7 | Compatibility | P3 | Documented | ESLint capped at 9 by plugin peer ranges |

## Detail

### T1 — Undeclared lint-config dependencies (P2)

`eslint.config.mjs` imports `@eslint/js` and `globals`; both are now listed in
`devDependencies` (`@eslint/js` `^9.39.5`, `globals` `^14.0.0`) rather than being
resolved through ESLint's hoisted copies. `npm install` re-resolved the lockfile
and `npm run lint` stays green.

### T2 — `eslint-plugin-jsx-a11y` enabled (P3)

The plugin was declared but never registered. It is now wired in through
`jsxA11y.flatConfigs.recommended` (34 rules) and its five violations are resolved:

- `ReminderCompletionDialog.tsx` (2) — the toggle `<label>`s wrap `AppCheckbox`,
  which renders MUI's native checkbox. The rule cannot see through the custom
  component, so `label-has-associated-control` is configured with
  `controlComponents: ["AppCheckbox"]` and `depth: 3` (the label text sits two
  levels deep, past the default depth of 2).
- `GalleryWorkspace.tsx` (2) — the decorative gallery scrim is a pointer-only
  click-catcher; keyboard users dismiss the viewer via Escape or the Close
  button. It is now marked `aria-hidden="true"`, which both reflects its
  decorative role and satisfies `click-events-have-key-events` /
  `no-static-element-interactions`.
- `useMusicController.tsx` (1) — `media-has-caption` is turned off, because the
  app plays music rather than captioned video.

Verified active by injecting a missing-`alt` `<img>` and observing
`jsx-a11y/alt-text` fire, then reverting.

### T3 — react-hooks flat-native recommended set (P3)

Switched from `configs.recommended` (16 rules) to `configs["recommended-latest"]`
(17 rules, adding `react-hooks/void-use-memo`). No new violations; lint green.

### T4 — Dead `vite.config.ts` override (P3)

The lint script is now `eslint src vite.config.ts`, so the config's
`vite.config.ts` block (node globals) is exercised. `eslint` reports 112 files, 0
errors, 0 warnings, including `vite.config.ts`.

### D1 — Extraneous `yaml` (P3)

`npm install` removed the extraneous `yaml@2.9.1`; `npm ls` now reports no
extraneous, unmet, or invalid packages.

### D2 — Stale tracked `dist/` artifact (P3)

`git rm --cached dist/闹钟2-哔声_爱给网_aigei_com.mp3` untracks the file (it stays
on disk). It duplicated the tracked asset in `public/`, and `dist/` is
gitignored build output.

### C1 — Vite config loaded as ESM (P2)

`package.json` now sets `"type": "module"`. The only other root-level module file
is `eslint.config.mjs` (already ESM) and there are no `.js`/`.cjs` config files,
so the change is contained. `npm run dev` no longer prints the
`configLoader: native` warning; build and tests stay green.

## Verification Observed After Remediation

- `npm run lint` -> exit 0 (`eslint src vite.config.ts`, 112 files, 0/0).
- `npm run typecheck` -> exit 0.
- `npm run build` -> exit 0 (Vite 8).
- `npm run test:unit` -> 19 files, 87 passed, 3 skipped.
- `npm run dev` -> HTTP 200, no `configLoader` warning.
- `cargo test` -> `k6_backend_harness` 43 passed / 1 ignored; `mygh` 59 passed / 1 ignored.
- `npm ls` -> clean (no extraneous/unmet/invalid).
- `git diff --check` -> exit 0.
