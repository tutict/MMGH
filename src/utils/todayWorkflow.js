export function toDateTimeLocalValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function trimText(value, limit) {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }
  if (!Number.isFinite(limit) || compact.length <= limit) {
    return compact;
  }
  return `${compact.slice(0, Math.max(limit - 3, 1)).trimEnd()}...`;
}

export function findLatestMessageByRole(messages, role) {
  if (!Array.isArray(messages) || !role) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === role) {
      return message;
    }
  }

  return null;
}

export function buildFollowUpReminderDueAt(referenceTime = Date.now()) {
  const nextDueAt = new Date(referenceTime);
  nextDueAt.setDate(nextDueAt.getDate() + 1);
  nextDueAt.setHours(9, 0, 0, 0);
  return nextDueAt.getTime();
}

export function buildSessionCaptureDraft({ activeSession, t }) {
  const sessionTitle = String(
    activeSession?.session?.title || t("app.session.defaultTitle")
  ).trim();
  const messages = Array.isArray(activeSession?.messages) ? activeSession.messages : [];
  const latestAssistantMessage = findLatestMessageByRole(messages, "assistant");
  const latestUserMessage = findLatestMessageByRole(messages, "user");

  if (!latestAssistantMessage?.content?.trim()) {
    return null;
  }

  const assistantSummary = trimText(latestAssistantMessage.content, 220);
  const promptSummary = trimText(latestUserMessage?.content || "", 160);
  const defaultTitle = String(t("app.session.defaultTitle")).trim();
  const preferredTitle =
    sessionTitle && sessionTitle !== defaultTitle
      ? sessionTitle
      : assistantSummary || promptSummary || defaultTitle;
  const title = trimText(preferredTitle, 72) || defaultTitle;
  const noteBody = [
    sessionTitle,
    latestUserMessage?.content?.trim() || "",
    latestAssistantMessage.content.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
  const reminderDetail = [assistantSummary, promptSummary].filter(Boolean).join("\n");

  return {
    noteBody,
    noteTitle: title,
    reminderDetail: reminderDetail || assistantSummary,
    reminderDueAt: buildFollowUpReminderDueAt(),
    reminderTitle: title,
    summary: assistantSummary,
    tags: ["agent", "follow-up"],
    userSummary: promptSummary,
  };
}

export function createReminderCompletionDraft(reminder, referenceTime = Date.now()) {
  return {
    reminderId: reminder?.id || 0,
    reminderTitle: reminder?.title || "",
    linkedNoteId: reminder?.linkedNoteId ? String(reminder.linkedNoteId) : "",
    result: "",
    saveToNote: true,
    createFollowUp: false,
    followUpTitle: reminder?.title || "",
    followUpDueAt: toDateTimeLocalValue(buildFollowUpReminderDueAt(referenceTime)),
  };
}

export function buildDefaultFollowUpTitle(title, t) {
  const baseTitle = String(title || "").trim() || t("app.reminders.defaultTitle");
  return t("app.today.review.defaultFollowUpTitle", { title: baseTitle });
}

export function mergeUniqueTags(...collections) {
  const tags = new Set();
  collections.forEach((collection) => {
    if (!Array.isArray(collection)) {
      return;
    }
    collection.forEach((tag) => {
      const normalizedTag = String(tag || "").trim();
      if (normalizedTag) {
        tags.add(normalizedTag);
      }
    });
  });
  return Array.from(tags);
}

export function appendNoteSection(body, section) {
  const nextSection = String(section || "").trim();
  const currentBody = String(body || "").trim();
  if (!nextSection) {
    return currentBody;
  }
  if (!currentBody) {
    return nextSection;
  }
  return `${currentBody}\n\n---\n\n${nextSection}`;
}

export function formatTime(value, lang = "en-US") {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString(lang, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildReminderCompletionNoteEntry({
  completedAt,
  followUpDueAt,
  followUpTitle,
  lang,
  reminderTitle,
  result,
  t,
}) {
  const lines = [
    t("app.today.review.noteMarker"),
    `${t("app.today.review.subject")}: ${reminderTitle || t("app.reminders.defaultTitle")}`,
    `${t("app.today.review.completedAt")}: ${formatTime(completedAt, lang)}`,
  ];

  if (result) {
    lines.push(`${t("app.today.review.result")}: ${result}`);
  }

  if (followUpTitle) {
    const dueLabel = followUpDueAt ? ` (${formatTime(followUpDueAt, lang)})` : "";
    lines.push(`${t("app.today.review.followUp")}: ${followUpTitle}${dueLabel}`);
  }

  return lines.join("\n");
}

export function buildReminderCompletionDetail({ completedAt, currentDetail, lang, result, t }) {
  const nextDetail = String(currentDetail || "").trim();
  if (!result) {
    return nextDetail;
  }

  const completionLine = t("app.today.review.detailPrefix", {
    result,
    time: formatTime(completedAt, lang),
  });

  return [completionLine, nextDetail].filter(Boolean).join("\n\n");
}

export function buildFollowUpReminderDetail({ reminderTitle, result, summary, t }) {
  const nextDetail = [
    t("app.today.review.followUpSeed", {
      title: reminderTitle || t("app.reminders.defaultTitle"),
    }),
    result || summary,
  ]
    .filter(Boolean)
    .join("\n\n");

  return nextDetail.trim();
}

export function normalizeReminderPatternKey(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function buildRecurringPatternSkillName(title, t) {
  const baseTitle = String(title || "").trim() || t("app.reminders.defaultTitle");
  return t("app.today.review.skill.name", { title: baseTitle });
}

export function buildRecurringPatternSkillInstructions({ count, patternTitle, t }) {
  return [
    t("app.today.review.skill.instructions.line1", { title: patternTitle }),
    t("app.today.review.skill.instructions.line2"),
    t("app.today.review.skill.instructions.line3"),
    t("app.today.review.skill.instructions.line4", { count }),
  ].join("\n\n");
}

export function matchesSkillToReminderPattern(skill, patternTitle) {
  const normalizedPattern = normalizeReminderPatternKey(patternTitle);
  if (!normalizedPattern) {
    return false;
  }

  const searchable = [skill?.name, skill?.summary, skill?.triggerHint]
    .map((item) => normalizeReminderPatternKey(item))
    .filter(Boolean);

  return searchable.some((item) => item.includes(normalizedPattern));
}

export function resolvePatternStatusTone(status) {
  switch (status) {
    case "mounted":
      return "completed";
    case "available":
      return "ready";
    case "missing":
    default:
      return "idle";
  }
}

export function resolveRuleEffectivenessTone(state) {
  switch (state) {
    case "working":
      return "completed";
    case "ready":
      return "ready";
    case "idle":
    default:
      return "idle";
  }
}

export function resolveRuleActionTone(actionType) {
  switch (actionType) {
    case "mount":
      return "ready";
    case "tune":
      return "warning";
    case "unmount":
    default:
      return "idle";
  }
}

export function findNoteIdByTitle(notes, title) {
  if (!Array.isArray(notes) || !title) {
    return null;
  }

  const normalizedTitle = String(title).trim().toLowerCase();
  if (!normalizedTitle) {
    return null;
  }

  const matchedNote = notes.find(
    (note) => String(note?.title || "").trim().toLowerCase() === normalizedTitle
  );
  return matchedNote?.id || null;
}

export function resolveReminderPriority(reminder, clockNow) {
  const dueAt = Number(reminder?.dueAt);
  if (!Number.isFinite(dueAt)) {
    return 3;
  }
  if (dueAt <= clockNow) {
    return 0;
  }
  if (dueAt - clockNow <= 6 * 60 * 60 * 1000) {
    return 1;
  }
  if (dueAt - clockNow <= 24 * 60 * 60 * 1000) {
    return 2;
  }
  return 3;
}

export function resolveReminderUrgency(reminder, clockNow) {
  const priority = resolveReminderPriority(reminder, clockNow);
  if (priority === 0) {
    return "overdue";
  }
  if (priority === 1) {
    return "soon";
  }
  if (priority === 2) {
    return "today";
  }
  return "later";
}
