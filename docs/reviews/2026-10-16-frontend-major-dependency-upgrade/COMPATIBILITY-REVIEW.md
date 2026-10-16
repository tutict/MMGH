# Compatibility Review — Frontend Major Dependency Upgrade

## Verdict

`PASS with findings`. Two Major (P2) and five Minor (P3). No Blocker.

## Review Boundary and Sources

- Reviewer role: Compatibility axis (runtime behaviour, build output, test environment, toolchain
  forward-compatibility); no implementation or Git change was made by this review.
- Sources: `src/**`, `vite.config.ts`, `eslint.config.mjs`, `package.json`, the reviewed diff, and
  the observed build/test/dev runs.
- Reviewed revision: `master` at `b2d9b6f`.

## Compatibility Assessment

- **React 18 to 19.** The codebase uses only React 19-safe APIs: `createRoot` (`src/main.tsx`),
  `useSyncExternalStore` (`src/utils/playbackSnapshot.ts`), and `React.forwardRef`
  (`src/components/ui/AppFileInput.tsx`, deprecated but supported). A targeted search found **no**
  use of `ReactDOM.render`, `ReactDOM.hydrate`, `findDOMNode`, `unmountComponentAtNode`,
  `react-dom/test-utils`, string refs, `propTypes`, `defaultProps` on function components,
  `React.Children`, `element.ref`, or bare `useRef()`. Tests take `act` from `@testing-library/react`
  (which re-exports React's `act`), not the removed `react-dom/test-utils`.
- **Vite 7 to 8 (rolldown).** The production build succeeds; `manualChunks` still produces the
  intended logical chunks (`vendor`, `tauri-vendor`, `weather-workspace`, `agent-storage`, `i18n`).
  The dev server serves HTTP 200 with `#root` present.
- **Vitest 3 to 5 / jsdom 26 to 30.** The full unit suite passes (19 files / 87 passed / 3 skipped).
  `matchMedia` is stubbed in tests and `ResizeObserver` is feature-guarded in code, so the two
  jsdom gaps the app relies on remain covered.
- **ESLint 8 to 9 / Babel 7 to 8.** Lint passes over 111 files. The Babel parser scopes
  `preset-react` to JSX extensions via `overrides`, so `.ts` generics parse as type parameters rather
  than JSX — verified directly against the parser.

## Findings

### C1 (P2) — Vite 8 warns the config is ESM loaded as CommonJS

`npm run dev` emits:

> Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to
> become the default in a future major version of Vite: ESM syntax in a file loaded as CommonJS
> (vite.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json.

`vite.config.ts` uses `import`/`export default`, but `package.json` has no `"type": "module"`, so the
config is loaded as CommonJS. It works today only because `build` and `test:unit` pass
`--configLoader runner`, and `dev` relies on the current default. When `configLoader: native` becomes
the default, the config load breaks. Fix options: add `"type": "module"` to `package.json` (low risk —
the only root-level module file is `eslint.config.mjs`, already ESM, and there are no `.js`/`.cjs`
config files), or rename the config to `vite.config.mts`. Latent, not currently failing.

### C2 (P3) — React 19 makes `inert` a boolean attribute

`GalleryWorkspace` previously spread `inert: ""`; React 19's types require `boolean`, so it now passes
`inert: true`. Rendered output is unchanged: `react-dom/server` emits `<div inert="">` for
`inert={true}` and omits the attribute for `false`/`undefined`, matching the pre-upgrade markup. No
behavioural change.

### C3 (P3) — ESLint 9 changes the `no-unused-vars` `caughtErrors` default

ESLint 9 defaults `caughtErrors` to `all` (was `none`), which surfaced two unused `catch (error)`
bindings. Both were converted to optional catch bindings (`catch {`), which is behaviour-identical —
the binding was never read.

### C4 (P3) — Vite 8/rolldown shifted bundle composition

The production chunks changed shape: `vendor` 470.74 kB -> 454.07 kB, `i18n` 98.73 kB -> 106.94 kB,
`index` 151.79 kB -> 153.67 kB, and a new `rolldown-runtime` chunk appears. This is expected when the
bundler engine changes. Functional parity is asserted only by the build succeeding and the test suite
passing; no runtime diff of the shipped bundle was performed.

### C5 (P3) — React 19 removed-API surface is absent

Verified by search across `src/**`: none of the APIs React 19 removed are used (see the assessment
above). `forwardRef` remains in use and still functions (deprecated in 19 but not removed). The
residual risk is React 19 runtime behaviour that static checks cannot see — e.g. ref-cleanup
semantics or StrictMode timing — which the existing suite exercises but does not exhaustively cover.

### C6 (P3) — The test environment changed under the suite

jsdom 26 to 30 and Vitest 3 to 5 change the DOM emulation and runner. The suite is green, but a
greener environment can also mask a previously-failing assertion or shift timing-sensitive tests
(`App.test.tsx` and `MobileAppShell.test.tsx` are the slowest at ~2.5 s each). No specific regression
was observed; recorded as a coverage caveat.

### C7 (P3) — ESLint is capped at 9, not 10

ESLint 10 exists, but `eslint-plugin-react@7.37.5` (latest) and `eslint-plugin-jsx-a11y@6.10.2` (latest)
both cap their peer range at ESLint 9, so ESLint 10 would fail `npm install` with `ERESOLVE`. The
project deliberately stops at 9. Documented in the CHANGELOG.

## Exclusions

- The Tauri desktop build (`npm run build:desktop`) and the packaged installer were not run.
- macOS/Linux targets and a real provider network path were not exercised.
