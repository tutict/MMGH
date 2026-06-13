const copy = {
  "en-US": {
    activity: "Activity",
    agent: "Agent",
    allNotes: "All notes",
    body: "Body",
    city: "City",
    citySheet: "Cities",
    close: "Close",
    completed: "Completed",
    continueAgent: "Continue Agent",
    currentSession: "Current session",
    details: "Details",
    doneToday: "Done today",
    due: "Due",
    emptyAgent: "No messages yet.",
    emptyList: "Nothing here yet.",
    emptyNotes: "No notes match this search.",
    flowSignals: "Signals",
    highLow: "High / Low",
    hourly: "Hourly",
    inspector: "Inspector",
    knowledge: "Knowledge",
    language: "Language",
    legacy: "Legacy page",
    more: "More",
    newNote: "New note",
    openReminders: "Open reminders",
    openTasks: "Open",
    provider: "Provider",
    quickSettings: "Quick settings",
    refresh: "Refresh",
    remove: "Remove",
    save: "Save",
    search: "Search",
    send: "Send",
    sessionLibrary: "Sessions",
    skills: "Skills",
    tags: "Tags",
    theme: "Theme",
    today: "Today",
    weekly: "Weekly",
  },
  "zh-CN": {
    activity: "活动",
    agent: "Agent",
    allNotes: "全部笔记",
    body: "正文",
    city: "城市",
    citySheet: "城市",
    close: "关闭",
    completed: "已完成",
    continueAgent: "继续 Agent",
    currentSession: "当前会话",
    details: "详情",
    doneToday: "今日完成",
    due: "到期",
    emptyAgent: "还没有消息。",
    emptyList: "这里还没有内容。",
    emptyNotes: "没有匹配的笔记。",
    flowSignals: "闭环信号",
    highLow: "高 / 低",
    hourly: "逐小时",
    inspector: "检查器",
    knowledge: "知识",
    language: "语言",
    legacy: "普通页面",
    more: "更多",
    newNote: "新笔记",
    openReminders: "打开提醒",
    openTasks: "开放提醒",
    provider: "Provider",
    quickSettings: "快捷设置",
    refresh: "刷新",
    remove: "删除",
    save: "保存",
    search: "搜索",
    send: "发送",
    sessionLibrary: "会话库",
    skills: "技能",
    tags: "标签",
    theme: "主题",
    today: "Today",
    weekly: "一周",
  },
};

export function mobileText(lang, key) {
  const locale = String(lang || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
  return copy[locale][key] || copy["en-US"][key] || key;
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
