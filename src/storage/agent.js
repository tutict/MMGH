const STORAGE_KEY = "mmgh_agent_workspace_v1";
const LANG_STORAGE_KEY = "mmgh-lang";
const DEFAULT_LANG = "zh-CN";

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
    localRecallDesc: "让 Agent 在回答前优先检查本地笔记和稳定上下文。",
    localRecallInstructions:
      "回答前先在脑中回顾本地知识笔记，优先采用稳定事实，并尽量与相关笔记保持一致。这个技能仅具备低权限，不能假定自己拥有更高访问能力。",
    localRecallTrigger: "当操作员需要基于笔记的上下文、私有文档或稳定知识时使用。",
    customSkillDesc: "描述这个自定义技能应该把 Agent 往什么方向推。",
    customSkillInstructions: "为这个技能写下可复用的指令块。所有自定义技能都只有低权限。",
    customSkillTrigger: "描述这个技能应该在什么场景下触发。",
    newReminder: "新提醒",
    reminderDetail: "记录下一步动作，关联一条笔记，并设置它再次出现的时间。",
    newSkill: "新技能",
    untitledNote: "未命名笔记",
    promptRequired: "请输入任务提示。",
    mountedSkillsPrefix: "已挂载低权限技能：{skills}。",
    replyConfigured: "预览模式不会真正调用远端 provider，但当前 provider 配置已经完整。已记录任务：{text}.{suffix}",
    replyPending: "当前还没有配置真实 provider，因此预览模式只是在本地记录了这条任务：{text}.{suffix}",
    nextSteps:
      "建议的下一步：\n1. 切换到 Tauri 桌面运行时。\n2. 补全 baseUrl、apiKey 和 model。\n3. 再次发送任务，走 Rust 运行时链路。",
    previewReplyReadyTitle: "预览回复已生成",
    previewReplyReadyDetail: "已经生成一条本地预览回复。",
    executionPlanTitle: "执行计划已生成",
    executionPlanDetail: "1. 接收任务输入。2. 生成预览回复。3. 引导操作员切换到 Tauri/Rust 运行时。",
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

const createSeedSkill = (id, name = storageT("localRecall")) => {
  const timestamp = now();
  return {
    id,
    name,
    description:
      name === storageT("localRecall")
        ? storageT("localRecallDesc")
        : storageT("customSkillDesc"),
    instructions:
      name === storageT("localRecall")
        ? storageT("localRecallInstructions")
        : storageT("customSkillInstructions"),
    triggerHint:
      name === storageT("localRecall")
        ? storageT("localRecallTrigger")
        : storageT("customSkillTrigger"),
    enabled: true,
    permissionLevel: "low",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const createInitialWorkspace = () => {
  const note = createSeedNote(1);
  return {
    settings: defaultSettings(),
    capabilities: defaultCapabilities(),
    nextSessionId: 2,
    nextNoteId: 2,
    nextReminderId: 1,
    nextSkillId: 2,
    activeSessionId: 1,
    activeNoteId: 1,
    activeSkillId: 1,
    sessions: [createSeedSession(1)],
    notes: [note],
    reminders: [],
    skills: [createSeedSkill(1)],
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
    const skills =
      Array.isArray(parsed.skills) && parsed.skills.length > 0
        ? parsed.skills.map(normalizeSkill).filter(Boolean)
        : [createSeedSkill(1)];
    const enabledSkillIds = skills.filter((skill) => skill.enabled).map((skill) => skill.id);
    const hasMountedSkillData = parsed.sessions.some((session) =>
      Object.prototype.hasOwnProperty.call(session || {}, "skillIds")
    );
    const sessions = parsed.sessions
      .map((session) => normalizeSession(session, hasMountedSkillData ? [] : enabledSkillIds))
      .filter((session) => session && session.id > 0);

    if (sessions.length === 0) {
      return createInitialWorkspace();
    }

    return {
      settings: { ...defaultSettings(), ...(parsed.settings || {}) },
      capabilities: defaultCapabilities(),
      nextSessionId: parsed.nextSessionId || sessions.length + 1,
      nextNoteId: parsed.nextNoteId || notes.length + 1,
      nextReminderId: parsed.nextReminderId || reminders.length + 1,
      nextSkillId: parsed.nextSkillId || skills.length + 1,
      activeSessionId: parsed.activeSessionId || sessions[0].id,
      activeNoteId: parsed.activeNoteId || notes[0].id,
      activeSkillId: parsed.activeSkillId || skills[0].id,
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

const recommendSessionSkills = (session, skills, limit = 4) => {
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
    if (name.includes("music companion") || name.includes("音乐伴听")) {
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
      return captureMatch(["research", "source", "docs", "verify", "citation", "文档", "核验", "出处", "来源"]) ? 7 : 0;
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
          ? isZh
            ? `匹配到当前会话里的关键词：${uniqueTerms.join(" / ")}。`
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
  const recommendedSessionSkills = recommendSessionSkills(activeSession, orderedSkills, 4);

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

const localBootstrap = async () => buildSnapshot(readWorkspace());

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
    const skill = createSeedSkill(skillId, name?.trim() || storageT("newSkill"));
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
              enabled: Boolean(skill.enabled),
              permissionLevel: "low",
              updatedAt: timestamp,
            }
          : item
      ),
    };
  });
  return buildSnapshot(workspace, activeSessionId, workspace.activeNoteId, skill.id);
};

const localDeleteSkill = async ({ skillId, activeSessionId }) => {
  const workspace = updateWorkspace((current) => {
    const remaining = current.skills.filter((skill) => skill.id !== skillId);
    const skills = remaining.length > 0 ? remaining : [createSeedSkill(current.nextSkillId)];
    const nextSkillId = remaining.length > 0 ? current.nextSkillId : current.nextSkillId + 1;
    return {
      ...current,
      nextSkillId,
      skills,
      sessions: current.sessions.map((session) => ({
        ...session,
        skillIds: dedupeIds((session.skillIds || []).filter((id) => id !== skillId)),
      })),
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
      name: titleSeed || existingSkill?.name || "生成技能",
      description: `根据以下需求生成的本地草稿：${trimForTemplate(text, 88)}`,
      triggerHint: `当任务涉及以下内容时使用：${trimForTemplate(text, 72)}`,
      instructions:
        `将以下目标解释成一个可复用的低权限技能，并据此调整你的执行方式：${trimForTemplate(text, 180)}\n\n` +
        "优先显式规划，清楚说明假设，除非操作者明确要求，否则避免破坏性操作。",
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
      (lang === "zh-CN" ? "生成技能" : "Generated skill")
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
