# Security Review: LOOP-004 Integrated Boundary

- `review_id`: `REVIEW-LOOP-004-SECURITY-001`
- `parent_goal`: `MMGH-REFACTOR-EXP-003`
- `loop`: `LOOP-004`
- `fixed_point`: `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`
- `reviewed_boundary`: integrated commit `86427b8f6df6813ffb7a24d91a79e747bc753870` plus the current LOOP-004 recovery artifacts
- `reviewer`: independent Security Reviewer
- `independence`: implementation, tests, Ledgers/status, user files, commit, push, network, credentials, and production data were not modified or accessed
- `axis`: Security only; this report does not replace Spec, Standards, or Compatibility review

## Scope and Evidence

Reviewed the approved LOOP-004 Contract, Integration Record, TASK-004 Delivery and review,
the fixed-point product diff, current recovery/Finding artifacts, and these source paths:

- `src/security/provider.ts` and `src/security/provider.test.ts`
- `src-tauri/src/db/settings.rs` and the focused Provider tests in `src-tauri/src/db.rs`
- Rust Provider request code in `src-tauri/src/agent/provider.rs`
- Rust settings/snapshot/keyring boundaries and Tauri command registration/configuration

Observed Git evidence shows the product/test diff from EXP-002 touches only:
`src/security/provider.ts`, `src/security/provider.test.ts`, `src-tauri/src/db/settings.rs`,
and the focused test region in `src-tauri/src/db.rs`. No Tauri capability/configuration,
dependency, storage, SQL/schema, request, keyring, or log file is changed by this boundary.

Observed focused verification at the integrated boundary:

- `npm.cmd run test:unit -- src/security/provider.test.ts`: 8 passed, 0 failed.
- `cargo test --manifest-path src-tauri/Cargo.toml --bin mygh provider_base_url_ -- --test-threads=1`: 6 passed, 0 failed.
- `git diff --check afa5540f385b06bd9ebf7c6cd6e7188915d05e96..86427b8`: exit 0.

No real Provider, network, credential, keyring, or production database was used. Runtime
claims below are therefore limited to source and deterministic in-process tests.

## Security Invariants Reviewed

### URL scheme and host policy

- TypeScript and Rust accept only absolute `http` or `https` URLs.
- Remote `http` remains rejected; local/private HTTP remains allowed by the existing
  syntactic policy.
- Userinfo, query strings, fragments, malformed URLs, and missing hosts remain rejected.
- Both implementations trim, lowercase, and remove DNS trailing dots before local-host and
  allowlist decisions. The focused trailing-dot parity case passes in both suites.
- Strict mode continues to use exact or dot-boundary subdomain matching. The aligned default
  is `api.openai.com` only when the configured list is empty/unset; a non-empty explicit list
  remains authoritative.
- The change does not broaden public HTTP, embedded-credential, query/fragment, or malformed
  URL acceptance.

### SSRF and redirects

- The reviewed change performs no DNS lookup, socket connection, redirect handling, or
  response processing. It only aligns pre-save URL policy decisions.
- Rust Provider requests still use the existing shared `reqwest::Client` with a 90-second
  timeout. Source does not configure an explicit redirect policy; whether redirects preserve,
  strip, or otherwise handle `Authorization` across origins was not exercised and is
  **unverified**.
- DNS rebinding, resolver behavior, private-address transitions after validation, IPv6 private
  ranges beyond the existing rules, and redirect-to-untrusted-host behavior are **unverified**.
- These are excluded request/redirect surfaces in the approved LOOP-004 Contract and are not
  promoted to a new Finding from an unchanged path.

### API-key, keyring, snapshot, and log boundaries

- The reviewed diff does not change keyring storage, staged/active secret replacement,
  rollback, runtime cache, SQLite persistence, or deletion behavior.
- Existing source sanitizes persisted/client settings so `api_key` is blank while
  `has_api_key` carries presence; the reviewed diff does not alter that projection.
- The Provider request still constructs an `Authorization: Bearer ...` header in the existing
  request path. No new logging or error construction was added by this change.
- Non-success response bodies are still compacted to the existing 240-character error
  boundary, but body redaction and API-key reflection behavior were not exercised. This is
  **unverified**, not evidence of safety or leakage.
- No real or test credential value was read, emitted, persisted, or included in this report.

### Tauri permissions and excluded surfaces

- The integrated product diff contains no Tauri capability/permission file, `tauri.conf.json`,
  command registration, dependency, CSP, filesystem, shell, or network-permission change.
- No storage adapter, SQLite/schema/migration, DTO/command, release, or deployment surface
  changed. Existing command registration and configuration were inspected as unchanged
  context only.
- The pre-existing untracked user files `.impeccable/live/config.json` and `PRODUCT.md`
  remain outside the review and were not modified or staged.

## Findings

No security Finding was identified in the reviewed integrated diff.

- Severity: none.
- The two implemented changes correct observed TypeScript/Rust strict-policy disagreement
  without relaxing the existing scheme, local-network, credential, query/fragment, or
  allowlist rules.
- No blocker or major security issue remains in the changed boundary.

## Required Remediation Boundary

No remediation is required for LOOP-004 Security acceptance. Any future requirement to
guarantee redirect destination policy, cross-origin `Authorization` behavior, DNS-rebinding
resistance, broader IP classification, Provider response redaction, or live keyring/runtime
behavior must be a separately scoped security change with fake-server/keyring tests and a
new Contract; it is not authorized by this review or by the current LOOP-004 diff.

## Verdict

**PASS** for the Security axis.

This verdict means the reviewed changes preserve the observed security invariants and do not
introduce a changed-surface security defect. It does not claim real-network SSRF resistance,
redirect safety, production keyring safety, penetration-test coverage, or production security
approval. Loop-level acceptance still requires the other mandatory review axes and Closure
barriers.
