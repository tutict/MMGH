import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { I18nProvider } from "./i18n";

const bootstrapControl = vi.hoisted(() => {
  const control: { resolve?: (snapshot: unknown) => void } = {};
  const promise = new Promise((resolve) => {
    control.resolve = resolve;
  });
  return {
    promise,
    resolve: (snapshot: unknown) => control.resolve?.(snapshot),
  };
});

const createWorkspaceSnapshot = () => {
  const now = 1_710_000_000_000;
  return {
    settings: {
      providerName: "OpenAI Compatible",
      baseUrl: "https://api.openai.com/v1",
      hasApiKey: true,
      apiKey: "",
      model: "gpt-4.1-mini",
      systemPrompt: "Keep replies concise.",
    },
    capabilities: [],
    sessions: [],
    activeSessionId: 0,
    activeSession: null,
    notes: [],
    activeNoteId: 0,
    activeNote: null,
    reminders: [],
    activeReminderId: 0,
    activeReminder: null,
    skills: [],
    activeSkillId: 0,
    activeSkill: null,
    updatedAt: now,
  };
};

vi.mock("./storage/agent", () => {
  const resolveSnapshot = async () => createWorkspaceSnapshot();
  return {
    PREVIEW_WORKSPACE_STORAGE_KEY: "mmgh_agent_workspace_v1",
    bootstrap: vi.fn(() => bootstrapControl.promise),
    createReminder: vi.fn(resolveSnapshot),
    createSkill: vi.fn(resolveSnapshot),
    createKnowledgeNote: vi.fn(resolveSnapshot),
    createSession: vi.fn(resolveSnapshot),
    deleteReminder: vi.fn(resolveSnapshot),
    deleteSkill: vi.fn(resolveSnapshot),
    deleteKnowledgeNote: vi.fn(resolveSnapshot),
    deleteSession: vi.fn(resolveSnapshot),
    openKnowledgeNote: vi.fn(resolveSnapshot),
    openReminder: vi.fn(resolveSnapshot),
    openSkill: vi.fn(resolveSnapshot),
    openSession: vi.fn(resolveSnapshot),
    runAgent: vi.fn(resolveSnapshot),
    forgeSkill: vi.fn(async () => ({
      name: "Generated skill",
      description: "Generated",
      triggerHint: "generated",
      instructions: "Generated instructions",
    })),
    saveSessionSkills: vi.fn(resolveSnapshot),
    saveReminder: vi.fn(resolveSnapshot),
    saveSkill: vi.fn(resolveSnapshot),
    saveKnowledgeNote: vi.fn(resolveSnapshot),
    saveSettings: vi.fn(resolveSnapshot),
  };
});

vi.mock("./components/MiniPlayerBar", () => ({
  default: () => null,
}));

function installDesktopViewport() {
  const previousMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  return () => {
    window.matchMedia = previousMatchMedia;
  };
}

test("the first settings hydration keeps an edit made before the snapshot landed", async () => {
  const restoreViewport = installDesktopViewport();

  try {
    const { default: App } = await import("./App");

    render(
      <I18nProvider initialLang="en-US">
        <App />
      </I18nProvider>
    );

    const settingsButton = screen.getAllByRole("button", { name: /Settings/i })[0];
    await act(async () => {
      settingsButton.click();
    });

    const baseUrlField = (await screen.findByLabelText(/Base URL/, undefined, {
      timeout: 5000,
    })) as HTMLInputElement;
    fireEvent.change(baseUrlField, { target: { value: "https://typed.example/v1" } });
    expect(baseUrlField.value).toBe("https://typed.example/v1");

    await act(async () => {
      bootstrapControl.resolve(createWorkspaceSnapshot());
      await bootstrapControl.promise;
    });

    await waitFor(
      async () =>
        expect(((await screen.findByLabelText(/Model/, undefined, { timeout: 5000 })) as HTMLInputElement)
          .value).toBe("gpt-4.1-mini")
    );
    expect(((await screen.findByLabelText(/Base URL/)) as HTMLInputElement).value).toBe(
      "https://typed.example/v1"
    );
    expect(((await screen.findByLabelText(/Provider name/)) as HTMLInputElement).value).toBe(
      "OpenAI Compatible"
    );

    const saveButton = screen.getByRole("button", { name: "Save settings" });
    expect(saveButton).not.toBeDisabled();
  } finally {
    restoreViewport();
  }
});
