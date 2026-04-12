import { vi } from "vitest";

const loadAgentModule = async () => {
  vi.resetModules();
  window.localStorage.clear();
  const agent = await import("./agent");
  agent.__previewTestUtils.resetPreviewState();
  return agent;
};

test("blank save keeps the current preview api key", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();

  const savedSnapshot = await agent.saveSettings({
    settings: {
      ...initialSnapshot.settings,
      clearApiKey: false,
      apiKey: "key-one",
    },
    activeSessionId: initialSnapshot.activeSessionId,
  });

  const keptSnapshot = await agent.saveSettings({
    settings: {
      ...savedSnapshot.settings,
      clearApiKey: false,
      apiKey: "   ",
    },
    activeSessionId: savedSnapshot.activeSessionId,
  });

  expect(keptSnapshot.settings.hasApiKey).toBe(true);
  expect(keptSnapshot.settings.apiKey).toBe("");
  expect(agent.__previewTestUtils.getResolvedPreviewApiKey(keptSnapshot.settings)).toBe(
    "key-one"
  );
  expect(window.localStorage.getItem("mmgh_agent_preview_api_key_v1")).toBeNull();
});

test("entering a new preview api key replaces the active runtime key without persisting plaintext", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();

  await agent.saveSettings({
    settings: {
      ...initialSnapshot.settings,
      clearApiKey: false,
      apiKey: "key-one",
    },
    activeSessionId: initialSnapshot.activeSessionId,
  });

  const overwrittenSnapshot = await agent.saveSettings({
    settings: {
      ...initialSnapshot.settings,
      clearApiKey: false,
      apiKey: "key-two",
    },
    activeSessionId: initialSnapshot.activeSessionId,
  });

  expect(overwrittenSnapshot.settings.hasApiKey).toBe(true);
  expect(agent.__previewTestUtils.getResolvedPreviewApiKey(overwrittenSnapshot.settings)).toBe(
    "key-two"
  );
  expect(agent.__previewTestUtils.getPersistedPreviewApiKey()).toBe("");
  expect(agent.__previewTestUtils.getPersistedWorkspaceSettings()).toMatchObject({
    apiKey: "",
    hasApiKey: false,
  });
});

test("explicit clear removes the current preview api key", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();

  await agent.saveSettings({
    settings: {
      ...initialSnapshot.settings,
      clearApiKey: false,
      apiKey: "key-one",
    },
    activeSessionId: initialSnapshot.activeSessionId,
  });

  const clearedSnapshot = await agent.saveSettings({
    settings: {
      ...initialSnapshot.settings,
      clearApiKey: true,
      apiKey: "",
    },
    activeSessionId: initialSnapshot.activeSessionId,
  });

  expect(clearedSnapshot.settings.hasApiKey).toBe(false);
  expect(agent.__previewTestUtils.getResolvedPreviewApiKey(clearedSnapshot.settings)).toBe("");
  expect(agent.__previewTestUtils.getPersistedPreviewApiKey()).toBe("");
  expect(agent.__previewTestUtils.getPersistedWorkspaceSettings()).toMatchObject({
    apiKey: "",
    hasApiKey: false,
  });
});

test("preview settings reject remote http provider endpoints", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();

  await expect(
    agent.saveSettings({
      settings: {
        ...initialSnapshot.settings,
        baseUrl: "http://example.com/v1",
      },
      activeSessionId: initialSnapshot.activeSessionId,
    })
  ).rejects.toThrow("https unless it points to localhost or a private network");
});

test("preview api key does not survive module reloads or leak into localStorage", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();

  await agent.saveSettings({
    settings: {
      ...initialSnapshot.settings,
      clearApiKey: false,
      apiKey: "key-cross-tab",
    },
    activeSessionId: initialSnapshot.activeSessionId,
  });

  vi.resetModules();
  const reloadedAgent = await import("./agent");
  const reloadedSnapshot = await reloadedAgent.bootstrap();

  expect(reloadedSnapshot.settings.hasApiKey).toBe(false);
  expect(reloadedSnapshot.settings.apiKey).toBe("");
  expect(reloadedAgent.__previewTestUtils.getResolvedPreviewApiKey(reloadedSnapshot.settings)).toBe("");
  expect(window.localStorage.getItem("mmgh_agent_preview_api_key_v1")).toBeNull();
  expect(reloadedAgent.__previewTestUtils.getPersistedWorkspaceSettings()).toMatchObject({
    apiKey: "",
    hasApiKey: false,
  });
});

