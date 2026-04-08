const STORAGE_KEY = "mmgh_agent_workspace_v1";
const LANG_STORAGE_KEY = "mmgh-lang";
const DEFAULT_LANG = "zh-CN";

const STORAGE_TEXT = {
  "zh-CN": {
    systemPrompt: "You are a desktop agent. Clarify the goal, propose an executable plan, and state the next action.",
    newMission: "New Mission",
    previewReadyMessage:
      "Browser preview mode is ready. In Tauri, the real session state and execution trace will be handled by the Rust runtime.",
    previewReadyTitle: "Preview ready",
    previewReadyDetail: "Frontend preview mode is active so the layout can be tested without Tauri.",
    welcomeNote: "Welcome note",
    knowledgeBody:
      "# Knowledge Vault\n\nUse this area like a local Notion page.\n\n- Save stable product facts.\n- Keep reusable prompts.\n- Build a small private knowledge base.",
    startWriting: "Start writing here.",
    localRecall: "Local note recall",
    localRecallDesc:
      "Bias the agent toward checking local notes and durable context before answering.",
    localRecallInstructions:
      "Before answering, review the local knowledge notes mentally, prefer stable facts, and align the response with any relevant notes. This skill is low-permission only and must not assume elevated access.",
    localRecallTrigger:
      "Use when the operator asks for note-based context, private docs, or durable knowledge.",
    customSkillDesc: "Describe what this custom skill should push the agent toward.",
    customSkillInstructions:
      "Write the reusable instruction block for this skill. All custom skills are low-permission only.",
    customSkillTrigger: "Describe when the skill should activate.",
    newReminder: "New reminder",
    reminderDetail:
      "Capture the next action, attach a note, and set when it should surface again.",
    newSkill: "New skill",
    untitledNote: "Untitled note",
    promptRequired: "Please enter a mission prompt.",
    mountedSkillsPrefix: "Mounted low-permission skills: {skills}.",
    replyConfigured:
      "Preview mode will not call the remote provider, but the provider configuration is complete. Mission recorded: {text}.{suffix}",
    replyPending:
      "No real provider is configured yet, so preview mode recorded this mission locally: {text}.{suffix}",
    nextSteps:
      "Suggested next steps:\n1. Switch into the Tauri desktop runtime.\n2. Fill in baseUrl, apiKey and model.\n3. Send the mission again to use the Rust runtime path.",
    previewReplyReadyTitle: "Preview reply ready",
    previewReplyReadyDetail: "A local preview response has been generated.",
    executionPlanTitle: "Execution plan drafted",
    executionPlanDetail:
      "1. Receive mission input. 2. Generate preview response. 3. Point the operator to the Tauri/Rust runtime.",
    sessionSkillsLoadedTitle: "Session skills loaded",
    sessionSkillsLoadedSome: "Mounted low-permission skills applied: {skills}.",
    sessionSkillsLoadedNone: "No enabled skills were mounted on this session.",
  },
  "en-US": {
    systemPrompt:
      "You are a desktop agent. Clarify the goal, propose an executable plan, and state the next action.",
    newMission: "New Mission",
    previewReadyMessage:
      "Browser preview mode is ready. In Tauri, the real session state and execution trace will be handled by the Rust runtime.",
    previewReadyTitle: "Preview ready",
    previewReadyDetail: "Frontend preview mode is active so the layout can be tested without Tauri.",
    welcomeNote: "Welcome note",
    knowledgeBody:
      "# Knowledge Vault\n\nUse this area like a local Notion page.\n\n- Save stable product facts.\n- Keep reusable prompts.\n- Build a small private knowledge base.",
    startWriting: "Start writing here.",
    localRecall: "Local note recall",
    localRecallDesc:
      "Bias the agent toward checking local notes and durable context before answering.",
    localRecallInstructions:
      "Before answering, review the local knowledge notes mentally, prefer stable facts, and align the response with any relevant notes. This skill is low-permission only and must not assume elevated access.",
    localRecallTrigger:
      "Use when the operator asks for note-based context, private docs, or durable knowledge.",
    customSkillDesc: "Describe what this custom skill should push the agent toward.",
    customSkillInstructions:
      "Write the reusable instruction block for this skill. All custom skills are low-permission only.",
    customSkillTrigger: "Describe when the skill should activate.",
    newReminder: "New reminder",
    reminderDetail:
      "Capture the next action, attach a note, and set when it should surface again.",
    newSkill: "New skill",
    untitledNote: "Untitled note",
    promptRequired: "Please enter a mission prompt.",
    mountedSkillsPrefix: "Mounted low-permission skills: {skills}.",
    replyConfigured:
      "Preview mode will not call the remote provider, but the provider configuration is complete. Mission recorded: {text}.{suffix}",
    replyPending:
      "No real provider is configured yet, so preview mode recorded this mission locally: {text}.{suffix}",
    nextSteps:
      "Suggested next steps:\n1. Switch into the Tauri desktop runtime.\n2. Fill in baseUrl, apiKey and model.\n3. Send the mission again to use the Rust runtime path.",
    previewReplyReadyTitle: "Preview reply ready",
    previewReplyReadyDetail: "A local preview response has been generated.",
    executionPlanTitle: "Execution plan drafted",
    executionPlanDetail:
      "1. Receive mission input. 2. Generate preview response. 3. Point the operator to the Tauri/Rust runtime.",
    sessionSkillsLoadedTitle: "Session skills loaded",
    sessionSkillsLoadedSome: "Mounted low-permission skills applied: {skills}.",
    sessionSkillsLoadedNone: "No enabled skills were mounted on this session.",
  },
};

const normalizeLang = (value) => {
  if (!value) {
    return DEFAULT_LANG;
  }
  const input = String(value).toLowerCase();
  if (input.startsWith("en")) {
    return "en-US";
  }
  if (input.startsWith("zh")) {
    return "zh-CN";
  }
  return DEFAULT_LANG;
};

const getCurrentLang = () => {
  if (typeof window !== "undefined") {
    const savedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (savedLang) {
      return normalizeLang(savedLang);
    }
  }

  if (typeof navigator !== "undefined") {
    return normalizeLang(navigator.language || navigator.languages?.[0]);
  }

  return DEFAULT_LANG;
};

const storageT = (key, vars) => {
  const lang = getCurrentLang();
  const dict = STORAGE_TEXT[lang] || STORAGE_TEXT[DEFAULT_LANG];
  const template = dict[key] || STORAGE_TEXT[DEFAULT_LANG][key] || key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = vars[name];
    return value == null ? "" : String(value);
  });
};

