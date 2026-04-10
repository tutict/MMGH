const STORAGE_KEY = "mmgh_agent_workspace_v1";
const PREVIEW_WRITE_MAX_RETRIES = 4;
const LANG_STORAGE_KEY = "mmgh-lang";
const PREVIEW_API_KEY_STORAGE_KEY = "mmgh_agent_preview_api_key_v1";
const CORRUPT_WORKSPACE_BACKUP_STORAGE_KEY = "mmgh_agent_workspace_v1.corrupt_backup";
const DEFAULT_LANG = "zh-CN";
export const PREVIEW_WORKSPACE_STORAGE_KEY = STORAGE_KEY;

const STORAGE_TEXT = {
  "zh-CN": {
    systemPrompt: "你是桌面 Agent。先澄清目标，给出可执行计划，再明确下一步动作。",
    newMission: "新任务",
    previewReadyMessage:
      "浏览器预览模式已经就绪。在 Tauri 中，真实的会话状态和执行追踪会由 Rust 运行时处理。",
    previewReadyTitle: "预览已就绪",
    previewReadyDetail: "当前启用了前端预览模式，因此无需 Tauri 也能测试界面布局。",
    welcomeNote: "欢迎笔记",
    knowledgeBody:
      "# 知识库\n\n把这里当成本地 Notion 页面来用。\n\n- 保存稳定的产品事实。\n- 存放可复用提示词。\n- 搭建一个私有小型知识库。",
    startWriting: "从这里开始写。",
    localRecall: "本地笔记召回",
    localRecallDesc:
      "让 Agent 在回答前优先检查本地笔记和稳定上下文。",
    localRecallInstructions:
      "回答前先在脑中回顾本地知识笔记，优先采用稳定事实，并尽量与相关笔记保持一致。这个技能仅具备低权限，不能假定自己拥有更高访问能力。",
    localRecallTrigger:
      "当操作员需要基于笔记的上下文、私有文档或稳定知识时使用。",
    customSkillDesc: "描述这个自定义技能应该把 Agent 往什么方向推。",
    customSkillInstructions:
      "为这个技能写下可复用的指令块。所有自定义技能都只有低权限。",
    customSkillTrigger: "描述这个技能应该在什么场景下触发。",
    newReminder: "新提醒",
    reminderDetail:
      "记录下一步动作，关联一条笔记，并设置它再次出现的时间。",
    newSkill: "新技能",
    untitledNote: "未命名笔记",
    promptRequired: "请输入任务提示。",
    concurrentEditConflict: "预览工作区刚刚在另一个标签页被更新，请重试当前操作。",
    mountedSkillsPrefix: "已挂载低权限技能：{skills}。",
    replyConfigured:
      "预览模式不会真正调用远端 provider，但当前 provider 配置已经完整。已记录任务：{text}.{suffix}",
    replyPending:
      "当前还没有配置真实 provider，因此预览模式只是在本地记录了这条任务：{text}.{suffix}",
    nextSteps:
      "建议的下一步：\n1. 切换到 Tauri 桌面运行时。\n2. 补全 baseUrl、apiKey 和 model。\n3. 再次发送任务，走 Rust 运行时链路。",
    previewReplyReadyTitle: "预览回复已生成",
    previewReplyReadyDetail: "已经生成一条本地预览回复。",
    executionPlanTitle: "执行计划已生成",
    executionPlanDetail:
      "1. 接收任务输入。2. 生成预览回复。3. 引导操作员切换到 Tauri/Rust 运行时。",
    sessionSkillsLoadedTitle: "会话技能已加载",
    sessionSkillsLoadedSome: "已应用挂载的低权限技能：{skills}。",
    sessionSkillsLoadedNone: "当前会话没有挂载已启用技能。",
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
    concurrentEditConflict: "Preview workspace changed in another tab. Please retry the action.",
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

const LOCAL_SKILL_DRAFT_TEXT = {
  "zh-CN": {
    generatedSkillName: "生成技能",
    descriptionPrefix: "根据以下需求生成的本地草稿：",
    triggerPrefix: "当任务涉及以下内容时使用：",
    instructionsPrefix: "将以下目标解释成一个可复用的低权限技能，并据此调整你的执行方式：",
    instructionsSuffix: "优先显式规划，清楚说明假设，除非操作者明确要求，否则避免破坏性操作。",
  },
  "en-US": {
    generatedSkillName: "Generated skill",
    descriptionPrefix: "Locally generated draft for:",
    triggerPrefix: "Use when the request is about:",
    instructionsPrefix:
      "Interpret the following goal as a reusable low-permission skill and bias your execution accordingly:",
    instructionsSuffix:
      "Prefer explicit planning, keep assumptions visible, and avoid destructive actions unless the operator clearly requests them.",
  },
};

const RECOMMENDATION_REASON_TEXT = {
  "zh-CN": {
    prefix: "匹配到当前会话里的关键词：",
    suffix: "。",
  },
  "en-US": {
    prefix: "Matched session topics: ",
    suffix: ".",
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

const localizedSkillDraftText = (lang) =>
  LOCAL_SKILL_DRAFT_TEXT[normalizeLang(lang)] || LOCAL_SKILL_DRAFT_TEXT[DEFAULT_LANG];

const buildRecommendationReason = (lang, terms) => {
  const reasonText =
    RECOMMENDATION_REASON_TEXT[normalizeLang(lang)] || RECOMMENDATION_REASON_TEXT[DEFAULT_LANG];
  return `${reasonText.prefix}${terms.join(" / ")}${reasonText.suffix}`;
};

const readStoredLang = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) || "";
  } catch (error) {
    console.error("Failed to read preview language preference", error);
    return "";
  }
};

const getCurrentLang = () => {
  const savedLang = readStoredLang();
  if (savedLang) {
    return normalizeLang(savedLang);
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
let volatilePreviewApiKey = "";
const describeStorageError = (error) =>
  error instanceof Error ? error.message : String(error || "Unknown error");

const readPersistedPreviewApiKey = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return String(window.localStorage.getItem(PREVIEW_API_KEY_STORAGE_KEY) || "").trim();
  } catch (error) {
    console.error("Failed to read preview api key", error);
    return "";
  }
};

const writePersistedPreviewApiKey = (apiKey) => {
  const normalizedApiKey = String(apiKey || "").trim();

  if (typeof window === "undefined") {
    volatilePreviewApiKey = normalizedApiKey;
    return normalizedApiKey;
  }

  try {
    if (normalizedApiKey) {
      window.localStorage.setItem(PREVIEW_API_KEY_STORAGE_KEY, normalizedApiKey);
    } else {
      window.localStorage.removeItem(PREVIEW_API_KEY_STORAGE_KEY);
    }
    volatilePreviewApiKey = normalizedApiKey;
    return normalizedApiKey;
  } catch (error) {
    console.error("Failed to persist preview api key", error);
    throw new Error("Failed to persist preview api key. Local storage may be full.");
  }
};

const defaultSettings = () => ({
  providerName: "OpenAI Compatible",
  baseUrl: "https://api.openai.com/v1",
  clearApiKey: false,
  hasApiKey: false,
  apiKey: "",
  model: "gpt-4.1-mini",
  systemPrompt: storageT("systemPrompt"),
});

const hydratePreviewSettings = (settings) => {
  const normalized = {
    ...defaultSettings(),
    ...(settings || {}),
  };
  const persistedApiKey =
    String(normalized.apiKey || "").trim() || readPersistedPreviewApiKey();
  volatilePreviewApiKey = persistedApiKey;

  return {
    ...normalized,
    clearApiKey: false,
    hasApiKey: Boolean(volatilePreviewApiKey),
    apiKey: "",
  };
};

const sanitizeSettingsForPersistence = (settings) => ({
  ...defaultSettings(),
  ...(settings || {}),
  clearApiKey: false,
  hasApiKey: false,
  apiKey: "",
});

const resolvePreviewApiKey = (settings) =>
  String(settings?.apiKey || "").trim() || volatilePreviewApiKey;

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
const LEGACY_STARTER_SKILL_CATALOG_VERSION = 1;
const STARTER_SKILL_CATALOG_VERSION = 2;

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

const ensureExistingItem = (items, id, label) => {
  const parsedId = Number(id) || 0;
  const normalizedItems = Array.isArray(items) ? items : [];
  const exists = parsedId > 0 && normalizedItems.some((item) => item?.id === parsedId);
  if (!exists) {
    throw new Error(`${label} not found.`);
  }
  return parsedId;
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

const normalizeStarterSkillTombstones = (values) =>
  [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => findStarterSeed(value)?.name)
        .filter(Boolean)
    ),
  ].sort();

