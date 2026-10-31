# Standards Review — Frontend Refinement & Capability Assessment

Axis of the four-axis review `MMGH-REVIEW-FRONTEND-REFINEMENT-005`.
Baseline `a419f76`, reviewed change set `a419f76..95aa9d7`.

## Sources of truth

- `src/ui/styleContract.test.ts` — the class-coverage, dynamic-family, forbidden-pattern and
  5,200-line budget contract.
- `src/i18n/localeCoverage.test.ts` — locale key parity and reference resolution.
- The repository's stated i18n rule: every user-visible string lives in a locale file; a missing
  translation reports the miss (fixed in the 004 review, T6).
- The eval toolchain's documented contract (`eval/ragas/` README section, the harness's doc
  comments): offline-first, explicit provider config, no keyring reads.

## Verdict

**PASS with findings — 2 Minor (P3), one fixed and one accepted.**

Lint (0 warnings), typecheck, the unit suite (118 passed / 3 skipped), the Rust suite
(43 + 59 passed / 0 failed) and the production build all pass at `95aa9d7`. The style contract
holds with margin: 4,650 / 5,200 non-blank lines, every structural TSX class resolved, every
dynamic class template matched to a family, zero forbidden patterns outside the contract's own
pattern list, and 0 of 70 unique `--q-*` references undefined.

---

## T1 — P3 — The `emptyToday` key existed in both locales with no consumer — Fixed (`95aa9d7`)

**Definition used:** a `mobileText.ts` key is dead when no `.tsx`/`.ts` file outside
`mobileText.ts` itself references it (grep over `src/`, excluding the definition file).
`localeCoverage.test.ts` covers the two locale files' parity and cross-references; it does not
scan `mobileText.ts`, which is a separate string table for the mobile text helpers — that is why
the gate missed it.

**Measured:** `emptyToday` was defined for both `zh-CN` and `en-US` with zero references; the
Today view uses `emptyTodayHint` (the second string of the pair). Dead strings in a bilingual
table drift the same way dead CSS does: someone edits one copy and the other goes stale.

**Fix:** both definitions removed; `emptyTodayHint` kept (it has a consumer).

## T2 — P3 — The scorer's `FORBIDDEN_CLAIMS` is a superset of the runtime's — Accepted, documented

**Measured:** the runtime's pattern table (`src-tauri/src/agent/contract.rs:254-459`) holds
**55 EN + 47 ZH** patterns; the scorer's (`eval/ragas/evaluate.py:65-169`) holds **56 EN + 47 ZH**.
The one extra EN pattern is `"updated a note"`.

**Why the direction is safe.** The scorer only decides whether an evaluation sample *claims* a
capability; the runtime decides whether a production reply *executes* one. A scorer strictly
stricter than the runtime can flag a reply the runtime would have allowed — an evaluation-time
false alarm — but can never pass a claim the runtime would have executed. The reverse (runtime
superset) would be the dangerous direction: the gate would certify claims it never checks.

**Why accepted anyway.** The asymmetry is undocumented and unpinned: nothing fails when the two
tables drift further apart, and a future reader cannot tell whether the extra pattern is
intentional. The cheap repair is a parity test that either pins the superset (scorer ⊇ runtime)
or unifies the tables behind one source. Recorded here rather than fixed so the fix can land as
its own decision, not a rider on a review commit.

## Standards confirmations (no finding)

- **Style contract** (`styleContract.test.ts`): every structural class name used in a TSX file
  has a rule in `src/ui/**`; dynamic class templates match a declared family; gradients,
  `backdrop-filter`, raw colours, undefined `--q-*` tokens, the deleted decorative classes and
  `text-transform: uppercase` are all absent from the stylesheets and theme (grep re-verified
  independently of the test); 4,650 ≤ 5,200.
- **Theme parity** (`themeTokenParity.test.ts`, `tokenContrast.test.ts`): the MUI palette still
  equals the OKLCH token layer; `src/theme/palette.ts` was not touched this round, so the
  contrast proofs hold unchanged.
- **Locale coverage**: both locales carry identical key sets; every referenced key resolves; the
  two `mobileText` tables stay in sync (the dead-key finding above is about *consumption*, not
  parity).
- **Eval harness hygiene**: the binary compiles behind `src-tauri/src/bin/` and is driven by
  `MMGH_EVAL_*` environment variables with an explicit stub configuration; it neither reads nor
  prints keyring material; the evaluation docs state the same contract the code implements.
- **CI workflow**: `pull_request`-triggered runs execute only the offline job (needs no
  credentials); the live job's guard is reviewed under Data (D1).
- **Commit hygiene**: the 21 commits split cleanly by concern (eval toolchain / per-step style
  rounds / fixes / docs), with CJK subjects via message files per the repository's convention.
