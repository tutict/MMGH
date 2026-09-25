# TASK-002 Contract

- Type: test
- Outcome: characterize that a throwing Web localStorage write rejects before durable mutation and preserves the previous serialized workspace/selection; separately document cross-tab post-write verification ambiguity without changing it.
- Allowed: `src/storage/agent.test.ts` and Delivery only.
- Forbidden: Rust, SQL, Ledgers, implementation semantics, commit/push.
- Required evidence: RED/GREEN status if applicable, focused Vitest command, skips/warnings, and limitations.
- Reviewer: independent readiness plus later Compatibility input.
