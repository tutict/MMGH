import { describe, expect, test } from "vitest";

import { mergeWorkspaceSnapshot } from "./workspaceSnapshot";

const makeSessionSummary = () => ({
  id: 1,
  title: "Planning",
  status: "ready",
  updatedAt: 100,
  messageCount: 2,
  lastMessagePreview: "Ready",
  mountedSkillCount: 1,
});

const makeSkillSummary = (id: number, name: string) => ({
  id,
  name,
  summary: `${name} summary`,
  triggerHint: name.toLowerCase(),
  recommendationReason: `${name} matches this session`,
  enabled: true,
});

const makeSnapshot = () => ({
  settings: {
    providerName: "OpenAI Compatible",
    baseUrl: "https://example.test/v1",
    hasApiKey: true,
    apiKey: "",
    model: "test-model",
    systemPrompt: "Be useful.",
  },
  capabilities: [
    {
      id: "runtime",
      title: "Runtime",
      description: "Local runtime",
      status: "ready",
    },
  ],
  sessions: [makeSessionSummary()],
  activeSessionId: 1,
  activeSession: {
    session: makeSessionSummary(),
    messages: [
      { id: 101, role: "user", content: "Plan this", createdAt: 90 },
      { id: 102, role: "assistant", content: "Ready", createdAt: 100 },
    ],
    activity: [
      {
        id: 201,
        kind: "plan",
        title: "Plan ready",
        detail: "Two steps",
        status: "completed",
        createdAt: 100,
      },
    ],
    mountedSkillIds: [301],
    mountedSkills: [makeSkillSummary(301, "Planner")],
    recommendedSkills: [makeSkillSummary(302, "Reviewer")],
  },
  notes: [
    {
      id: 401,
      icon: "note",
      title: "Architecture",
      summary: "Snapshot policy",
      tags: ["design"],
      updatedAt: 100,
    },
  ],
  activeNoteId: 401,
  activeNote: {
    id: 401,
    icon: "note",
    title: "Architecture",
    summary: "Snapshot policy",
    body: "Keep state stable.",
    tags: ["design"],
    createdAt: 80,
    updatedAt: 100,
  },
  reminders: [
    {
      id: 501,
      title: "Review",
      preview: "Review the change",
      dueAt: 200,
      severity: "normal",
      status: "scheduled",
      linkedNoteId: 401,
      updatedAt: 100,
    },
  ],
  activeReminderId: 501,
  activeReminder: {
    id: 501,
    title: "Review",
    detail: "Review the change",
    preview: "Review the change",
    dueAt: 200,
    severity: "normal",
    status: "scheduled",
    linkedNoteId: 401,
    createdAt: 80,
    updatedAt: 100,
  },
  skills: [makeSkillSummary(301, "Planner")],
  activeSkillId: 301,
  activeSkill: {
    id: 301,
    name: "Planner",
    summary: "Planner summary",
    description: "Plans work",
    instructions: "Create a plan.",
    triggerHint: "planning",
    enabled: true,
    permissionLevel: "low",
    createdAt: 80,
    updatedAt: 100,
  },
});

describe("mergeWorkspaceSnapshot", () => {
  test("uses the incoming snapshot as the initial value", () => {
    const nextSnapshot = makeSnapshot();

    expect(mergeWorkspaceSnapshot(null, nextSnapshot)).toBe(nextSnapshot);
  });

  test("keeps an absent incoming snapshot absent", () => {
    expect(mergeWorkspaceSnapshot(makeSnapshot(), null)).toBeNull();
  });

  test("retains the previous snapshot when the incoming value is semantically equal", () => {
    const previousSnapshot = makeSnapshot();
    const equalSnapshot = structuredClone(previousSnapshot);

    expect(mergeWorkspaceSnapshot(previousSnapshot, equalSnapshot)).toBe(previousSnapshot);
  });

  test("adopts a changed field while retaining equal sibling references", () => {
    const previousSnapshot = makeSnapshot();
    const nextSnapshot = structuredClone(previousSnapshot);
    nextSnapshot.activeNote.body = "Keep the changed state stable.";

    const mergedSnapshot = mergeWorkspaceSnapshot(previousSnapshot, nextSnapshot);

    expect(mergedSnapshot).not.toBe(previousSnapshot);
    expect(mergedSnapshot.activeNote).toBe(nextSnapshot.activeNote);
    expect(mergedSnapshot.settings).toBe(previousSnapshot.settings);
    expect(mergedSnapshot.notes).toBe(previousSnapshot.notes);
  });

  test("reuses equal active-session subtrees around a changed message", () => {
    const previousSnapshot = makeSnapshot();
    const nextSnapshot = structuredClone(previousSnapshot);
    nextSnapshot.activeSession.messages[1].content = "Revised plan";

    const mergedSnapshot = mergeWorkspaceSnapshot(previousSnapshot, nextSnapshot);

    expect(mergedSnapshot.activeSession).not.toBe(previousSnapshot.activeSession);
    expect(mergedSnapshot.activeSession.session).toBe(previousSnapshot.activeSession.session);
    expect(mergedSnapshot.activeSession.messages).not.toBe(previousSnapshot.activeSession.messages);
    expect(mergedSnapshot.activeSession.messages[0]).toBe(
      previousSnapshot.activeSession.messages[0]
    );
    expect(mergedSnapshot.activeSession.messages[1]).toBe(nextSnapshot.activeSession.messages[1]);
    expect(mergedSnapshot.activeSession.activity).toBe(previousSnapshot.activeSession.activity);
    expect(mergedSnapshot.activeSession.mountedSkillIds).toBe(
      previousSnapshot.activeSession.mountedSkillIds
    );
    expect(mergedSnapshot.activeSession.mountedSkills).toBe(
      previousSnapshot.activeSession.mountedSkills
    );
    expect(mergedSnapshot.activeSession.recommendedSkills).toBe(
      previousSnapshot.activeSession.recommendedSkills
    );
  });
});