const isTauriAvailable = () =>
  typeof window !== "undefined" &&
  window.__TAURI__ &&
  window.__TAURI__.tauri &&
  window.__TAURI__.tauri.promisified;

const invokeTauri = (payload) => window.__TAURI__.tauri.promisified(payload);

const now = () => Date.now();

const defaultSettings = () => ({
  providerName: "OpenAI Compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4.1-mini",
  systemPrompt: storageT("systemPrompt"),
});

const defaultCapabilities = () => [
  {
    id: "runtime",
    title: "Rust Runtime",
    description: "In desktop mode Rust owns persistence, planning, and model calls.",
    status: "ready",
  },
  {
    id: "gateway",
    title: "LLM Gateway",
    description: "OpenAI chat completions compatible provider path.",
    status: "ready",
  },
  {
    id: "trace",
    title: "Execution Trace",
    description: "Every run keeps mission input, plan, and output status.",
    status: "ready",
  },
  {
    id: "knowledge",
    title: "Knowledge Vault",
    description: "Local notes act as a durable knowledge base.",
    status: "ready",
  },
  {
    id: "reminders",
    title: "Reminder Center",
    description: "Time-based notes and follow-ups stay scheduled on the desktop.",
    status: "ready",
  },
  {
    id: "skills",
    title: "Custom Skills",
    description: "Reusable prompt skills with low-permission execution only.",
    status: "ready",
  },
  {
    id: "desktop",
    title: "Tauri Shell",
    description: "Native shell for desktop packaging and platform APIs.",
    status: "ready",
  },
];

const STARTER_SKILL_SEEDS = [
  {
    name: "Note Recall",
    aliases: ["Local note recall"],
    description: "Bias the agent toward local notes, durable facts, and previously captured context.",
    instructions:
      "Before answering, check whether the local note set likely contains stable context. Prefer durable facts from notes over fresh guesses, and call out when the notes appear incomplete or stale.",
    triggerHint:
      "Use when the operator asks for context from local notes, private docs, or stable project knowledge.",
  },
  {
    name: "Knowledge Librarian",
    description:
      "Turn volatile chat into clean notes, reusable summaries, and durable knowledge entries.",
    instructions:
      "Distill the conversation into durable facts, open questions, and next actions. Suggest a note title, a compact summary, and a tag set that would fit the Knowledge Vault. Do not invent facts that were not present in the conversation or local notes.",
    triggerHint:
      "Use when the operator wants to extract facts, consolidate a discussion, or turn output into a reusable knowledge note.",
  },
  {
    name: "Reminder Radar",
    description: "Keep due items, follow-ups, and reminder-worthy actions visible during planning.",
    instructions:
      "Surface overdue or due-soon items before proposing brand new work. Turn loose asks into actionable reminder candidates with owner, deadline, and expected outcome when possible. Do not claim a reminder was saved unless the operator explicitly asks for that step.",
    triggerHint:
      "Use when the task mentions deadlines, follow-ups, to-dos, scheduling, or asks to remember something later.",
  },
  {
    name: "Weather Brief",
    description:
      "Summarize visible weather context and keep weather-related advice grounded in actual data.",
    instructions:
      "If concrete weather data is present in the session context or the operator provides it, summarize it clearly and connect it to the request. If live weather data is missing, ask the operator to open the Weather workspace or paste the visible city snapshot. Never invent current conditions.",
    triggerHint:
      "Use when the operator asks about the weather board, compares cities, or wants packing and travel advice tied to current conditions.",
  },
  {
    name: "Music Companion",
    description:
      "Turn mood, reply rhythm, and track context into playlist or playback suggestions.",
    instructions:
      "Use only the track names, artists, lyrics, or playback state that appear in the conversation or visible runtime context. Suggest ordering, transitions, mood fit, and playback notes. Do not claim you can hear audio or read lyrics unless that content was provided.",
    triggerHint:
      "Use when the operator asks for playlist ideas, mood matching, track ordering, or reply-synced music suggestions.",
  },
  {
    name: "Gallery Curator",
    description:
      "Organize gallery items into themes, captions, tags, and memory-friendly collections.",
    instructions:
      "Use the filenames, descriptions, and user-provided context to suggest albums, favorite candidates, captions, and retrieval-friendly tags. Do not claim to inspect image pixels unless the images themselves are provided to the agent.",
    triggerHint:
      "Use when the operator wants to group photos, write captions, build collections, or clean up a gallery.",
  },
  {
    name: "Settings Steward",
    description:
      "Keep provider, cache, and runtime settings changes deliberate, explicit, and reversible.",
    instructions:
      "Restate the intended settings change, call out impact and reversibility, and prefer the smallest safe update. Warn before cache-clearing or state-reset actions, and never pretend a provider setting works until the required fields are present.",
    triggerHint:
      "Use when the task touches provider config, cache clearing, system prompts, runtime toggles, or other settings work.",
  },
  {
    name: "Release Guard",
    description:
      "Slow the agent down around risky edits, migrations, deletions, and production-impacting changes.",
    instructions:
      "Treat risky changes as a review gate. Surface rollback impact, migration risks, and testing gaps before modifying code or config. Favor reversible edits and explicit verification steps.",
    triggerHint:
      "Use when the task touches deployment, migrations, auth, billing, or destructive file changes.",
  },
  {
    name: "UI Polish",
    description:
      "Push the agent toward sharper layout, stronger hierarchy, and less generic frontend output.",
    instructions:
      "Aim for deliberate interface structure, clear hierarchy, and stronger visual rhythm. Avoid generic dashboard filler. Keep motion purposeful, spacing consistent, and mobile behavior explicit.",
    triggerHint:
      "Use when the task changes user-facing layout, interaction design, or visual presentation.",
  },
  {
    name: "Research Mode",
    description:
      "Optimize for source-backed answers, validation, and clear uncertainty handling.",
    instructions:
      "Prioritize primary sources, note what is verified versus inferred, and summarize unresolved gaps before concluding. Avoid confident claims when evidence is thin or time-sensitive.",
    triggerHint:
      "Use when the task needs documentation checks, verification, citations, or comparison across sources.",
  },
  {
    name: "Task Router",
    description:
      "Improve decomposition, next-step planning, and execution ordering for bigger tasks.",
    instructions:
      "Break the task into a minimal critical path, keep side work clearly separated, and sequence execution so blockers are resolved before polish work. State assumptions when they affect downstream steps.",
    triggerHint:
      "Use when the request is broad, multi-step, or likely to branch into implementation plus verification.",
  },
];