const inferStarterSkillTombstones = (skills) => {
  const normalizedSkills = Array.isArray(skills) ? skills.filter(Boolean) : [];
  const existingStarterNames = new Set(
    normalizedSkills
      .map((skill) => findStarterSeed(skill?.name))
      .filter(Boolean)
      .map((seed) => seed.name)
  );

  return STARTER_SKILL_SEEDS.filter((seed) => !existingStarterNames.has(seed.name)).map(
    (seed) => seed.name
  );
};

const mergeStarterSkillCatalog = (skills, tombstones = []) => {
  const normalizedSkills = Array.isArray(skills) ? skills.filter(Boolean) : [];
  const existingStarterNames = new Set(
    normalizedSkills
      .map((skill) => findStarterSeed(skill?.name))
      .filter(Boolean)
      .map((seed) => seed.name)
  );
  const tombstoneNames = new Set(normalizeStarterSkillTombstones(tombstones));
  const maxSkillId = Math.max(0, ...normalizedSkills.map((skill) => Number(skill?.id) || 0));
  const missingStarterSeeds = STARTER_SKILL_SEEDS.filter(
    (seed) => !existingStarterNames.has(seed.name) && !tombstoneNames.has(seed.name)
  );

  if (missingStarterSeeds.length === 0) {
    return normalizedSkills;
  }

  const fallbackSkills = createStarterSkills(maxSkillId + 1)
    .filter((skill) =>
      missingStarterSeeds.some((seed) => seed.name === skill.name)
    );

  return [...normalizedSkills, ...fallbackSkills];
};

