import React from "react";
import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { I18nProvider } from "./i18n";

const PERF_ENABLED = process.env.MMGH_PROFILE === "1";
const perfTest = PERF_ENABLED ? test : test.skip;

const settingsRenderProfile = {
  count: 0,
  reset() {
    this.count = 0;
  },
};

const skillRenderProfile = {
  count: 0,
  reset() {
    this.count = 0;
  },
};

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
    capabilities: [
      {
        id: "gateway",
        title: "Gateway",
        description: "OpenAI compatible endpoint",
        status: "ready",
      },
    ],
    sessions: [
      {
        id: 1,
        title: "Primary Session",
        status: "active",
        updatedAt: now,
        messageCount: 1,
        lastMessagePreview: "Initial request",
        mountedSkillCount: 1,
      },
    ],
    activeSessionId: 1,
    activeSession: {
      session: {
        id: 1,
        title: "Primary Session",
        status: "active",
        updatedAt: now,
        messageCount: 1,
        lastMessagePreview: "Initial request",
        mountedSkillCount: 1,
      },
      messages: [
        {
          id: 1,
          role: "user",
          content: "Initial request",
          createdAt: now,
        },
      ],
      activity: [],
      mountedSkillIds: [1],
      mountedSkills: [
        {
          id: 1,
          name: "Release Guard",
          summary: "Review risky changes before applying them.",
          triggerHint: "release, deploy, migrate",
          recommendationReason: null,
          enabled: true,
        },
      ],
      recommendedSkills: [
        {
          id: 1,
          name: "Release Guard",
          summary: "Review risky changes before applying them.",
          triggerHint: "release, deploy, migrate",
          recommendationReason: "Relevant to current session",
          enabled: true,
        },
      ],
    },
    notes: [
      {
        id: 1,
        icon: "*",
        title: "Runbook",
        summary: "Deployment checklist",
        tags: ["ops"],
        updatedAt: now,
      },
    ],
    activeNoteId: 1,
    activeNote: {
      id: 1,
      icon: "*",
      title: "Runbook",
      summary: "Deployment checklist",
      body: "Verify build, deploy, and monitor alerts.",
      tags: ["ops"],
      createdAt: now,
      updatedAt: now,
    },
    reminders: [
      {
        id: 1,
        title: "Verify rollout",
        preview: "Check dashboards after deploy",
        dueAt: now + 60 * 60 * 1000,
        severity: "medium",
        status: "scheduled",
        linkedNoteId: 1,
        updatedAt: now,
      },
    ],
    activeReminderId: 1,
    activeReminder: {
      id: 1,
      title: "Verify rollout",
      detail: "Check dashboards after deploy",
      preview: "Check dashboards after deploy",
      dueAt: now + 60 * 60 * 1000,
      severity: "medium",
      status: "scheduled",
      linkedNoteId: 1,
      createdAt: now,
      updatedAt: now,
    },
    skills: [
      {
        id: 1,
        name: "Release Guard",
        summary: "Review risky changes before applying them.",
        triggerHint: "release, deploy, migrate",
        recommendationReason: null,
        enabled: true,
      },
    ],
    activeSkillId: 1,
    activeSkill: {
      id: 1,
      name: "Release Guard",
      summary: "Review risky changes before applying them.",
      description: "Review risky changes before applying them.",
      instructions: "Call out risk before execution.",
      triggerHint: "release, deploy, migrate",
      enabled: true,
      permissionLevel: "low",
      createdAt: now,
      updatedAt: now,
    },
  };
};

const cloneWorkspaceSnapshot = () => JSON.parse(JSON.stringify(createWorkspaceSnapshot()));