test("bootstrap scrubs legacy plaintext preview api keys from localStorage", async () => {
  window.localStorage.setItem("mmgh_agent_preview_api_key_v1", "legacy-preview-key");
  vi.resetModules();
  const agent = await import("./agent");
  const snapshot = await agent.bootstrap();

  expect(snapshot.settings.hasApiKey).toBe(false);
  expect(agent.__previewTestUtils.getResolvedPreviewApiKey(snapshot.settings)).toBe("");
  expect(window.localStorage.getItem("mmgh_agent_preview_api_key_v1")).toBeNull();
});

test("saving a missing preview reminder fails instead of silently succeeding", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();

  await expect(
    agent.saveReminder({
      reminder: {
        id: 999,
        title: "Missing reminder",
        detail: "",
        dueAt: null,
        severity: "medium",
        status: "scheduled",
        linkedNoteId: null,
      },
      activeSessionId: initialSnapshot.activeSessionId,
    })
  ).rejects.toThrow("Reminder not found.");
});

test("preview reminder save clears orphaned linked note ids", async () => {
  const agent = await loadAgentModule();
  const initialSnapshot = await agent.bootstrap();
  const reminderSnapshot = await agent.createReminder({
    title: "Linked reminder",
    activeSessionId: initialSnapshot.activeSessionId,
  });
  const reminder = reminderSnapshot.reminders[0];

  const savedSnapshot = await agent.saveReminder({
    reminder: {
      ...reminder,
      linkedNoteId: 999,
    },
    activeSessionId: reminderSnapshot.activeSessionId,
  });

  expect(savedSnapshot.reminders[0].linkedNoteId).toBeNull();
});

test("saving session skills for a missing preview session fails fast", async () => {
  const agent = await loadAgentModule();

  await expect(
    agent.saveSessionSkills({
      sessionId: 999,
      skillIds: [],
      activeSessionId: 999,
    })
  ).rejects.toThrow("Session not found.");
});

test("preview workspace persistence failures surface a clear error", async () => {
  const agent = await loadAgentModule();
  await agent.bootstrap();
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const setItemSpy = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

  await expect(agent.createSession("Overflow")).rejects.toThrow(
    "Failed to persist preview workspace. Local storage may be full."
  );

  setItemSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("preview workspace concurrent edits fail with a retryable conflict error", async () => {
  const agent = await loadAgentModule();
  await agent.bootstrap();
  const originalGetItem = Storage.prototype.getItem;
  const initialRaw = originalGetItem.call(window.localStorage, "mmgh_agent_workspace_v1");
  let shouldReturnChangedRaw = false;

  const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (key) {
    if (key !== "mmgh_agent_workspace_v1") {
      return originalGetItem.call(this, key);
    }

    shouldReturnChangedRaw = !shouldReturnChangedRaw;
    return shouldReturnChangedRaw ? initialRaw : `${initialRaw} `;
  });

  await expect(agent.createSession("Concurrent write")).rejects.toThrow(
    "Preview workspace changed in another tab. Please retry the action."
  );

  getItemSpy.mockRestore();
});

test("running a preview agent session with a missing session id fails fast", async () => {
  const agent = await loadAgentModule();

  await expect(
    agent.runAgent({
      sessionId: 999,
      prompt: "Check missing session handling",
    })
  ).rejects.toThrow("Session not found.");
});

test("preview skill generation surfaces a warning when model generation falls back locally", async () => {
  const agent = await loadAgentModule();
  const fetchSpy = vi.spyOn(window, "fetch").mockRejectedValue(new Error("Network down"));

  const generated = await agent.forgeSkill({
    existingSkill: null,
    lang: "en-US",
    prompt: "Create a review skill for React components",
    settings: {
      baseUrl: "https://example.com/v1",
      apiKey: "preview-key",
      model: "gpt-test",
    },
  });

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(generated.name).toContain("Create a review skill for Re");
  expect(generated.warning).toContain("local draft was created instead");
  expect(generated.warning).toContain("Network down");

  fetchSpy.mockRestore();
});

test("invalid preview workspace payload is backed up without being overwritten during bootstrap", async () => {
  const agent = await loadAgentModule();
  const invalidRaw = "{\"sessions\":}";
  window.localStorage.setItem("mmgh_agent_workspace_v1", invalidRaw);

  const snapshot = await agent.bootstrap();

  expect(snapshot.sessions.length).toBeGreaterThan(0);
  expect(window.localStorage.getItem("mmgh_agent_workspace_v1")).toBe(invalidRaw);
  expect(agent.__previewTestUtils.getCorruptWorkspaceBackup()).toMatchObject({
    raw: invalidRaw,
  });
});