const toPreview = (value, limit = 92) => {
  const compact = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (compact.length <= limit) {
    return compact;
  }
  return `${compact.slice(0, limit)}...`;
};

const dedupeIds = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => Number(value)).filter((value) => value > 0))];
};

const resolveNextId = (value, items) => {
  const parsedValue = Number(value) || 0;
  const maxExistingId = Math.max(
    0,
    ...(Array.isArray(items) ? items : []).map((item) => Number(item?.id) || 0)
  );
  return Math.max(parsedValue, maxExistingId + 1);
};

const resolveActiveId = (value, items) => {
  const parsedValue = Number(value) || 0;
  const normalizedItems = Array.isArray(items) ? items : [];
  if (parsedValue > 0 && normalizedItems.some((item) => item.id === parsedValue)) {
    return parsedValue;
  }
  return normalizedItems[0]?.id || 0;
};

const createSeedSession = (id, title = storageT("newMission"), skillIds = []) => {
  const timestamp = now();
  return {
    id,
    title,
    status: "idle",
    updatedAt: timestamp,
    skillIds: dedupeIds(skillIds),
    messages: [
      {
        id: timestamp,
        role: "assistant",
        content: storageT("previewReadyMessage"),
        createdAt: timestamp,
      },
    ],
    activity: [
      {
        id: timestamp + 1,
        kind: "system",
        title: storageT("previewReadyTitle"),
        detail: storageT("previewReadyDetail"),
        status: "completed",
        createdAt: timestamp + 1,
      },
    ],
  };
};