vi.mock("./storage/agent", () => {
  const resolveSnapshot = async () => cloneWorkspaceSnapshot();
  return {
    PREVIEW_WORKSPACE_STORAGE_KEY: "mmgh_agent_workspace_v1",
    bootstrap: vi.fn(resolveSnapshot),
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

vi.mock("./components/WeatherWorkspace", () => {
  const weatherLocations = [
    {
      id: "shanghai",
      label: "Shanghai",
      latitude: 31.2304,
      longitude: 121.4737,
      timeZone: "Asia/Shanghai",
    },
  ];

  return {
    default: () => <div data-testid="weather-workspace" />,
    WEATHER_LOCATIONS: weatherLocations,
    createInitialWeatherCities: (locations) =>
      (Array.isArray(locations) ? locations : weatherLocations).map((location) => ({
        id: location.id,
        name: location.label || location.name || location.id,
        timeZone: location.timeZone || "UTC",
        summary: "Clear",
        temperature: 24,
      })),
    fetchWeatherSnapshots: vi.fn(async (locations) =>
      (Array.isArray(locations) ? locations : weatherLocations).map((location) => ({
        id: location.id,
        name: location.label || location.name || location.id,
        timeZone: location.timeZone || "UTC",
        summary: "Clear",
        temperature: 24,
      }))
    ),
  };
});

vi.mock("./components/MiniPlayerBar", () => ({
  default: () => null,
}));

vi.mock("./components/SettingsWorkspace", async () => {
  const ReactModule = await import("react");
  const actual = await vi.importActual("./components/SettingsWorkspace");
  const WrappedSettingsWorkspace = ReactModule.memo((props) => {
    settingsRenderProfile.count += 1;
    return <actual.default {...props} />;
  });

  return {
    default: WrappedSettingsWorkspace,
  };
});

function areSkillWorkspaceTestPropsEqual(previousProps, nextProps) {
  return (
    previousProps.activeSkill === nextProps.activeSkill &&
    previousProps.activeSkillId === nextProps.activeSkillId &&
    previousProps.activeSkillVersions === nextProps.activeSkillVersions &&
    previousProps.activeSessionRecommendedSkills === nextProps.activeSessionRecommendedSkills &&
    previousProps.activeSessionTitle === nextProps.activeSessionTitle &&
    previousProps.busy === nextProps.busy &&
    previousProps.hasUnsavedSkill === nextProps.hasUnsavedSkill &&
    previousProps.loading === nextProps.loading &&
    previousProps.mountedSkillIds === nextProps.mountedSkillIds &&
    previousProps.providerConfigured === nextProps.providerConfigured &&
    previousProps.skillDraft === nextProps.skillDraft &&
    previousProps.skillImportInputRef === nextProps.skillImportInputRef &&
    previousProps.skillList === nextProps.skillList &&
    previousProps.skillSearch === nextProps.skillSearch
  );
}

vi.mock("./components/SkillWorkspace", async () => {
  const ReactModule = await import("react");
  const actual = await vi.importActual("./components/SkillWorkspace");
  const WrappedSkillWorkspace = ReactModule.memo((props) => {
    skillRenderProfile.count += 1;
    return <actual.default {...props} />;
  }, areSkillWorkspaceTestPropsEqual);

  return {
    default: WrappedSkillWorkspace,
  };
});

perfTest("app settings view skips unrelated clock tick renders", async () => {
  const previousMatchMedia = window.matchMedia;
  const loadSpy = vi
    .spyOn(window.HTMLMediaElement.prototype, "load")
    .mockImplementation(() => {});
  const playSpy = vi
    .spyOn(window.HTMLMediaElement.prototype, "play")
    .mockImplementation(async () => {});
  const pauseSpy = vi
    .spyOn(window.HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});

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

  settingsRenderProfile.reset();

  try {
    const { default: App } = await import("./App");

    const mountStart = performance.now();
    render(
      <I18nProvider initialLang="en-US">
        <App />
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "MMGH Agent", level: 1 });
    const settingsButton = screen.getAllByRole("button", { name: /Settings/i })[0];
    expect(settingsButton).toBeTruthy();
    await act(async () => {
      settingsButton.click();
    });
    await screen.findByText("Model gateway and cache controls");
    const mountMs = performance.now() - mountStart;

    settingsRenderProfile.reset();
    const tickStart = performance.now();
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 3100);
      });
    });
    const clockTickWindowMs = performance.now() - tickStart;

    console.log(`PERF_REACT settings_mount_ms=${mountMs.toFixed(3)}`);
    console.log(`PERF_REACT settings_clock_tick_window_ms=${clockTickWindowMs.toFixed(3)}`);
    console.log(`PERF_REACT settings_clock_tick_render_count=${settingsRenderProfile.count}`);

    expect(settingsRenderProfile.count).toBeLessThanOrEqual(1);
  } finally {
    window.matchMedia = previousMatchMedia;
    loadSpy.mockRestore();
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  }
}, 15000);

perfTest("app skills view skips unrelated clock tick renders", async () => {
  const previousMatchMedia = window.matchMedia;
  const loadSpy = vi
    .spyOn(window.HTMLMediaElement.prototype, "load")
    .mockImplementation(() => {});
  const playSpy = vi
    .spyOn(window.HTMLMediaElement.prototype, "play")
    .mockImplementation(async () => {});
  const pauseSpy = vi
    .spyOn(window.HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});

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

  skillRenderProfile.reset();

  try {
    const { default: App } = await import("./App");

    const mountStart = performance.now();
    render(
      <I18nProvider initialLang="en-US">
        <App />
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "MMGH Agent", level: 1 });
    const skillsButton = screen.getAllByRole("button", { name: /Skills/i })[0];
    expect(skillsButton).toBeTruthy();
    await act(async () => {
      skillsButton.click();
    });
    await screen.findByText("Skill Center");
    const mountMs = performance.now() - mountStart;

    skillRenderProfile.reset();
    const tickStart = performance.now();
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 3100);
      });
    });
    const clockTickWindowMs = performance.now() - tickStart;

    console.log(`PERF_REACT skills_mount_ms=${mountMs.toFixed(3)}`);
    console.log(`PERF_REACT skills_clock_tick_window_ms=${clockTickWindowMs.toFixed(3)}`);
    console.log(`PERF_REACT skills_clock_tick_render_count=${skillRenderProfile.count}`);

    expect(skillRenderProfile.count).toBeLessThanOrEqual(1);
  } finally {
    window.matchMedia = previousMatchMedia;
    loadSpy.mockRestore();
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  }
}, 15000);