const ensureWorkspaceSkills = (skills, nextSkillId) => {
  const normalizedSkills = Array.isArray(skills) ? skills.filter(Boolean) : [];
  const resolvedNextSkillId = Math.max(Number(nextSkillId) || 0, 1);

  if (normalizedSkills.length > 0) {
    return {
      skills: normalizedSkills,
      nextSkillId: resolvedNextSkillId,
    };
  }

  return {
    skills: [createCustomSkill(resolvedNextSkillId)],
    nextSkillId: resolvedNextSkillId + 1,
  };
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
    starterSkillCatalogVersion: STARTER_SKILL_CATALOG_VERSION,
    starterSkillTombstones: [],
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

const hydrateWorkspace = (raw) => {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
    throw new Error("Preview workspace sessions are missing.");
  }

  const legacyPersistedApiKey = String(parsed?.settings?.apiKey || "").trim();
  if (legacyPersistedApiKey && !readPersistedPreviewApiKey()) {
    try {
      writePersistedPreviewApiKey(legacyPersistedApiKey);
    } catch (error) {
      console.error("Failed to migrate preview api key", error);
    }
  }

  const notes =
    Array.isArray(parsed.notes) && parsed.notes.length > 0 ? parsed.notes : [createSeedNote(1)];
  const reminders =
    Array.isArray(parsed.reminders) && parsed.reminders.length > 0
      ? parsed.reminders.map(normalizeReminder).filter(Boolean)
      : [];
  const fallbackStarterSkills = createStarterSkills(1);
  const storedCatalogVersion = Number(parsed.starterSkillCatalogVersion);
  const starterSkillCatalogVersion =
    Number.isInteger(storedCatalogVersion) && storedCatalogVersion > 0
      ? storedCatalogVersion
      : parsed.starterSkillCatalogSeeded
        ? LEGACY_STARTER_SKILL_CATALOG_VERSION
        : 0;
  const parsedSkills = Array.isArray(parsed.skills)
    ? parsed.skills.map(normalizeSkill).filter(Boolean)
    : fallbackStarterSkills;
  const starterSkillTombstones = normalizeStarterSkillTombstones(
    Array.isArray(parsed.starterSkillTombstones)
      ? parsed.starterSkillTombstones
      : starterSkillCatalogVersion > 0
        ? inferStarterSkillTombstones(parsedSkills)
        : []
  );
  const mergedSkills =
    starterSkillCatalogVersion < STARTER_SKILL_CATALOG_VERSION
      ? mergeStarterSkillCatalog(parsedSkills, starterSkillTombstones)
      : parsedSkills;
  const { skills, nextSkillId } = ensureWorkspaceSkills(
    mergedSkills,
    resolveNextId(parsed.nextSkillId, mergedSkills)
  );
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
    throw new Error("Preview workspace does not contain any valid sessions.");
  }

  return {
    settings: hydratePreviewSettings(parsed.settings),
    capabilities: defaultCapabilities(),
    starterSkillCatalogVersion: STARTER_SKILL_CATALOG_VERSION,
    starterSkillTombstones,
    nextSessionId: resolveNextId(parsed.nextSessionId, sessions),
    nextNoteId: resolveNextId(parsed.nextNoteId, notes),
    nextReminderId: resolveNextId(parsed.nextReminderId, reminders),
    nextSkillId,
    activeSessionId: resolveActiveId(parsed.activeSessionId, sessions),
    activeNoteId: resolveActiveId(parsed.activeNoteId, notes),
    activeSkillId: resolveActiveId(parsed.activeSkillId, skills),
    sessions,
    notes,
    reminders,
    skills,
  };
};