const createSeedNote = (id, title = storageT("welcomeNote")) => {
  const timestamp = now();
  const body =
    title === storageT("welcomeNote")
      ? storageT("knowledgeBody")
      : `# ${title}\n\n${storageT("startWriting")}`;
  return {
    id,
    icon: "*",
    title,
    body,
    tags: title === storageT("welcomeNote") ? ["knowledge", "starter"] : [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const createCustomSkill = (id, name = storageT("newSkill")) => {
  const timestamp = now();
  return {
    id,
    name,
    description: storageT("customSkillDesc"),
    instructions: storageT("customSkillInstructions"),
    triggerHint: storageT("customSkillTrigger"),
    enabled: true,
    permissionLevel: "low",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const createStarterSkills = (startId = 1) => {
  const timestamp = now();
  return STARTER_SKILL_SEEDS.map((seed, index) => ({
    id: startId + index,
    name: seed.name,
    description: seed.description,
    instructions: seed.instructions,
    triggerHint: seed.triggerHint,
    enabled: true,
    permissionLevel: "low",
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
};

const findStarterSeed = (skillName) => {
  const normalizedName = String(skillName || "").trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  return (
    STARTER_SKILL_SEEDS.find((seed) =>
      [seed.name, ...(seed.aliases || [])]
        .map((name) => String(name || "").trim().toLowerCase())
        .includes(normalizedName)
    ) || null
  );
};

const mergeStarterSkillCatalog = (skills) => {
  const normalizedSkills = Array.isArray(skills) ? skills.filter(Boolean) : [];
  const existingStarterNames = new Set(
    normalizedSkills
      .map((skill) => findStarterSeed(skill?.name))
      .filter(Boolean)
      .map((seed) => seed.name)
  );
  const maxSkillId = Math.max(0, ...normalizedSkills.map((skill) => Number(skill?.id) || 0));
  const missingStarterSeeds = STARTER_SKILL_SEEDS.filter((seed) => !existingStarterNames.has(seed.name));

  if (missingStarterSeeds.length === 0) {
    return normalizedSkills;
  }

  const fallbackSkills = createStarterSkills(maxSkillId + 1)
    .filter((skill) =>
      missingStarterSeeds.some((seed) => seed.name === skill.name)
    );

  return [...normalizedSkills, ...fallbackSkills];
};

const pruneDisabledSessionSkillIds = (sessions, enabledSkillIds) =>
  (Array.isArray(sessions) ? sessions : []).map((session) => {
    const previousSkillIds = dedupeIds(session?.skillIds || []);
    const nextSkillIds = previousSkillIds.filter((skillId) => enabledSkillIds.includes(skillId));
    return nextSkillIds.length === previousSkillIds.length
      ? session
      : {
          ...session,
          skillIds: nextSkillIds,
        };
  });

const createInitialWorkspace = () => {
  const note = createSeedNote(1);
  const starterSkills = createStarterSkills(1);
  return {
    settings: defaultSettings(),
    capabilities: defaultCapabilities(),
    starterSkillCatalogSeeded: true,
    nextSessionId: 2,
    nextNoteId: 2,
    nextReminderId: 1,
    nextSkillId: starterSkills.length + 1,
    activeSessionId: 1,
    activeNoteId: 1,
    activeSkillId: 1,
    sessions: [createSeedSession(1)],
    notes: [note],
    reminders: [],
    skills: starterSkills,
  };
};

const normalizeReminder = (reminder) => {
  if (!reminder || typeof reminder !== "object") {
    return null;
  }

  const dueAtValue =
    typeof reminder.dueAt === "number"
      ? reminder.dueAt
      : typeof reminder.due_at === "number"
        ? reminder.due_at
        : reminder.dueAt
          ? new Date(reminder.dueAt).getTime()
          : null;

  const dueAt = Number.isFinite(dueAtValue) ? dueAtValue : null;
  const severity = ["low", "medium", "high", "critical"].includes(reminder.severity)
    ? reminder.severity
    : "medium";
  const status = reminder.status === "done" ? "done" : "scheduled";
  const linkedNoteId =
    typeof reminder.linkedNoteId === "number"
      ? reminder.linkedNoteId
      : typeof reminder.linked_note_id === "number"
        ? reminder.linked_note_id
        : null;

  return {
    id: reminder.id,
    title: String(reminder.title || storageT("newReminder")),
    detail: String(reminder.detail || ""),
    dueAt,
    severity,
    status,
    linkedNoteId,
    createdAt:
      typeof reminder.createdAt === "number"
        ? reminder.createdAt
        : typeof reminder.created_at === "number"
          ? reminder.created_at
          : now(),
    updatedAt:
      typeof reminder.updatedAt === "number"
        ? reminder.updatedAt
        : typeof reminder.updated_at === "number"
          ? reminder.updated_at
          : now(),
  };
};

const normalizeSkill = (skill) => {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  return {
    id: skill.id,
    name: String(skill.name || storageT("newSkill")),
    description: String(skill.description || ""),
    instructions: String(skill.instructions || ""),
    triggerHint: String(skill.triggerHint || skill.trigger_hint || ""),
    enabled: Boolean(skill.enabled),
    permissionLevel: "low",
    createdAt:
      typeof skill.createdAt === "number"
        ? skill.createdAt
        : typeof skill.created_at === "number"
          ? skill.created_at
          : now(),
    updatedAt:
      typeof skill.updatedAt === "number"
        ? skill.updatedAt
        : typeof skill.updated_at === "number"
          ? skill.updated_at
          : now(),
  };
};

const normalizeSession = (session, fallbackSkillIds = []) => {
  if (!session || typeof session !== "object") {
    return null;
  }

  const timestamp =
    typeof session.updatedAt === "number"
      ? session.updatedAt
      : typeof session.updated_at === "number"
        ? session.updated_at
        : now();

  return {
    id: Number(session.id) || 0,
    title: String(session.title || storageT("newMission")),
    status: String(session.status || "idle"),
    updatedAt: timestamp,
    skillIds: dedupeIds(
      Object.prototype.hasOwnProperty.call(session, "skillIds")
        ? session.skillIds
        : fallbackSkillIds
    ),
    messages: Array.isArray(session.messages) ? session.messages : [],
    activity: Array.isArray(session.activity) ? session.activity : [],
  };
};

const readWorkspace = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialWorkspace();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
      return createInitialWorkspace();
    }

    const notes =
      Array.isArray(parsed.notes) && parsed.notes.length > 0 ? parsed.notes : [createSeedNote(1)];
    const reminders =
      Array.isArray(parsed.reminders) && parsed.reminders.length > 0
        ? parsed.reminders.map(normalizeReminder).filter(Boolean)
        : [];
    const fallbackStarterSkills = createStarterSkills(1);
    const starterSkillCatalogSeeded = Boolean(parsed.starterSkillCatalogSeeded);
    const parsedSkills =
      Array.isArray(parsed.skills) && parsed.skills.length > 0
        ? parsed.skills.map(normalizeSkill).filter(Boolean)
        : fallbackStarterSkills;
    const skills = starterSkillCatalogSeeded
      ? parsedSkills
      : mergeStarterSkillCatalog(parsedSkills);
    const enabledSkillIds = skills.filter((skill) => skill.enabled).map((skill) => skill.id);
    const hasMountedSkillData = parsed.sessions.some((session) =>
      Object.prototype.hasOwnProperty.call(session || {}, "skillIds")
    );
    const sessions = pruneDisabledSessionSkillIds(
      parsed.sessions
      .map((session) => normalizeSession(session, hasMountedSkillData ? [] : enabledSkillIds))
      .filter((session) => session && session.id > 0),
      enabledSkillIds
    );

    if (sessions.length === 0) {
      return createInitialWorkspace();
    }

    return {
      settings: { ...defaultSettings(), ...(parsed.settings || {}) },
      capabilities: defaultCapabilities(),
      starterSkillCatalogSeeded: true,
      nextSessionId: resolveNextId(parsed.nextSessionId, sessions),
      nextNoteId: resolveNextId(parsed.nextNoteId, notes),
      nextReminderId: resolveNextId(parsed.nextReminderId, reminders),
      nextSkillId: resolveNextId(parsed.nextSkillId, skills),
      activeSessionId: resolveActiveId(parsed.activeSessionId, sessions),
      activeNoteId: resolveActiveId(parsed.activeNoteId, notes),
      activeSkillId: resolveActiveId(parsed.activeSkillId, skills),
      sessions,
      notes,
      reminders,
      skills,
    };
  } catch (error) {
    console.error("Failed to read preview workspace", error);
    return createInitialWorkspace();
  }
};

const writeWorkspace = (workspace) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: workspace.settings,
      starterSkillCatalogSeeded: workspace.starterSkillCatalogSeeded !== false,
      nextSessionId: workspace.nextSessionId,
      nextNoteId: workspace.nextNoteId,
      nextReminderId: workspace.nextReminderId,
      nextSkillId: workspace.nextSkillId,
      activeSessionId: workspace.activeSessionId,
      activeNoteId: workspace.activeNoteId,
      activeSkillId: workspace.activeSkillId,
      sessions: workspace.sessions,
      notes: workspace.notes,
      reminders: workspace.reminders,
      skills: workspace.skills,
    })
  );
};

const noteSummary = (note) => ({
  id: note.id,
  icon: note.icon,
  title: note.title,
  summary: toPreview(note.body, 120),
  tags: note.tags || [],
  updatedAt: note.updatedAt,
});

const reminderSummary = (reminder) => ({
  ...reminder,
  preview: toPreview(reminder.detail, 120),
});

const skillSummary = (skill) => ({
  id: skill.id,
  name: skill.name,
  summary: toPreview(skill.description, 120),
  triggerHint: skill.triggerHint,
  recommendationReason: skill.recommendationReason || skill.recommendation_reason || "",
  enabled: Boolean(skill.enabled),
  permissionLevel: "low",
  updatedAt: skill.updatedAt,
});


const recommendSessionSkillsStable = (session, skills, limit = 4) => {
  const mounted = new Set(dedupeIds(session?.skillIds));
  const sessionText = [session?.title || "", ...(session?.messages || []).slice(-10).map((item) => item.content || "")]
    .join(" ")
    .toLowerCase();
  const keywords = [...new Set(sessionText.split(/[^a-z0-9\u4e00-\u9fff]+/i).filter((part) => part.length >= 2))];
  const isZh = /[\u4e00-\u9fff]/.test(sessionText);

  const scoreIntent = (skillName, matchedTerms) => {
    const name = String(skillName || "").toLowerCase();
    const captureMatch = (patterns) => {
      const found = patterns.filter((pattern) => sessionText.includes(pattern));
      if (found.length > 0) {
        matchedTerms.push(...found);
        return true;
      }
      return false;
    };

    if (name.includes("note recall") || name.includes("local note recall") || name.includes("bi ji zhao hui")) {
      return captureMatch(["note", "notes", "knowledge", "context", "doc", "memo", "knowledge-base"]) ? 8 : 0;
    }
    if (name.includes("knowledge librarian") || name.includes("zhi shi zheng li yuan")) {
      return captureMatch(["summary", "summarize", "organize", "archive", "note", "facts", "knowledge-base"]) ? 8 : 0;
    }
    if (name.includes("reminder radar") || name.includes("ti xing lei da")) {
      return captureMatch(["todo", "deadline", "follow-up", "follow up", "remind", "task", "due", "reminder"]) ? 8 : 0;
    }
    if (name.includes("weather brief") || name.includes("tian qi jian bao")) {
      return captureMatch(["weather", "forecast", "temperature", "rain", "travel", "climate", "umbrella", "trip"]) ? 8 : 0;
    }
    if (name.includes("music companion") || name.includes("yin yue pei ting")) {
      return captureMatch(["music", "playlist", "song", "track", "mood", "album", "lyrics", "artist"]) ? 8 : 0;
    }
    if (name.includes("gallery curator") || name.includes("hua lang ce zhan")) {
      return captureMatch(["gallery", "album", "photo", "image", "caption", "collection", "picture", "tag"]) ? 8 : 0;
    }
    if (name.includes("settings steward") || name.includes("she zhi guan jia")) {
      return captureMatch(["setting", "provider", "api key", "cache", "config", "settings", "gateway", "system prompt"]) ? 8 : 0;
    }
    if (name.includes("release guard") || name.includes("fa bu shou wei")) {
      return captureMatch(["deploy", "migration", "auth", "billing", "delete", "release", "rollback", "production"]) ? 7 : 0;
    }
    if (name.includes("ui polish") || name.includes("jie mian da mo")) {
      return captureMatch(["ui", "layout", "css", "frontend", "design", "screen", "style", "visual"]) ? 7 : 0;
    }
    if (name.includes("research mode") || name.includes("yan jiu mo shi")) {
      return captureMatch(["research", "source", "docs", "verify", "citation", "reference", "evidence", "validate"]) ? 7 : 0;
    }
    if (name.includes("task router") || name.includes("ren wu lu you")) {
      return captureMatch(["plan", "steps", "multi-step", "complex", "breakdown", "sequence", "route", "execution"]) ? 6 : 0;
    }
    return 0;
  };

  return skills
    .filter((skill) => skill.enabled && !mounted.has(skill.id))
    .map((skill) => {
      const searchable = [skill.name, skill.description, skill.triggerHint].join(" ").toLowerCase();
      let score = 2;
      const matchedTerms = [];
      keywords.forEach((keyword) => {
        if (searchable.includes(keyword)) {
          score += 2;
          matchedTerms.push(keyword);
        }
        if (String(skill.name || "").toLowerCase().includes(keyword)) {
          score += 3;
          matchedTerms.push(keyword);
        }
      });
      score += scoreIntent(skill.name, matchedTerms);
      const uniqueTerms = [...new Set(matchedTerms)].slice(0, 3);
      const recommendationReason =
        uniqueTerms.length > 0
          ? isZh
            ? `Matched session topics: ${uniqueTerms.join(" / ")}.`
            : `Matched session topics: ${uniqueTerms.join(" / ")}.`
          : "";
      return { score, skill, recommendationReason };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.skill.enabled !== left.skill.enabled) {
        return Number(right.skill.enabled) - Number(left.skill.enabled);
      }
      return (right.skill.updatedAt || 0) - (left.skill.updatedAt || 0);
    })
    .slice(0, limit)
    .map((item) => skillSummary({ ...item.skill, recommendationReason: item.recommendationReason }));
};
const buildSnapshot = (
  workspace,
  preferredSessionId = workspace.activeSessionId,
  preferredNoteId = workspace.activeNoteId,
  preferredSkillId = workspace.activeSkillId
) => {
  const orderedSessions = [...workspace.sessions].sort(
    (left, right) => right.updatedAt - left.updatedAt
  );
  const orderedNotes = [...workspace.notes].sort(
    (left, right) => right.updatedAt - left.updatedAt
  );
  const orderedReminders = [...(workspace.reminders || [])].sort(
    (left, right) => right.updatedAt - left.updatedAt
  );
  const orderedSkills = [...(workspace.skills || [])].sort(
    (left, right) => right.updatedAt - left.updatedAt
  );

  const activeSessionId =
    preferredSessionId && orderedSessions.some((session) => session.id === preferredSessionId)
      ? preferredSessionId
      : orderedSessions[0].id;
  const activeNoteId =
    preferredNoteId && orderedNotes.some((note) => note.id === preferredNoteId)
      ? preferredNoteId
      : orderedNotes[0].id;
  const activeSkillId =
    preferredSkillId && orderedSkills.some((skill) => skill.id === preferredSkillId)
      ? preferredSkillId
      : orderedSkills[0].id;

  const activeSession =
    orderedSessions.find((session) => session.id === activeSessionId) || orderedSessions[0];
  const activeNote = orderedNotes.find((note) => note.id === activeNoteId) || orderedNotes[0];
  const activeSkill =
    orderedSkills.find((skill) => skill.id === activeSkillId) || orderedSkills[0];
  const activeSessionSkillIds = dedupeIds(activeSession.skillIds).filter((skillId) =>
    orderedSkills.some((skill) => skill.id === skillId && skill.enabled)
  );
  const activeSessionSkills = orderedSkills
    .filter((skill) => activeSessionSkillIds.includes(skill.id))
    .map(skillSummary);
  const recommendedSessionSkills = recommendSessionSkillsStable(activeSession, orderedSkills, 4);

  return {
    settings: workspace.settings,
    capabilities: defaultCapabilities(),
    sessions: orderedSessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      updatedAt: session.updatedAt,
      messageCount: session.messages.length,
      lastMessagePreview: toPreview(session.messages[session.messages.length - 1]?.content),
      mountedSkillCount: dedupeIds(session.skillIds).filter((skillId) =>
        orderedSkills.some((skill) => skill.id === skillId && skill.enabled)
      ).length,
    })),
    activeSessionId,
    activeSession: {
      session: {
        id: activeSession.id,
        title: activeSession.title,
        status: activeSession.status,
        updatedAt: activeSession.updatedAt,
        messageCount: activeSession.messages.length,
        lastMessagePreview: toPreview(
          activeSession.messages[activeSession.messages.length - 1]?.content
        ),
        mountedSkillCount: activeSessionSkillIds.length,
      },
      messages: activeSession.messages,
      activity: [...activeSession.activity].sort(
        (left, right) => right.createdAt - left.createdAt
      ),
      mountedSkillIds: activeSessionSkillIds,
      mountedSkills: activeSessionSkills,
      recommendedSkills: recommendedSessionSkills,
    },
    notes: orderedNotes.map(noteSummary),
    activeNoteId,
    activeNote: {
      ...activeNote,
      summary: toPreview(activeNote.body, 120),
    },
    reminders: orderedReminders.map(reminderSummary),
    skills: orderedSkills.map(skillSummary),
    activeSkillId,
    activeSkill: {
      ...activeSkill,
      summary: toPreview(activeSkill.description, 120),
      permissionLevel: "low",
    },
  };
};

