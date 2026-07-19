# Rework Task TASK-005-R1

- Finding: `FINDING-002`
- Parent task: TASK-005 recovery rehearsal
- Status: integrated
- Previous status: approved
- Assigned role: Integrator Rework
- Assigned to: Codex primary agent
- Revision: 2 of 2
- Objective: correct only the persisted active recovery boundary so the original Recovery
  Reviewer can safely resume at TASK-004 verification.
- Allowed: root `CHECKPOINT.md`, `CONTEXT-COMPACTION.md`, Loop Map, Task/Finding Ledgers,
  Finding detail, this Rework record, and reverification report.
- Forbidden: product/tests, Scope expansion, severity change, risk acceptance, commit/push,
  user files, real credentials/network/data.
- Required outcome: actual HEAD, current worktree, mandatory TASK-004 Delivery, open Finding,
  and exact Resume Point are correct and independently actionable.
- Required evidence: Git `rev-parse/status`, artifact existence, original Recovery Reviewer
  reverification.
- Revision 1 result: correction-required; Map status, Diff Boundary, Exact Resume Required
  Inputs, and manifest objective remained stale/incomplete. Revision 2 corrects those four
  items without changing Finding severity, Scope, implementation, or authority.
- Revision 2 result: original Recovery Reviewer PASS; actual HEAD/worktree, Loop status,
  Diff Boundary, Required Inputs, manifest objective, Finding ordering, and Resume Point
  matched reality. `FINDING-002` may close without severity change or risk acceptance.
- Authority: read=true, modify=true, delete=false, commit=false, push=false, release=false,
  deploy=false, external_communication=false.
- Stop: any mismatch requiring implementation/Scope change or second failed revision.
