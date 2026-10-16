# Spec Review — Frontend Major Dependency Upgrade

## Verdict

`PASS`. One Minor (P3, documentation wording).

## Review Boundary and Sources

- Reviewer role: Spec axis; no implementation or Git change was made by this review.
- Sources: `CHANGELOG.md` (`## [Unreleased]`), the five commit messages in `82f79eb..b2d9b6f`,
  `package.json`, and the diff of the reviewed change set.
- No `SPEC.md` or product spec file exists in the tree; the "spec" is the repository's stated
  intent (upgrade project dependencies) plus the CHANGELOG's own contract.

## Conformance

- **Intent met.** The request was "upgrade project dependencies" and then "do major-version upgrades".
  The change set upgrades every outdated frontend package that can be upgraded without an
  unresolvable peer conflict, and documents the two deliberate stop-points (MUI 9.2, ESLint 9).
- **Scope is disciplined.** The non-dependency edits are exactly five and each is a forced adapter:
  `inert: "" -> inert: true` (React 19 types), two `catch (error) -> catch` (ESLint 9 default),
  `defineConfig` import from `vitest/config` (Vitest 5 types), and the `.eslintrc.cjs -> eslint.config.mjs`
  flat-config migration (ESLint 9). No feature, copy, or layout change rode along.
- **CHANGELOG contract.** `## [Unreleased]` records the within-major refresh, the across-major upgrade,
  the Rig 0.44 migration, and each behavioural adaptation under `### Notes`. The two deliberate
  stop-points are explained rather than left implicit.

## Findings

### S1 (P3) — Two adjacent CHANGELOG bullets describe the frontend upgrade

`### Changed` now carries both "Upgraded frontend packages within their then-current majors ..." and
"Upgraded the frontend toolchain across majors ...". Both are accurate and the first was trimmed to
avoid contradicting the second (it no longer lists Vite/Vitest, which the second supersedes), but a
reader scanning the section sees two bullets about one topic. Merging them, or folding the first into
the second, would read more cleanly. Documentation-only.

## Judgment Calls

- The two stop-points (MUI 9.2, ESLint 9) are recorded as deliberate rather than as missed upgrades.
  The justification is external (upstream peer ranges / a known jsdom regression), which is the same
  standard the previous review applied to the MUI pin.
