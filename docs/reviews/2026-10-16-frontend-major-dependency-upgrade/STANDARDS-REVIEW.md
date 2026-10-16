# Standards Review — Frontend Major Dependency Upgrade

## Verdict

`PASS with findings`. One Major (P2) and three Minor (P3). No Blocker.

## Review Boundary and Sources

- Reviewer role: Standards axis; no implementation or Git change was made by this review.
- Sources: `package.json`, `package-lock.json`, `eslint.config.mjs`, deleted `.eslintrc.cjs`,
  `vite.config.ts`, `README.md`. No `AGENTS.md`, `CONTRIBUTING.md`, or CI workflow exists in the tree.
- Reviewed revision: `master` at `b2d9b6f` (clean).

## Conformance Evidence

- Lint: `eslint src` -> exit 0, 0 warnings; `eslint src --format json` reports **111 files**, 0 errors.
- Types: `tsc --noEmit` -> exit 0.
- Build: `vite build` -> exit 0, no deprecation warnings.
- Tests: vitest 19 files / 87 passed / 3 skipped; cargo `k6_backend_harness` 43 passed / 1 ignored,
  `mygh` 59 passed / 1 ignored.
- Formatting/whitespace: `cargo fmt --check` -> exit 0; `git diff --check` -> exit 0.
- Lockfile: `lockfileVersion` 3; `npm ls` clean apart from one extraneous local package (D1).
- Config migration: the flat config reproduces the eslintrc intent rule-for-rule
  (`eslint:recommended` -> `js.configs.recommended`, `plugin:react/recommended` -> `react.configs.recommended`,
  `plugin:react-hooks/recommended` -> `reactHooks.configs.recommended`, same four `off` overrides,
  same `no-unused-vars` options, same `no-undef: off` for TS, same test/config globals).

## Findings

### T1 (P2) — `eslint.config.mjs` imports two undeclared packages

`eslint.config.mjs` imports `globals` (resolves `globals@14.0.0`) and `@eslint/js` (resolves
`@eslint/js@9.39.5`). Neither is declared in `package.json`; both are present only because `eslint`
hoists them into the top-level `node_modules`. This is a phantom dependency: a future `eslint`
patch/minor that drops, relocates, or re-versions either package turns `npm run lint` into a
`MODULE_NOT_FOUND` failure with no other signal. Fix: add `globals` and `@eslint/js` to
`devDependencies` at their current resolved versions.

### T2 (P3) — `eslint-plugin-jsx-a11y` is declared but never enabled

`devDependencies` lists `eslint-plugin-jsx-a11y@^6.10.2`, but neither the old `.eslintrc.cjs`
(`plugins: ["react", "react-hooks", "react-refresh"]`) nor the new `eslint.config.mjs` registers it.
The package is dead weight and its a11y rules never run. Pre-existing; the flat-config migration was
the natural moment to either wire it in or drop it.

### T3 (P3) — react-hooks uses the legacy recommended set, not the flat-native one

The new config spreads `reactHooks.configs.recommended.rules` (16 rules). This is exactly what the
old `plugin:react-hooks/recommended` resolved to, so behaviour is preserved — but the plugin also
ships `configs["recommended-latest"]` (17 rules, adding `react-hooks/void-use-memo: error`), which is
the flat-config-native set. The migration kept the legacy set deliberately (parity) but leaves the
newer recommended rule disabled. Worth a conscious decision.

### T4 (P3) — The eslint config's `vite.config.ts` override is dead code

Both the old and new configs define a `vite.config.ts` block (node globals), but the lint script is
`eslint src`, which never lints `vite.config.ts`. Pre-existing dead configuration; harmless but
misleading.

## Judgment Calls

- Dropping `eslint-config-react-app` is **not** a standards regression: the old `.eslintrc.cjs` never
  extended `react-app`, so the package contributed no rules. Removing it is a net simplification.
- The `--ext ts,tsx` removal from the lint script is correct under flat config, where `files` globs
  replace `--ext`; coverage was confirmed at 111 files.
