# Lightweight Change Contract

## Identity

- Change ID: `MMGH-LW-EXP-002`
- Mode: Lightweight
- Worker: Supervisor implementation fallback; one serial implementer

## Objective

While preserving Web and Tauri behavior, extract the desktop window lifecycle projection
from the App Shell into a typed application hook with explicit state, visibility/restored
outputs, error behavior, async subscription disposal, and testable cleanup. App remains the
composition owner but no longer sequences the Tauri lifecycle APIs.

## Included Scope

- Type the existing desktop window and lifecycle event payloads at the frontend adapter.
- Add `src/application/useDesktopRuntime.ts` to own initial projection, subscriptions,
  equal-state reuse, failure degradation, and cleanup.
- Replace the matching state/helpers/effect in `App.tsx` with the hook and stable callbacks.
- Add focused characterization tests before implementation and retain RED/GREEN evidence.

## Excluded Scope

- Browser/document visibility and focus listeners, visible-only clock, reminder scheduling,
  workspace bootstrap/refresh, storage events, weather/music/mobile resource lifecycles.
- Rust/Tauri command or event contract, capabilities, persistence, SQLite, schema,
  migrations, Provider/keyring/security rules, dependencies, UI design, and product features.
- EXP-001 snapshot module, master, merge, PR, tag, release, deployment, installer execution,
  and user-owned untracked files.

## Invariants and Ownership

1. Web fallback reports unavailable and synced without importing/registering Tauri events.
2. Tauri starts available/unsynced, reads initial state, then listens to both existing events.
3. Equal window payloads preserve projection identity; changed payloads are adopted.
4. Visible/focused native payloads emit the same boolean App visibility output.
5. Only `restored-from-tray` emits the existing restored notice output.
6. Initial read failure leaves Tauri available but unsynced and logs the same class of error.
7. Listener failures are contained and logged; successful listeners are detached on unmount,
   including registrations that resolve after disposal.
8. App, adapter, Rust, event names, and observable labels/notices retain current semantics.

## Expected Files

- `src/App.tsx`
- `src/application/useDesktopRuntime.ts`
- `src/application/useDesktopRuntime.test.tsx`
- `src/storage/tauri.ts`

## Tests and Acceptance

- Focused RED before implementation, then GREEN for Web fallback, initial sync, event outputs,
  equivalent-state reuse, failures, normal cleanup, and late-registration cleanup.
- Lint, typecheck, all frontend tests, Web build, Rust tests, unified test, and desktop debug
  build pass with skips/warnings disclosed.
- Fixed-boundary Spec verdict and Standards verdict both pass. A Major/Blocker stops
  Lightweight and triggers mode escalation; Minor correction is recorded in Results.
- Diff contains no Rust, SQL, security, dependency, lockfile, release, generated artifact,
  or user-owned file change.

## Authority and Stop Conditions

- Authorized: scoped MMGH edits, tests, experiment records, EXP-002 commits, and EXP-002 push.
- Not authorized: important deletion, master modification/push, merge, PR, tag, release,
  deployment, force-push, installer execution, or external communication.
- Stop or escalate on scope expansion, unexplained regression, unsound async cleanup, new
  runtime contract, storage/security/schema impact, Major/Blocker Review, or second rework.