const updateWorkspace = (mutator) => {
  const current = readWorkspace();
  const next = mutator(current);
  writeWorkspace(next);
  return next;
};

const localBootstrap = async () => {
  const workspace = readWorkspace();
  writeWorkspace(workspace);
  return buildSnapshot(workspace);
};

const localOpenSession = async (sessionId) =>
  buildSnapshot(
    updateWorkspace((workspace) => ({ ...workspace, activeSessionId: sessionId })),
    sessionId,
    undefined,
    undefined
  );

const localCreateSession = async (title) => {
  const workspace = updateWorkspace((current) => {
    const sessionId = current.nextSessionId;
    const session = createSeedSession(sessionId, title?.trim() || storageT("newMission"));
    return {
      ...current,
      nextSessionId: sessionId + 1,
      activeSessionId: sessionId,
      sessions: [session, ...current.sessions],
    };
  });
  return buildSnapshot(workspace, workspace.activeSessionId);
};

const localDeleteSession = async (sessionId) => {
  const workspace = updateWorkspace((current) => {
    const remaining = current.sessions.filter((session) => session.id !== sessionId);
    const sessions = remaining.length > 0 ? remaining : [createSeedSession(current.nextSessionId)];
    const nextSessionId =
      remaining.length > 0 ? current.nextSessionId : current.nextSessionId + 1;
    return {
      ...current,
      nextSessionId,
      sessions,
      activeSessionId: sessions[0].id,
    };
  });
  return buildSnapshot(workspace, workspace.activeSessionId);
};

