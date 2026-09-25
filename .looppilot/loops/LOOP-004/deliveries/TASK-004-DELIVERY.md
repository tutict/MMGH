# TASK-004 Worker Delivery

## Submission

- Task: `TASK-004` - implement the approved TypeScript/Rust Provider parity fix.
- Worker: serial Implementation Worker.
- Delivery Status: completed for the assigned implementation scope.
- Scope used: `src/security/provider.ts`, `src/security/provider.test.ts`,
  `src-tauri/src/db/settings.rs`, and the focused Provider test region in
  `src-tauri/src/db.rs`.
- No Ledger, commit, push, dependency, network, credential, keyring, storage, SQL,
  DTO, command, request, redirect, timeout, capability, or user-file change was made.

## Actual Diff

- TypeScript `normalizeHost` now trims, lowercases, and removes all trailing DNS
  dots before local-host and allowlist decisions. The existing URL parsing,
  protocol, userinfo, query/fragment, HTTP, and warning/block rules are unchanged.
- The TS trailing-dot characterization now asserts the target parity decision:
  `https://api.openai.com./v1` is `trusted` with normalized host
  `api.openai.com` under strict mode.
- Rust `configured_trusted_provider_hosts` now returns the single default
  `api.openai.com` only when the parsed `MMGH_TRUSTED_PROVIDER_HOSTS` list is
  empty or unset. Non-empty configured lists remain authoritative.
- The focused Rust characterization tests from TASK-003 were left in place and
  unchanged by this Worker; they cover the strict default and trailing-dot cases.

## RED -> GREEN

- Observed RED after updating the TS target assertion:
  `npm.cmd run test:unit -- src/security/provider.test.ts` failed 1/8 because the
  trailing-dot assessment was still `blocked` instead of `trusted`.
- The Rust strict-default RED is attributed to the observed TASK-003 evidence in
  `deliveries/TASK-003-DELIVERY.md`: 0/1 focused default-host test passed because
  the configured list was empty. The existing trailing-dot Rust test was already
  GREEN before this implementation.
- Observed GREEN after the implementation:
  `npm.cmd run test:unit -- src/security/provider.test.ts`: 8 passed, 0 failed.
- Observed GREEN:
  `cargo test --bin mygh provider_base_url_`: 6 passed, 0 failed.

## Verification Evidence

- `npm.cmd run test:unit -- src/security`: 1 file, 8 passed, 0 failed.
- `cargo test --bin mygh -- --test-threads=1`: 50 passed, 0 failed, 1 ignored.
- `npm.cmd run lint`: exit code 0.
- `npm.cmd run typecheck`: exit code 0.
- `cargo fmt --check`: exit code 0.
- `git diff --check`: exit code 0.
- No real network, credentials, keyring, on-disk database, or external data was used.

## Skipped / Unverified

- Full unified `npm test`, web production build, and desktop packaging were not run
  in this Worker task; they remain parent-level validation items.
- Cross-layer Integration, independent Spec/Standards/Security/Compatibility Review,
  Finding Ledger transitions, Closure, commit, and push remain outside this Worker
  authority.
- Windows runtime behavior and real provider connectivity remain unverified.

## Blockers

No implementation blocker was observed. The parent Integrator must still inspect this
Delivery with the combined branch diff and complete the required review barriers.
