# Spec Review — Dependency Refresh

## Verdict

`PASS`. One Minor (P3). No Blocker, no Major.

## Review Boundary and Sources

- Reviewer role: Spec axis (does the change set match what was asked, and does it stay inside the
  declared scope); no implementation or Git change was made by this review.
- Sources: the approved plan's constraint set, `package.json`, `package-lock.json`,
  `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, the reviewed diff `a0b62a2..de6c5d2`, `CHANGELOG.md`,
  `DESIGN.md`, and the two prior four-axis reviews under `docs/reviews/2026-10-16-*`.
- Reviewed revision: `master` at `de6c5d2`.

## Spec Assessment

The request was to update the whole project's dependencies. The change set does that on both
surfaces, and it stays inside the constraints the approved plan set for the redesign:

- **No data-layer, state-machine, API or Rust-logic redesign.** The only Rust source change in the
  change set is none — `git diff a0b62a2..de6c5d2 -- src-tauri/src` is empty. `rig 0.45` and
  `rusqlite 0.41` both compile against the existing agent runtime and database layer unchanged.
- **No new dependencies.** Every package added to either manifest already existed in the previous
  version; the change set moves versions forward and removes dead vendored sources.
- **No revival of the purged stylesheet.** No CSS file is touched.
- **Accessibility contracts preserved.** The `Provider` and `Save settings` accessible names, and the
  whole `src/ui/styleContract.test.ts` contract, are unaffected: the frontend unit suite is green
  at 95 passed / 3 skipped.

Splitting the work into five commits by concern keeps each one reviewable on its own:

| Commit | Concern | Manifest change | Behaviour change |
|---|---|---|---|
| `47e1395` | Frontend within-range lockfile refresh | none | none |
| `de69089` | MUI 9.5 + globals 17 | `package.json` | none observed |
| `7fb9c21` | Rust within-range lockfile refresh | none | none |
| `b71c66e` | rig 0.45 + rusqlite 0.41 | `Cargo.toml` | none observed |
| `de6c5d2` | Vendored Tauri v1 crates removed | none | none |

## Findings

### S1 (P3) — The CHANGELOG's MUI clause became stale

The `Unreleased / Changed` section still read:

> MUI stays on 9.2 because 9.4 breaks jsdom Select selectors, and ESLint stops at 9 because
> `eslint-plugin-react` and `eslint-plugin-jsx-a11y` still cap their peer range at ESLint 9

The first clause is now wrong: MUI is on 9.5. The second clause is still correct and stays.
Fixed in the same change set — the clause is rewritten to record the upgrade and to state the
reproducible finding behind it (see COMPATIBILITY-REVIEW.md, C2).

## Exclusions

- The prior reviews' deferred questions about the Rust runtime and the frontend majors were
  re-checked only where this change set touches them; the rest stand as recorded on 2026-10-16.
- Provider behaviour against a live OpenAI-compatible gateway was not exercised; the loopback
  provider stub in the Rust suite stands in for it.