const localSaveSettings = async ({ settings, activeSessionId }) => {
  const workspace = updateWorkspace((current) => ({
    ...current,
    settings: {
      providerName: settings.providerName?.trim() || "OpenAI Compatible",
      baseUrl: settings.baseUrl?.trim() || "https://api.openai.com/v1",
      apiKey: settings.apiKey?.trim() || "",
      model: settings.model?.trim() || "gpt-4.1-mini",
      systemPrompt: settings.systemPrompt?.trim() || storageT("systemPrompt"),
    },
  }));
  return buildSnapshot(workspace, activeSessionId);
};

const localOpenKnowledgeNote = async ({ noteId, activeSessionId }) =>
  buildSnapshot(
    updateWorkspace((workspace) => ({ ...workspace, activeNoteId: noteId })),
    activeSessionId,
    noteId
  );

const localCreateKnowledgeNote = async ({ title, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const noteId = current.nextNoteId;
    const note = createSeedNote(noteId, title?.trim() || storageT("untitledNote"));
    return {
      ...current,
      nextNoteId: noteId + 1,
      activeNoteId: noteId,
      notes: [note, ...current.notes],
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localSaveKnowledgeNote = async ({ note, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const timestamp = now();
    return {
      ...current,
      activeNoteId: note.id,
      notes: current.notes.map((item) =>
        item.id === note.id
          ? {
              ...item,
              icon: note.icon?.trim() || "*",
              title: note.title?.trim() || storageT("untitledNote"),
              body: note.body || "",
              tags: Array.isArray(note.tags)
                ? note.tags.map((tag) => tag.trim()).filter(Boolean)
                : [],
              updatedAt: timestamp,
            }
          : item
      ),
    };
  });
  return buildSnapshot(workspace, activeSessionId, note.id);
};

const localDeleteKnowledgeNote = async ({ noteId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const remaining = current.notes.filter((note) => note.id !== noteId);
    const notes = remaining.length > 0 ? remaining : [createSeedNote(current.nextNoteId)];
    const nextNoteId = remaining.length > 0 ? current.nextNoteId : current.nextNoteId + 1;
    const reminders = current.reminders.map((reminder) =>
      reminder.linkedNoteId === noteId ? { ...reminder, linkedNoteId: null } : reminder
    );
    return {
      ...current,
      nextNoteId,
      notes,
      reminders,
      activeNoteId: notes[0].id,
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localCreateReminder = async ({ title, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const reminderId = current.nextReminderId;
    const seedNoteId = current.notes[0]?.id ?? null;
    const timestamp = now();
    const reminder = {
      id: reminderId,
      title: title?.trim() || storageT("newReminder"),
      detail: storageT("reminderDetail"),
      dueAt: timestamp + 60 * 60 * 1000,
      severity: "medium",
      status: "scheduled",
      linkedNoteId: seedNoteId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return {
      ...current,
      nextReminderId: reminderId + 1,
      reminders: [reminder, ...current.reminders],
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localSaveReminder = async ({ reminder, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const timestamp = now();
    const nextReminder = {
      id: reminder.id,
      title: reminder.title?.trim() || storageT("newReminder"),
      detail: reminder.detail?.trim() || "",
      dueAt:
        typeof reminder.dueAt === "number" && Number.isFinite(reminder.dueAt)
          ? reminder.dueAt
          : null,
      severity: ["low", "medium", "high", "critical"].includes(reminder.severity)
        ? reminder.severity
        : "medium",
      status: reminder.status === "done" ? "done" : "scheduled",
      linkedNoteId:
        typeof reminder.linkedNoteId === "number" && reminder.linkedNoteId > 0
          ? reminder.linkedNoteId
          : null,
      createdAt:
        current.reminders.find((item) => item.id === reminder.id)?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    return {
      ...current,
      reminders: current.reminders.map((item) =>
        item.id === reminder.id ? nextReminder : item
      ),
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localDeleteReminder = async ({ reminderId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => ({
    ...current,
    reminders: current.reminders.filter((reminder) => reminder.id !== reminderId),
  }));
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localOpenSkill = async ({ skillId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => ({
    ...current,
    activeSkillId: skillId,
  }));
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId, skillId);
};

const localCreateSkill = async ({ name, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const skillId = current.nextSkillId;
    const skill = createCustomSkill(skillId, name?.trim() || storageT("newSkill"));
    return {
      ...current,
      nextSkillId: skillId + 1,
      activeSkillId: skillId,
      skills: [skill, ...current.skills],
      sessions: current.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              skillIds: dedupeIds([...(session.skillIds || []), skillId]),
              updatedAt: now(),
            }
          : session
      ),
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId, workspace.activeSkillId);
};

const localSaveSkill = async ({ skill, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const timestamp = now();
    const nextEnabled = Boolean(skill.enabled);
    return {
      ...current,
      activeSkillId: skill.id,
      skills: current.skills.map((item) =>
        item.id === skill.id
          ? {
              ...item,
              name: skill.name?.trim() || storageT("newSkill"),
              description: skill.description?.trim() || "",
              instructions: skill.instructions?.trim() || "",
              triggerHint: skill.triggerHint?.trim() || "",
              enabled: nextEnabled,
              permissionLevel: "low",
              updatedAt: timestamp,
            }
          : item
      ),
      sessions: nextEnabled
        ? current.sessions
        : current.sessions.map((session) => {
            const previousSkillIds = dedupeIds(session.skillIds || []);
            const nextSkillIds = previousSkillIds.filter((id) => id !== skill.id);
            return nextSkillIds.length === previousSkillIds.length
              ? session
              : {
                  ...session,
                  skillIds: nextSkillIds,
                  updatedAt: timestamp,
                };
          }),
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId, skill.id);
};

const localDeleteSkill = async ({ skillId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const timestamp = now();
    const remaining = current.skills.filter((skill) => skill.id !== skillId);
    const skills = remaining.length > 0 ? remaining : createStarterSkills(current.nextSkillId);
    const nextSkillId =
      remaining.length > 0 ? current.nextSkillId : current.nextSkillId + STARTER_SKILL_SEEDS.length;
    return {
      ...current,
      nextSkillId,
      skills,
      sessions: current.sessions.map((session) => {
        const previousSkillIds = dedupeIds(session.skillIds || []);
        const nextSkillIds = previousSkillIds.filter((id) => id !== skillId);
        return nextSkillIds.length === previousSkillIds.length
          ? session
          : {
              ...session,
              skillIds: nextSkillIds,
              updatedAt: timestamp,
            };
      }),
      activeSkillId: skills[0].id,
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId, workspace.activeSkillId);
};

const localSaveSessionSkills = async ({ sessionId, skillIds, activeSessionId }) => {
  const workspace = updateWorkspace((current) => ({
    ...current,
    activeSessionId: activeSessionId || sessionId,
    sessions: current.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            updatedAt: now(),
            skillIds: dedupeIds(skillIds).filter((skillId) =>
              current.skills.some((skill) => skill.id === skillId && skill.enabled)
            ),
          }
        : session
    ),
  }));

  return buildSnapshot(
    workspace,
    activeSessionId || sessionId,
    workspace.activeNoteId,
    workspace.activeSkillId
  );
};

const localForgeSkill = async ({ existingSkill, lang, prompt, settings }) => {
  const text = String(prompt || "").trim();
  if (!text) {
    throw new Error(storageT("promptRequired"));
  }

  if (isSkillGenerationReady(settings)) {
    try {
      const generated = await requestSkillDraftFromModel({
        existingSkill,
        lang,
        prompt: text,
        settings,
      });
      return sanitizeGeneratedSkill(generated, existingSkill, lang);
    } catch (error) {
      console.error("Model skill generation failed, falling back to local draft", error);
    }
  }

  return sanitizeGeneratedSkill(
    buildLocalSkillDraft({
      existingSkill,
      prompt: text,
      lang,
    }),
    existingSkill,
    lang
  );
};

const localRunAgent = async ({ sessionId, prompt }) => {
  const text = String(prompt || "").trim();
  if (!text) {
    throw new Error(storageT("promptRequired"));
  }

  const workspace = updateWorkspace((current) => {
    const timestamp = now();
    const sessions = current.sessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      const providerReady =
        current.settings.apiKey && current.settings.baseUrl && current.settings.model;
      const mountedSkillIds = dedupeIds(session.skillIds);
      const enabledSkills = current.skills.filter(
        (skill) => skill.enabled && mountedSkillIds.includes(skill.id)
      );
      const skillNames = enabledSkills.map((skill) => skill.name).join(", ");
      const skillSuffix =
        enabledSkills.length > 0
          ? ` ${storageT("mountedSkillsPrefix", { skills: skillNames })}`
          : "";
      const reply = providerReady
        ? storageT("replyConfigured", { text, suffix: skillSuffix })
        : storageT("replyPending", { text, suffix: skillSuffix });

      const nextMessages = [
        ...session.messages,
        {
          id: timestamp,
          role: "user",
          content: text,
          createdAt: timestamp,
        },
        {
          id: timestamp + 1,
          role: "assistant",
          content: `${reply}\n\n${storageT("nextSteps")}`,
          createdAt: timestamp + 1,
        },
      ];

      const nextActivity = [
        {
          id: timestamp + 2,
          kind: "output",
          title: storageT("previewReplyReadyTitle"),
          detail: storageT("previewReplyReadyDetail"),
          status: "completed",
          createdAt: timestamp + 2,
        },
        {
          id: timestamp + 3,
          kind: "plan",
          title: storageT("executionPlanTitle"),
          detail: storageT("executionPlanDetail"),
          status: "completed",
          createdAt: timestamp + 3,
        },
        {
          id: timestamp + 4,
          kind: "skill",
          title: storageT("sessionSkillsLoadedTitle"),
          detail:
            enabledSkills.length > 0
              ? storageT("sessionSkillsLoadedSome", { skills: skillNames })
              : storageT("sessionSkillsLoadedNone"),
          status: "completed",
          createdAt: timestamp + 4,
        },
        ...session.activity,
      ];

      return {
        ...session,
        title: session.title === storageT("newMission") ? toPreview(text, 28) : session.title,
        status: "ready",
        updatedAt: timestamp + 4,
        messages: nextMessages,
        activity: nextActivity,
      };
    });

    return {
      ...current,
      activeSessionId: sessionId,
      sessions,
    };
  });

  return buildSnapshot(workspace, sessionId, workspace.activeNoteId, workspace.activeSkillId);
};

const isSkillGenerationReady = (settings) =>
  Boolean(settings?.baseUrl?.trim() && settings?.apiKey?.trim() && settings?.model?.trim());

const requestSkillDraftFromModel = async ({ existingSkill, lang, prompt, settings }) => {
  const endpoint = `${String(settings.baseUrl || "").replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            lang === "zh-CN"
              ? [
                  "You are a skill designer. Output a reusable low-permission skill based on the user request.",
                  "Return JSON only. Do not output markdown.",
                  "JSON fields must be name, description, triggerHint, instructions.",
                  "name must be under 40 characters.",
                  "description should summarize the skill value in 1-2 sentences.",
                  "triggerHint should describe the requests where this skill should activate.",
                  "instructions should be reusable, explicit, and actionable.",
                ].join("\n")
              : [
                  "You are designing a reusable low-permission skill for an agent workspace.",
                  "Return JSON only. No markdown.",
                  "The JSON fields must be: name, description, triggerHint, instructions.",
                  "Keep name under 40 characters.",
                  "Description should explain the value of the skill in 1-2 sentences.",
                  "triggerHint should explain when this skill should activate.",
                  "instructions should be a reusable instruction block with concrete operational guidance.",
                ].join("\n"),
        },
        {
          role: "user",
          content: [
            `User request: ${prompt}`,
            existingSkill
              ? `Existing skill for rewrite reference: ${JSON.stringify(existingSkill)}`
              : "This is for a brand new skill.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Skill generation request failed.");
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("The model returned an empty skill draft.");
  }

  return parseGeneratedSkill(content);
};

const parseGeneratedSkill = (content) => {
  const raw = String(content || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
};

const buildLocalSkillDraft = ({ existingSkill, prompt, lang }) => {
  const text = String(prompt || "").trim();
  const titleSeed = text
    .split(/[\n,.!?;:]+/)
    .find(Boolean)
    ?.trim()
    ?.slice(0, 28);

  if (lang === "zh-CN") {
    return {
      name: titleSeed || existingSkill?.name || "Generated skill",
      description: `Locally generated draft for: ${trimForTemplate(text, 88)}` ,
      triggerHint: `Use when the request is about: ${trimForTemplate(text, 72)}` ,
      instructions:
        `Interpret the following goal as a reusable low-permission skill and bias your execution accordingly: ${trimForTemplate(text, 180)}\n\n` +
        "Prefer explicit planning, keep assumptions visible, and avoid destructive actions unless the operator clearly requests them.",
    };
  }

  return {
    name: titleSeed || existingSkill?.name || "Generated skill",
    description: `Locally generated draft for: ${trimForTemplate(text, 88)}`,
    triggerHint: `Use when the request is about: ${trimForTemplate(text, 72)}`,
    instructions:
      `Interpret the following goal as a reusable low-permission skill and bias your execution accordingly: ${trimForTemplate(text, 180)}\n\n` +
      "Prefer explicit planning, keep assumptions visible, and avoid destructive actions unless the operator clearly requests them.",
  };
};

const sanitizeGeneratedSkill = (skill, existingSkill, lang) => ({
  name: String(
    skill?.name ||
      existingSkill?.name ||
      (lang === "zh-CN" ? "Generated skill" : "Generated skill")
  )
    .trim()
    .slice(0, 64),
  description: String(skill?.description || existingSkill?.description || "").trim(),
  triggerHint: String(skill?.triggerHint || existingSkill?.triggerHint || "").trim(),
  instructions: String(skill?.instructions || existingSkill?.instructions || "").trim(),
});

const trimForTemplate = (value, limit) => {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }
  return `${compact.slice(0, limit)}...`;
};

export const bootstrap = async () =>
  isTauriAvailable() ? invokeTauri({ cmd: "bootstrap" }) : localBootstrap();

export const openSession = async (sessionId) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "openSession", sessionId })
    : localOpenSession(sessionId);

export const createSession = async (title) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "createSession", title })
    : localCreateSession(title);

export const deleteSession = async (sessionId) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "deleteSession", sessionId })
    : localDeleteSession(sessionId);

export const saveSettings = async ({ settings, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "saveSettings", settings, activeSessionId })
    : localSaveSettings({ settings, activeSessionId });

export const openKnowledgeNote = async ({ noteId, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "openKnowledgeNote", noteId, activeSessionId })
    : localOpenKnowledgeNote({ noteId, activeSessionId });

export const createKnowledgeNote = async ({ title, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "createKnowledgeNote", title, activeSessionId })
    : localCreateKnowledgeNote({ title, activeSessionId });

export const saveKnowledgeNote = async ({ note, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "saveKnowledgeNote", note, activeSessionId })
    : localSaveKnowledgeNote({ note, activeSessionId });

export const deleteKnowledgeNote = async ({ noteId, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "deleteKnowledgeNote", noteId, activeSessionId })
    : localDeleteKnowledgeNote({ noteId, activeSessionId });

export const createReminder = async ({ title, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "createReminder", title, activeSessionId })
    : localCreateReminder({ title, activeSessionId });

export const saveReminder = async ({ reminder, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "saveReminder", reminder, activeSessionId })
    : localSaveReminder({ reminder, activeSessionId });

export const deleteReminder = async ({ reminderId, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "deleteReminder", reminderId, activeSessionId })
    : localDeleteReminder({ reminderId, activeSessionId });

export const openSkill = async ({ skillId, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "openSkill", skillId, activeSessionId })
    : localOpenSkill({ skillId, activeSessionId });

export const createSkill = async ({ name, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "createSkill", name, activeSessionId })
    : localCreateSkill({ name, activeSessionId });

export const saveSkill = async ({ skill, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "saveSkill", skill, activeSessionId })
    : localSaveSkill({ skill, activeSessionId });

export const deleteSkill = async ({ skillId, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "deleteSkill", skillId, activeSessionId })
    : localDeleteSkill({ skillId, activeSessionId });

export const saveSessionSkills = async ({ sessionId, skillIds, activeSessionId }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "saveSessionSkills", sessionId, skillIds, activeSessionId })
    : localSaveSessionSkills({ sessionId, skillIds, activeSessionId });

export const forgeSkill = async ({ existingSkill, lang, prompt, settings }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "forgeSkill", existingSkill, lang, prompt, settings })
    : localForgeSkill({ existingSkill, lang, prompt, settings });

export const runAgent = async ({ sessionId, prompt }) =>
  isTauriAvailable()
    ? invokeTauri({ cmd: "runAgent", sessionId, prompt })
    : localRunAgent({ sessionId, prompt });
