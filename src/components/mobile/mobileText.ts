const copy = {
  "en-US": {
    activity: "Activity",
    agent: "Agent",
    allNotes: "All notes",
    back: "Back",
    body: "Body",
    city: "City",
    citySheet: "Cities",
    clock: "Now",
    close: "Close",
    completed: "Completed",
    continueAgent: "Continue Agent",
    currentSession: "Current session",
    details: "Details",
    doneToday: "Done today",
    due: "Due",
    emptyAgent: "No messages yet.",
    emptyGallerySearch: "No images match this search.",
    emptyList: "Nothing here yet.",
    emptyNotes: "No notes match this search.",
    emptyNotesHero: "No notes yet",
    emptyNotesHint: "Keep prompts and lasting notes here.",
    emptyReminders: "No reminders yet",
    emptyRemindersHint: "Set a time and it will show up in Today.",
    emptyRemindersSearch: "No reminders match this search.",
    emptyTodayHint: "Pick up the last chat, or add a reminder when you need one.",
    flowSignals: "Signals",
    highLow: "High / Low",
    hourly: "Hourly",
    inbox: "To-do",
    inspector: "Inspector",
    knowledge: "Knowledge",
    language: "Language",
    legacy: "Legacy page",
    more: "More",
    newNote: "New note",
    next: "Next",
    openReminders: "Open reminders",
    openTasks: "Open",
    provider: "Provider",
    providerPending: "Provider not configured",
    providerReady: "Provider ready",
    previous: "Previous",
    quickSettings: "Quick settings",
    refresh: "Refresh",
    remove: "Remove",
    save: "Save",
    search: "Search",
    send: "Send",
    sendPlaceholder: "Message",
    sessionLibrary: "Sessions",
    skillAdd: "Add",
    skillMounted: "Mounted",
    skills: "Skills",
    system: "System",
    tags: "Tags",
    theme: "Theme",
    title: "Title",
    today: "Today",
    weekly: "Weekly",
    you: "You",
  },
  "zh-CN": {
    activity: "活动",
    agent: "Agent",
    allNotes: "全部笔记",
    back: "返回",
    body: "正文",
    city: "城市",
    citySheet: "城市",
    clock: "现在",
    close: "关闭",
    completed: "已完成",
    continueAgent: "继续 Agent",
    currentSession: "当前会话",
    details: "详情",
    doneToday: "今日完成",
    due: "到期",
    emptyAgent: "还没有消息。",
    emptyGallerySearch: "没有匹配的图片。",
    emptyList: "这里还没有内容。",
    emptyNotes: "没有匹配的笔记。",
    emptyNotesHero: "还没有笔记",
    emptyNotesHint: "把常用资料和提示词放这里。",
    emptyReminders: "还没有提醒",
    emptyRemindersHint: "设个时间，到期会出现在今日。",
    emptyRemindersSearch: "没有匹配的提醒。",
    emptyTodayHint: "没有到期事项。需要的话，接着上次对话即可。",
    flowSignals: "闭环信号",
    highLow: "高 / 低",
    hourly: "逐小时",
    inbox: "待办",
    inspector: "检查器",
    knowledge: "知识",
    language: "语言",
    legacy: "普通页面",
    more: "更多",
    newNote: "新笔记",
    next: "下一张",
    openReminders: "打开提醒",
    openTasks: "开放提醒",
    provider: "Provider",
    providerPending: "Provider 未配置",
    providerReady: "Provider 已就绪",
    previous: "上一张",
    quickSettings: "快捷设置",
    refresh: "刷新",
    remove: "删除",
    save: "保存",
    search: "搜索",
    send: "发送",
    sendPlaceholder: "输入消息",
    sessionLibrary: "会话库",
    skillAdd: "添加",
    skillMounted: "已挂载",
    skills: "技能",
    system: "系统",
    tags: "标签",
    theme: "主题",
    title: "标题",
    today: "今日",
    weekly: "一周",
    you: "我",
  },
};

export const mobileCopy = copy;

const warnedKeys = new Set<string>();

function reportMissingKey(scope: string, key: string) {
  const token = `${scope}:${key}`;
  if (warnedKeys.has(token)) {
    return;
  }
  warnedKeys.add(token);
  if (import.meta.env?.DEV) {
    console.warn(`[i18n] missing translation for ${token}`);
  }
}

export function mobileText(lang, key) {
  const locale = String(lang || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
  const message = copy[locale][key] ?? copy["en-US"][key];
  if (message === undefined) {
    reportMissingKey("mobileText", key);
    return key;
  }
  return message;
}

export function getMobileDaypart(date, lang) {
  const hour = new Date(date).getHours();
  const zh = String(lang || "").toLowerCase().startsWith("zh");

  if (hour < 6) {
    return zh ? "深夜安排" : "Late night";
  }
  if (hour < 12) {
    return zh ? "上午安排" : "Morning";
  }
  if (hour < 18) {
    return zh ? "下午安排" : "Afternoon";
  }
  return zh ? "晚上安排" : "Evening";
}

export function getMobileNavIconType(viewId) {
  switch (viewId) {
    case "today":
      return "today";
    case "agent":
      return "runtime";
    case "knowledge":
      return "knowledge";
    case "gallery":
      return "gallery";
    case "music":
      return "music";
    case "weather":
      return "weather";
    case "reminders":
      return "reminders";
    case "skills":
      return "skills";
    case "settings":
      return "system";
    default:
      return "desktop";
  }
}

export function resolveWeatherCityName(city, t) {
  if (!city) {
    return "";
  }
  return city.nameKey ? t(city.nameKey) : city.name || city.label || city.id;
}

export function resolveWeatherRegion(city, t) {
  if (!city) {
    return "";
  }
  return city.regionKey ? t(city.regionKey) : city.region || city.country || "";
}

export function resolveWeatherCondition(city, t) {
  if (!city?.conditionKey) {
    return "--";
  }
  return t(city.conditionKey);
}

export function formatMobileWeatherTime(value, lang) {
  if (!value) {
    return "--";
  }

  try {
    return new Intl.DateTimeFormat(lang, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value).slice(11, 16) || String(value);
  }
}

export function formatMobileWeatherDate(value, lang) {
  if (!value) {
    return "--";
  }

  try {
    return new Intl.DateTimeFormat(lang, {
      weekday: "short",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value).slice(5, 10) || String(value);
  }
}
