# EXP-002 Runtime/Lifecycle Audit

## Boundary and Evidence

This audit is limited to App Shell runtime and lifecycle orchestration at EXP-002 HEAD
`23ae0246c0fee309a728eb6c1c1dbaba8f50435d`. It does not reopen the EXP-001 project audit.
The current `App.tsx` has 5,547 lines and 36 `useEffect` references.

## Current Runtime Map

| Cluster | Event source and trigger | State/effect owner | Cleanup/cancellation and errors | Web/Tauri behavior | Tests and failure impact |
|---|---|---|---|---|---|
| Workspace bootstrap and deferred refresh | React mount calls `bootstrap`; Web storage events and pending-sync release call it again | `App` owns workspace, loading, error, transition, and three coordination refs; `storage/agent.ts` selects the adapter | Mount uses a cancellation flag to suppress state writes, not request abort; storage listener is removed; errors reach App state | Preview uses localStorage; Tauri invokes Rust commands | Adapter bootstrap is covered; App bootstrap ordering, stale completion, and unmount are not directly characterized. Failure can leave loading/error or stale workspace state |
| Visibility, focus, and minute clock | Initial `document.visibilityState`/`hasFocus`, browser focus/blur, document visibility change, and desktop window state | `App` owns `isAppVisible`; both browser and desktop effects write it; the visible-only clock effect owns its timer | Browser listeners and clock timeout are removed. No explicit event ordering policy exists between browser and desktop updates | Web uses browser signals. Tauri additionally projects native visible/focused state | No focused visibility tests. Incorrect ordering can pause/resume clock-derived UI at the wrong time |
| Desktop window lifecycle projection | Tauri availability, initial `desktop_window_state`, `mmgh://desktop-window-state`, and `mmgh://desktop-lifecycle` | `App` owns `desktopRuntime`; effect also emits visibility and restored-notice outputs. `storage/tauri.ts` owns lazy IPC/event loading; Rust owns native collection/emission | Disposed flag blocks late updates; late subscriptions unlisten immediately; normal cleanup awaits both unlisteners; failures are logged and initial sync stays false | Web returns an already-synced unavailable projection and registers nothing. Tauri reads once, listens twice, and reuses equal state identity | No frontend tests. Rust emits events but has no focused lifecycle contract tests. Failure degrades runtime status/visibility and may duplicate listeners if cleanup regresses |
| Reminder alert scheduler | Reminder/draft/busy/loading changes and due-time timeout | `App` owns timer, triggered-key set, navigation, selection, notice, audio resource, and alert | Main timeout is cleared. The 120 ms alert timeout is not retained for cleanup; audio errors are swallowed; failed selection removes the suppression key | Same browser APIs in Web and Tauri; desktop visibility does not gate scheduling | Pure reminder grouping is tested, scheduling is not. Failure can duplicate/miss alerts or alert after unmount |
| Secondary resource lifecycles | Weather view changes, Agent/Skill requests, music media events, object URLs, localStorage, mobile media query | `App` plus focused mobile/storage helpers | Weather/Skill use AbortController or versions; media/storage/query listeners and object URLs have explicit cleanup | Mostly shared browser behavior; storage implementation differs | Some mobile/storage behavior is covered. These are excluded because they do not form the selected boundary |

## Candidate Boundaries

| Candidate | Independent boundary | Main files | Risk and gaps | Decision |
|---|---|---|---|---|
| A. Desktop Window Lifecycle Projection | Own Tauri availability, initial native state, two subscriptions, projection identity, failure state, and cleanup; expose visibility/restored events as typed outputs | `App.tsx`, `application/useDesktopRuntime.ts`, `storage/tauri.ts`, focused test | Moderate async-listener risk; no Rust change; Web fallback is directly characterizable | Recommended first cluster |
| B. Visibility and Focus Synchronization | Own browser visibility/focus, native visibility input, and visible-only clock scheduling | `App.tsx` plus a new hook/test | Multiple competing event sources currently write one state; ordering policy is unclear | Reject for this experiment because it risks expanding across A and clock behavior |
| C. Reminder Timer and Alert Scheduling | Own due selection, rescheduling, suppression keys, audio, alert, navigation callback, and cleanup | `App.tsx` plus scheduler/hook/test | Many UI outputs; nested alert timeout cleanup gap; fake-timer and async selection complexity | Defer until its alert/navigation contract is specified |
| D. Bootstrap and Deferred Refresh | Own initial load, refresh gating, transition, pending state, errors, and cancellation | `App.tsx`, application module/hook, storage adapter tests | Coupled to drafts, busy actions, storage events, and snapshot reconciliation | Defer; not a short single-owner contract yet |

## Selected Boundary

Candidate A is the clearest independently acceptable unit. The change will move the React
consumer-side desktop lifecycle state machine into a typed application hook. The hook will
own availability detection, initial synchronization, event subscriptions, equivalent-state
reuse, error degradation, late-registration disposal, and unlisten cleanup. `App` will retain
composition state and receive only explicit visibility and restored-from-tray outputs.

This reduces App Shell responsibility rather than only relocating helpers: `App` will no
longer import or sequence Tauri lifecycle APIs or own the desktop runtime state machine.
`storage/tauri.ts` remains the adapter, and Rust remains the native event source.

## Rejected Broad Refactor and Test Gaps

- Do not combine browser visibility, clock, reminder scheduling, bootstrap, or storage sync.
- Do not modify `src-tauri`, event names/payloads, permissions, storage, schema, or security.
- Characterization must cover Web fallback, initial Tauri sync, window/lifecycle events,
  equivalent-state reuse, listener cleanup, late registration, and listener/read failure.
- Interactive tray restore, minimize/focus ordering, installer execution, and non-Windows
  behavior remain unverified even if automated tests and desktop packaging pass.