const backupCorruptWorkspaceRecord = (raw, error) => {
  if (typeof window === "undefined" || !raw) {
    return;
  }

  try {
    window.localStorage.setItem(
      CORRUPT_WORKSPACE_BACKUP_STORAGE_KEY,
      JSON.stringify({
        raw,
        reason: describeStorageError(error),
        backedUpAt: now(),
      })
    );
  } catch (backupError) {
    console.error("Failed to back up corrupt preview workspace", backupError);
  }
};

const readWorkspaceRecord = () => {
  if (typeof window === "undefined") {
    return {
      raw: null,
      workspace: createInitialWorkspace(),
      persistOnBootstrap: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        raw: null,
        workspace: createInitialWorkspace(),
        persistOnBootstrap: true,
      };
    }

    const workspace = hydrateWorkspace(raw);
    return {
      raw,
      workspace,
      persistOnBootstrap: serializeWorkspace(workspace) !== raw,
    };
  } catch (error) {
    console.error("Failed to read preview workspace", error);
    const raw = (() => {
      try {
        return window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    backupCorruptWorkspaceRecord(raw, error);
    return {
      raw,
      workspace: createInitialWorkspace(),
      persistOnBootstrap: false,
    };
  }
};

const serializeWorkspace = (workspace) =>
  JSON.stringify({
    settings: sanitizeSettingsForPersistence(workspace.settings),
    starterSkillCatalogVersion:
      Number(workspace.starterSkillCatalogVersion) || STARTER_SKILL_CATALOG_VERSION,
    starterSkillTombstones: normalizeStarterSkillTombstones(workspace.starterSkillTombstones),
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
  });

const persistSerializedWorkspace = (serializedWorkspace) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializedWorkspace);
  } catch (error) {
    console.error("Failed to write preview workspace", error);
    throw new Error("Failed to persist preview workspace. Local storage may be full.");
  }
};

