# Spec Review — Rig Runtime Refactor and Dependency Upgrade

## Verdict

`PASS` with one Minor (P3) documentation finding. No Blocker or Major.

## Review Boundary

- Reviewer role: Spec axis; no implementation or Git change was made by this review.
- Contract sources: `CHANGELOG.md` (Unreleased), `README.md`, `src-tauri/Cargo.toml`, and the pre-refactor `src-tauri/src/agent.rs` + `src-tauri/src/agent/provider.rs` at `e0a4953`.
- Reviewed revision: `master` at `9a189af` / `9b1c3ad` (Rig/deps files clean).

## Requirement Trace

| Stated requirement | Evidence | Result |
|---|---|---|
| Rig is the desktop runtime for `run_agent` and `forge_skill` | `src-tauri/src/agent/mod.rs:118` (`RigRuntime::complete_reply`) and `:128` (`RigRuntime::complete_skill_draft`) | PASS |
| Uses OpenAI-compatible Chat Completions | `src-tauri/src/agent/runtime.rs:59` (`.completions_api()`) with `openai::Client` | PASS |
| Homemade provider HTTP client removed | `src-tauri/src/agent/provider.rs` deleted; no direct `reqwest` POST remains (only `reqwest::Url` in `db.rs` and the shared `Client` handed to Rig) | PASS |
| Prompt composition preserved | `contract.rs:106-146 compose_prompt` reproduces old `compose_messages` (same system-section order, 18-message history cap, 2000-char trim, prompt appended) | PASS |
| Reply validation preserved | `contract.rs:148-176 validate_reply` is identical to the old implementation (empty, over-budget at 12000, forbidden side-effect claims) | PASS |
| Error classification preserved | `contract.rs:179-181 model_call_failure_title` -> `model_failure_title`, still keyed on `AgentContractError` in the chain | PASS |
| Fallback reply preserved | `agent/fallback.rs` is byte-identical to the old `local_fallback_reply` | PASS |
| Skill drafting preserved | `agent/skill.rs` reproduces the old system prompt, user prompt, `build_local_skill_draft`, parse, and sanitize | PASS |
| Sampling/timeout preserved | `runtime.rs:65` temperature 0.4; `runtime.rs:11` 90s timeout (matches old `provider.rs`) | PASS |
| API key never persisted or returned to the client | `db/settings.rs:399-404` (persistence clears key and `hasApiKey`) and `:532-537` (client projection blanks key, keeps boolean) | PASS |
| Provider URL protocol/host constraints preserved | `db/settings.rs:481-527` (http/https only, no embedded credentials, no query/fragment, https required off-localhost, optional allowlist) | PASS |

## Findings

### S1 (P3) — CHANGELOG wording overstates removal

`CHANGELOG.md` states: "Removed the homemade provider HTTP client and monolithic agent completion loop." Only the provider client was removed; the "monolithic" `agent.rs` was refactored into `agent/{contract,fallback,mod,runtime,skill,text}.rs`, and the completion loop still exists (now delegating the HTTP call to Rig). The wording is misleading for a release baseline.

Suggested wording: "Removed the homemade provider HTTP client; split the monolithic agent module into focused modules and delegated model calls to Rig."

## Scope and Findings

- Missing or partial requested behavior: none observed.
- Scope creep: none. The refactor stays within the agent runtime and its dependency surface.
- Findings: 1 Minor (S1). No Blocker or Major.

## Exclusions

This verdict does not certify live provider behavior, multi-part content parsing, installer packaging, or non-Windows targets. Those are recorded on the Data and Compatibility axes.