# EXP-003 Cross-Layer Risk Audit

## Boundary and Evidence Labels

- Repository boundary: EXP-002 HEAD `afa5540f385b06bd9ebf7c6cd6e7188915d05e96`.
- Observed means direct source/test/command evidence; inferred means a conclusion from that
  evidence; unverified means the experiment did not execute the path.
- Reviewed source: `src/security`, Settings components, storage adapters/tests, Tauri
  commands/contracts, Rust Provider/settings/database/schema code/tests, SQL, README, and
  `docs/API_KEY_HANDLING.md`. No real key, Provider request, or user database was read.

## Provider Security Map

| Boundary | Observed behavior/protection | Gap status |
|---|---|---|
| TS URL assessment | absolute http/https only; blocks userinfo, query/fragment, public HTTP; supports local/private HTTP and optional strict hosts | protected, but normalization parity gap below |
| Rust URL validation | same core rules before desktop settings commit; lowercases and removes trailing dots | protected, but default-host parity gap below |
| API-key storage | preview memory only; Rust keyring plus process cache; SQLite/client snapshot blank | protected by tests and source |
| Save/clear | blank preserves, explicit clear deletes, new value replaces; journal handles DB/keyring failure | protected by TS/Rust tests |
| Provider client | shared reqwest client has 90-second timeout; status error body is compacted to 240 characters | observed; redirect target policy not explicitly configured |
| Web model draft | 45-second abort timeout; fake/mocked tests only | observed; no real request run |

Observed real gaps:

1. TypeScript defaults the trusted-host set to `api.openai.com`; Rust returns an empty set
   when `MMGH_TRUSTED_PROVIDER_HOSTS` is unset. With strict mode enabled and no explicit
   list, TS accepts the default endpoint while Rust rejects every non-local endpoint.
2. Rust canonicalizes DNS hosts by removing a trailing dot; TypeScript lowercases/trims but
   leaves the dot. `https://api.openai.com./v1` therefore differs under strict allowlisting.

Suspected but not promoted to Findings:

- Redirect-to-untrusted-host behavior is not explicit in the source. Whether credentials
  cross origins depends on runtime/client behavior not exercised here; changing redirect
  policy without a dedicated fake-server contract would exceed this bounded fix.
- Error bodies may contain sensitive Provider response text, but the response is bounded and
  no evidence shows API-key reflection. This remains an unverified hardening question.
- Private non-loopback IPv6 is rejected by both implementations; no product requirement was
  found requiring it to be accepted.

Disproved assumptions:

- API keys are not persisted in SQLite or preview workspace snapshots by current code/tests.
- Desktop save is not a simple DB/keyring partial write: it uses staged secret state,
  recoverable journal, rollback, and failure tests.
- Frontend and Rust do agree on public HTTP rejection, userinfo rejection, local IPv4,
  query/fragment rejection, allowlist suffix matching, and boolean strict-mode parsing.

## Web/Tauri Storage Adapter Map

- `src/storage/agent.ts` selects one runtime path per operation. Web preview updates a
  version-checked localStorage workspace and throws retryable conflict/persistence errors;
  Tauri invokes Rust commands returning a complete `WorkspaceSnapshot`.
- CRUD paths validate missing IDs; reminder link cleanup, active selection, snapshot refresh,
  and failure preservation have representative tests in both runtimes.
- Tauri-unavailable behavior is explicit: the adapter uses preview semantics rather than
  claiming native persistence. Client snapshots strip secrets on both paths.
- Rust mutations use immediate transactions and publish snapshot cache only after commit.

No safe Candidate B implementation gap was established. Static TypeScript typing remains
loose in parts of `agent.ts`, but changing all DTOs is broader than this experiment and no
observed mismatch justifies it. Tauri command-failure UI coverage is limited, recorded as a
test gap rather than a product Finding.

## SQLite Migration Map

- Current schema version is `2`; newer versions are rejected. `PRAGMA foreign_keys = ON`
  is enabled on opened/test connections and migration checks foreign-key violations.
- v1-to-v2 runs under `BEGIN IMMEDIATE`, validates migrated row counts, drops old tables only
  after copying/checks, commits atomically, and attempts rollback plus foreign-key restore on
  failure. Tests create an in-memory v1 fixture, preserve entities/links/tags/mounts, move a
  legacy plaintext key to keyring/test runtime state, and sanitize persisted settings.
- Workspace writes serialize through a process lock and immediate transactions. Reopen and
  downgrade behavior is partially covered by current-version and newer-version tests.

No Candidate C implementation is justified. Backup/restore UX, cross-process concurrent
opening, disk-full migration failure, application downgrade, and production fixture coverage
remain unverified. Adding a schema version solely for this experiment is forbidden.

## Contract Comparison

| Contract item | TypeScript | Rust | Decision |
|---|---|---|---|
| schemes | http/https | http/https | aligned |
| public HTTP | rejected | rejected | aligned |
| local/private HTTP | localhost, `.local`, loopback/private IPv4, `::1` | same | aligned by source |
| userinfo/query/fragment | rejected | rejected | aligned |
| hostname case | lowercase | lowercase | aligned |
| trailing dot | retained | removed | real mismatch |
| strict default host | `api.openai.com` | empty | real mismatch |
| configured allowlist | exact/subdomain suffix | exact/subdomain suffix | aligned |
| API-key snapshot | blank plus `hasApiKey` | blank plus `hasApiKey` | aligned |
| DTO fields | camelCase settings input | serde camelCase input | aligned by source |

## Candidate Scores

Scale 0-2; totals are decision inputs, not approval.

| Dimension | A Provider | B Storage adapter | C Migration |
|---|---:|---:|---:|
| Cross-layer coupling | 2 | 2 | 1 |
| Sensitive-data impact | 2 | 1 | 1 |
| Persistence impact | 1 | 2 | 2 |
| Runtime compatibility | 2 | 2 | 1 |
| Failure severity | 2 | 2 | 2 |
| Rollback complexity | 1 | 2 | 2 |
| Multiple Worker value | 2 | 1 | 1 |
| Specialized Review need | 2 | 2 | 2 |
| Test environment complexity | 1 | 1 | 2 |
| Scope uncertainty | 1 | 1 | 2 |
| Integration risk | 2 | 2 | 2 |
| Recovery need | 2 | 1 | 2 |
| Total | **20** | **19** | **20** |

Candidate B/C scores reflect their inherent risk if changed; neither has a verified bounded
defect. Candidate A has both high risk and two observed, isolated parity gaps, so it is the
only implementation recommendation.

## Recommendation and Unverified Work

Select Candidate A with a minimal two-function alignment and parity tests. Do not touch API
key lifecycle, storage DTOs, SQL, migration, redirect, timeout, permissions, or release.
Unverified: live DNS/redirect behavior, real keyring, real Provider, production database,
disk-full/cross-process migration, downgrade, interactive Settings flow, macOS/Linux, and
formal penetration testing.