const writeWorkspace = (workspace) => {
  persistSerializedWorkspace(serializeWorkspace(workspace));
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

    if (name.includes("note recall") || name.includes("local note recall") || name.includes("笔记召回")) {
      return captureMatch(["note", "notes", "knowledge", "context", "文档", "笔记", "知识"]) ? 8 : 0;
    }
    if (name.includes("knowledge librarian") || name.includes("知识整理员")) {
      return captureMatch(["summary", "summarize", "整理", "归档", "note", "沉淀", "知识库"]) ? 8 : 0;
    }
    if (name.includes("reminder radar") || name.includes("提醒雷达")) {
      return captureMatch(["todo", "deadline", "follow-up", "follow up", "remind", "待办", "截止", "提醒"]) ? 8 : 0;
    }
    if (name.includes("weather brief") || name.includes("天气简报")) {
      return captureMatch(["weather", "forecast", "temperature", "rain", "travel", "天气", "降雨", "温度", "出行"]) ? 8 : 0;
    }
    if (name.includes("music companion") || name.includes("音乐陪听")) {
      return captureMatch(["music", "playlist", "song", "track", "mood", "音乐", "歌单", "曲目", "氛围"]) ? 8 : 0;
    }
    if (name.includes("gallery curator") || name.includes("画廊策展")) {
      return captureMatch(["gallery", "album", "photo", "image", "caption", "图库", "相册", "照片", "图片"]) ? 8 : 0;
    }
    if (name.includes("settings steward") || name.includes("设置管家")) {
      return captureMatch(["setting", "provider", "api key", "cache", "配置", "设置", "缓存", "网关"]) ? 8 : 0;
    }
    if (name.includes("release guard") || name.includes("发布守卫")) {
      return captureMatch(["deploy", "migration", "auth", "billing", "delete", "发布", "迁移", "鉴权", "删除"]) ? 7 : 0;
    }
    if (name.includes("ui polish") || name.includes("界面打磨")) {
      return captureMatch(["ui", "layout", "css", "frontend", "design", "界面", "布局", "前端", "样式"]) ? 7 : 0;
    }
    if (name.includes("research mode") || name.includes("研究模式")) {
      return captureMatch(["research", "source", "docs", "verify", "citation", "文档", "校验", "出处", "来源"]) ? 7 : 0;
    }
    if (name.includes("task router") || name.includes("任务路由")) {
      return captureMatch(["plan", "steps", "multi-step", "complex", "规划", "步骤", "复杂", "拆解"]) ? 6 : 0;
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
          ? buildRecommendationReason(isZh ? "zh-CN" : "en-US", uniqueTerms)
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
  for (let attempt = 0; attempt < PREVIEW_WRITE_MAX_RETRIES; attempt += 1) {
    const { raw: currentRaw, workspace: current } = readWorkspaceRecord();
    const next = mutator(current);
    const serializedNext = serializeWorkspace(next);

    try {
      const latestRaw = window.localStorage.getItem(STORAGE_KEY);
      if (latestRaw !== currentRaw) {
        continue;
      }

      persistSerializedWorkspace(serializedNext);

      if (window.localStorage.getItem(STORAGE_KEY) === serializedNext) {
        return next;
      }
    } catch (error) {
      console.error("Failed to update preview workspace", error);
      throw new Error("Failed to persist preview workspace. Local storage may be full.");
    }
  }

  throw new Error(storageT("concurrentEditConflict"));
};

const localBootstrap = async () => {
  const { workspace, persistOnBootstrap } = readWorkspaceRecord();
  if (persistOnBootstrap) {
    writeWorkspace(workspace);
  }
  return buildSnapshot(workspace);
};

const localOpenSession = async (sessionId) =>
  buildSnapshot(
    updateWorkspace((workspace) => ({
      ...workspace,
      activeSessionId: ensureExistingItem(workspace.sessions, sessionId, "Session"),
    })),
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
    const ensuredSessionId = ensureExistingItem(current.sessions, sessionId, "Session");
    const remaining = current.sessions.filter((session) => session.id !== ensuredSessionId);
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
  const previousApiKey = readPersistedPreviewApiKey();
  const nextApiKey = settings.apiKey?.trim();
  const resolvedApiKey =
    settings.clearApiKey && !nextApiKey ? "" : nextApiKey || previousApiKey;

  try {
    writePersistedPreviewApiKey(resolvedApiKey);
    const workspace = updateWorkspace((current) => ({
      ...current,
      settings: {
        providerName: settings.providerName?.trim() || "OpenAI Compatible",
        baseUrl: settings.baseUrl?.trim() || "https://api.openai.com/v1",
        clearApiKey: false,
        hasApiKey: Boolean(resolvedApiKey),
        apiKey: "",
        model: settings.model?.trim() || "gpt-4.1-mini",
        systemPrompt: settings.systemPrompt?.trim() || storageT("systemPrompt"),
      },
    }));
    return buildSnapshot(workspace, activeSessionId);
  } catch (error) {
    try {
      writePersistedPreviewApiKey(previousApiKey);
    } catch (rollbackError) {
      throw new Error(
        `${describeStorageError(error)} Rollback failed: ${describeStorageError(rollbackError)}`
      );
    }
    throw error;
  }
};

const localOpenKnowledgeNote = async ({ noteId, activeSessionId }) =>
  buildSnapshot(
    updateWorkspace((workspace) => ({
      ...workspace,
      activeNoteId: ensureExistingItem(workspace.notes, noteId, "Knowledge note"),
    })),
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
    const noteId = ensureExistingItem(current.notes, note?.id, "Knowledge note");
    const timestamp = now();
    return {
      ...current,
      activeNoteId: noteId,
      notes: current.notes.map((item) =>
        item.id === noteId
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
    const ensuredNoteId = ensureExistingItem(current.notes, noteId, "Knowledge note");
    const remaining = current.notes.filter((note) => note.id !== ensuredNoteId);
    const notes = remaining.length > 0 ? remaining : [createSeedNote(current.nextNoteId)];
    const nextNoteId = remaining.length > 0 ? current.nextNoteId : current.nextNoteId + 1;
    const reminders = current.reminders.map((reminder) =>
      reminder.linkedNoteId === ensuredNoteId ? { ...reminder, linkedNoteId: null } : reminder
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
    const reminderId = ensureExistingItem(current.reminders, reminder?.id, "Reminder");
    const timestamp = now();
    const linkedNoteId =
      typeof reminder.linkedNoteId === "number" &&
      reminder.linkedNoteId > 0 &&
      current.notes.some((item) => item.id === reminder.linkedNoteId)
        ? reminder.linkedNoteId
        : null;
    const nextReminder = {
      id: reminderId,
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
      linkedNoteId,
      createdAt:
        current.reminders.find((item) => item.id === reminderId)?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    return {
      ...current,
      reminders: current.reminders.map((item) =>
        item.id === reminderId ? nextReminder : item
      ),
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localDeleteReminder = async ({ reminderId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const ensuredReminderId = ensureExistingItem(current.reminders, reminderId, "Reminder");
    return {
      ...current,
      reminders: current.reminders.filter((reminder) => reminder.id !== ensuredReminderId),
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId);
};

const localOpenSkill = async ({ skillId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => ({
    ...current,
    activeSkillId: ensureExistingItem(current.skills, skillId, "Skill"),
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
    const skillId = ensureExistingItem(current.skills, skill?.id, "Skill");
    const timestamp = now();
    const nextEnabled = Boolean(skill.enabled);
    return {
      ...current,
      activeSkillId: skillId,
      skills: current.skills.map((item) =>
        item.id === skillId
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
            const nextSkillIds = previousSkillIds.filter((id) => id !== skillId);
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
    const ensuredSkillId = ensureExistingItem(current.skills, skillId, "Skill");
    const deletedSkill = current.skills.find((skill) => skill.id === ensuredSkillId);
    const deletedStarterName = findStarterSeed(deletedSkill?.name)?.name;
    const remaining = current.skills.filter((skill) => skill.id !== ensuredSkillId);
    const fallbackSkill =
      remaining.length > 0 ? null : createCustomSkill(Math.max(current.nextSkillId, 1));
    const skills = remaining.length > 0 ? remaining : [fallbackSkill];
    const nextSkillId = remaining.length > 0 ? current.nextSkillId : fallbackSkill.id + 1;
    const starterSkillTombstones = deletedStarterName
      ? normalizeStarterSkillTombstones([
          ...(current.starterSkillTombstones || []),
          deletedStarterName,
        ])
      : normalizeStarterSkillTombstones(current.starterSkillTombstones);
    return {
      ...current,
      starterSkillCatalogVersion: STARTER_SKILL_CATALOG_VERSION,
      starterSkillTombstones,
      nextSkillId,
      skills,
      sessions: current.sessions.map((session) => {
        const previousSkillIds = dedupeIds(session.skillIds || []);
        const nextSkillIds = previousSkillIds.filter((id) => id !== ensuredSkillId);
        return nextSkillIds.length === previousSkillIds.length
          ? session
          : {
              ...session,
              skillIds: nextSkillIds,
              updatedAt: timestamp,
          };
      }),
      activeSkillId: skills.some((skill) => skill.id === current.activeSkillId)
        ? current.activeSkillId
        : skills[0].id,
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId, workspace.activeSkillId);
};

const localSaveSessionSkills = async ({ sessionId, skillIds, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const ensuredSessionId = ensureExistingItem(current.sessions, sessionId, "Session");
    const nextActiveSessionId = activeSessionId
      ? ensureExistingItem(current.sessions, activeSessionId, "Session")
      : ensuredSessionId;

    return {
      ...current,
      activeSessionId: nextActiveSessionId,
      sessions: current.sessions.map((session) =>
        session.id === ensuredSessionId
          ? (() => {
              const previousSkillIds = dedupeIds(session.skillIds || []);
              const nextSkillIds = dedupeIds(skillIds).filter((skillId) =>
                current.skills.some((skill) => skill.id === skillId && skill.enabled)
              );
              const unchanged =
                previousSkillIds.length === nextSkillIds.length &&
                previousSkillIds.every((skillId, index) => skillId === nextSkillIds[index]);
              if (unchanged) {
                return session;
              }
              return {
                ...session,
                updatedAt: now(),
                skillIds: nextSkillIds,
              };
            })()
          : session
      ),
    };
  });

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
      return sanitizeGeneratedSkill(
        {
          ...buildLocalSkillDraft({
            existingSkill,
            prompt: text,
            lang,
          }),
          warning: buildSkillGenerationFallbackWarning(lang, error),
        },
        existingSkill,
        lang
      );
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
    const ensuredSessionId = ensureExistingItem(current.sessions, sessionId, "Session");
    const timestamp = now();
    const sessions = current.sessions.map((session) => {
      if (session.id !== ensuredSessionId) {
        return session;
      }

      const providerReady =
        resolvePreviewApiKey(current.settings) &&
        current.settings.baseUrl &&
        current.settings.model;
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
      activeSessionId: ensuredSessionId,
      sessions,
    };
  });

  return buildSnapshot(workspace, sessionId, workspace.activeNoteId, workspace.activeSkillId);
};

const isSkillGenerationReady = (settings) =>
  Boolean(settings?.baseUrl?.trim() && resolvePreviewApiKey(settings) && settings?.model?.trim());

const requestSkillDraftFromModel = async ({ existingSkill, lang, prompt, settings }) => {
  const endpoint = `${String(settings.baseUrl || "").replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvePreviewApiKey(settings)}`,
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
  const draftText = localizedSkillDraftText(lang);
  return {
    name: titleSeed || existingSkill?.name || draftText.generatedSkillName,
    description: `${draftText.descriptionPrefix}${trimForTemplate(text, 88)}`,
    triggerHint: `${draftText.triggerPrefix}${trimForTemplate(text, 72)}`,
    instructions:
      `${draftText.instructionsPrefix}${trimForTemplate(text, 180)}\n\n` +
      draftText.instructionsSuffix,
  };
};

const sanitizeGeneratedSkill = (skill, existingSkill, lang) => ({
  // Keep the localized fallback name in one place so preview and forge paths stay aligned.
  name: String(
    skill?.name ||
      existingSkill?.name ||
      localizedSkillDraftText(lang).generatedSkillName
  )
    .trim()
    .slice(0, 64),
  description: String(skill?.description || existingSkill?.description || "").trim(),
  triggerHint: String(skill?.triggerHint || existingSkill?.triggerHint || "").trim(),
  instructions: String(skill?.instructions || existingSkill?.instructions || "").trim(),
  warning: String(skill?.warning || "").trim(),
});

const trimForTemplate = (value, limit) => {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }
  return `${compact.slice(0, limit)}...`;
};

const buildSkillGenerationFallbackWarning = (lang, error) => {
  const detail = trimForTemplate(String(error?.message || error || ""), 180) || "Unknown error.";
  return lang === "zh-CN"
    ? `模型技能生成失败，已退回到本地草稿构建：${detail}`
    : `Model skill generation failed, so a local draft was created instead: ${detail}`;
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

export const __previewTestUtils = {
  resetPreviewState() {
    volatilePreviewApiKey = "";
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(PREVIEW_API_KEY_STORAGE_KEY);
      window.localStorage.removeItem(CORRUPT_WORKSPACE_BACKUP_STORAGE_KEY);
    }
  },
  getResolvedPreviewApiKey(settings) {
    return resolvePreviewApiKey(settings);
  },
  getPersistedPreviewApiKey() {
    return readPersistedPreviewApiKey();
  },
  getPersistedWorkspaceSettings() {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).settings : null;
  },
  getCorruptWorkspaceBackup() {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.localStorage.getItem(CORRUPT_WORKSPACE_BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
};
