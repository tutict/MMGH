# LOOP-004 Compatibility Review

- `review_id`: `REVIEW-LOOP-004-COMPATIBILITY-001`
- `parent_goal`: `MMGH-REFACTOR-EXP-003`
- `loop`: `LOOP-004`
- `reviewer`: independent Compatibility Reviewer
- `reviewed_at`: 2026-07-19
- `fixed_point`: EXP-002 `afa5540f385b06bd9ebf7c6cd6e7188915d05e96` through integrated boundary
  `86427b8f6df6813ffb7a24d91a79e747bc753870`
- `independence`: implementation, tests, Ledgers, status projections, user files, Git index,
  commit, push, network, credentials, keyring, and on-disk user data were not modified or used

## Review Scope

Reviewed the approved LOOP-004 Contract, Integration Record, risk audit, task Deliveries and
reviews, the fixed Git diff, the TypeScript provider policy and storage adapter, the Rust
provider policy/settings boundary, Tauri command and serde DTO definitions, and the focused
provider tests. The compatibility question is whether Web preview and Tauri make the same
provider URL decisions while preserving their existing storage and command surfaces.

## Observed Contract Comparison

| Contract | TypeScript/Web | Rust/Tauri | Verdict |
|---|---|---|---|
| schemes | Parses absolute `http`/`https`; compares lowercase protocol | `Url` parsing accepts `http`/`https` | aligned |
| public HTTP | rejected before trusted-host outcome | rejected before trusted-host outcome | aligned |
| local/private HTTP | localhost, `.local`, loopback/private IPv4, IPv6 loopback | same host classes, with Rust `host_str` handling | aligned by source/tests |
| userinfo | blocked | blocked | aligned |
| query/fragment | blocked | blocked | aligned |
| strict flag | `1/true/yes/on` via `VITE_ENFORCE_TRUSTED_PROVIDER_HOSTS` | `1/true/yes/on` via `MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS` | aligned semantics; build env names differ by runtime |
| default trusted host | `api.openai.com` when the parsed list is empty | `api.openai.com` when the parsed list is empty | aligned after fix |
| explicit allowlist | exact host or dot-delimited subdomain suffix | exact host or dot-delimited subdomain suffix | aligned |
| host canonicalization | trims, lowercases, removes repeated trailing DNS dots | trims, lowercases, removes repeated trailing DNS dots | aligned after fix |
| returned/sanitized settings | Web preview snapshot keeps `apiKey: ""` and `hasApiKey` | Tauri snapshot keeps `apiKey: ""` and `hasApiKey` | unchanged/aligned |
| settings command surface | `saveSettings` invokes `save_settings` with camelCase fields | Tauri command accepts `AgentSettingsInput` with camelCase serde names | unchanged/aligned |

The two previously observed parity gaps are directly covered by the integrated changes:
strict mode now accepts the default OpenAI host in both runtimes, and a trailing-dot
hostname is normalized before allowlist evaluation in both runtimes.

## Observed Verification

- `npm.cmd run test:unit -- src/security/provider.test.ts`: exit `0`; 1 file, 8 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --bin mygh provider_base_url_ -- --test-threads=1`:
  exit `0`; 6 passed, 0 failed.
- `src/storage/agent.ts` still selects exactly one Web/Tauri operation path; the reviewed
  product diff does not change that selector, DTO payload, or snapshot sanitization.
- `src-tauri/src/cmd.rs` still exposes the same `save_settings` command and delegates to the
  existing transactional database path; no command or capability diff is present.
- The integrated product diff is limited to `src/security/provider.ts`, its focused tests,
  `src-tauri/src/db/settings.rs`, and focused Rust tests in `src-tauri/src/db.rs`.
- No real Provider request, DNS lookup, redirect, keyring, credentials, or user database was
  exercised.

## Compatibility Limits

These are unverified or intentionally unchanged, not blockers for this Contract:

- Browser and `reqwest` redirect handling is not explicitly configured as a shared policy;
  cross-origin redirect behavior and credential forwarding require a dedicated fake-server
  test and remain outside LOOP-004 scope.
- The environment variable names are runtime-specific (`VITE_*` versus `MMGH_*`); their
  truthy parsing and empty-list default semantics are aligned, but a production build/runtime
  configuration was not exercised.
- DNS rebinding, Unicode/punycode host canonicalization, non-loopback IPv6 private ranges,
  and platform-specific URL parser behavior were not tested.
- Storage adapter failure/retry semantics, SQLite migration behavior, API-key/keyring
  lifecycle, and Tauri capability/network permissions were inspected as unchanged boundaries;
  this review does not claim live or production verification of them.

## Verdict

**PASS**

The integrated change preserves the existing Web/Tauri command, DTO, snapshot, storage, and
permission surfaces and aligns the two observed provider policy decisions. No blocking
compatibility conflict or unauthorized scope expansion was found. The listed runtime and
network limits remain explicit evidence gaps for a future bounded test, not reasons to alter
this Loop.
