import {
  matchesSkillToReminderPattern,
  normalizeReminderPatternKey,
  resolveReminderPriority,
} from "./todayWorkflow";

function getDayStartTimestamp(referenceTime) {
  const todayStart = new Date(referenceTime);
  todayStart.setHours(0, 0, 0, 0);
  return todayStart.getTime();
}

export function selectOpenReminderCount(reminders) {
  return reminders.filter((item) => item.status !== "done").length;
}

export function selectDueReminderCount(reminders, clockNow) {
  return reminders.filter(
    (item) => item.status !== "done" && item.dueAt && item.dueAt <= clockNow
  ).length;
}

export function selectTodayReminderItems(reminders, clockNow) {
  return [...reminders]
    .filter((item) => item.status !== "done")
    .sort((left, right) => {
      const leftPriority = resolveReminderPriority(left, clockNow);
      const rightPriority = resolveReminderPriority(right, clockNow);
      return (
        leftPriority - rightPriority ||
        (left.dueAt || Number.MAX_SAFE_INTEGER) - (right.dueAt || Number.MAX_SAFE_INTEGER)
      );
    })
    .slice(0, 5);
}

export function selectCompletedTodayItems(reminders, clockNow) {
  const todayStartAt = getDayStartTimestamp(clockNow);

  return [...reminders]
    .filter((item) => item.status === "done" && item.updatedAt >= todayStartAt)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 4);
}

export function selectRecurringReminderPatterns(reminders, clockNow) {
  const lookbackStart = clockNow - 14 * 24 * 60 * 60 * 1000;
  const patternMap = new Map();

  reminders.forEach((item) => {
    if (item.updatedAt < lookbackStart) {
      return;
    }
    const patternKey = normalizeReminderPatternKey(item.title);
    if (!patternKey) {
      return;
    }

    const previous = patternMap.get(patternKey) || {
      count: 0,
      lastSeenAt: 0,
      title: item.title,
    };

    patternMap.set(patternKey, {
      count: previous.count + 1,
      lastSeenAt: Math.max(previous.lastSeenAt, item.updatedAt || 0),
      title: previous.title.length >= String(item.title || "").length ? previous.title : item.title,
    });
  });

  return Array.from(patternMap.values())
    .filter((item) => item.count >= 2)
    .sort((left, right) => right.count - left.count || right.lastSeenAt - left.lastSeenAt)
    .slice(0, 3);
}

export function buildRecurringPatternInsights({
  activeSessionSkillIds,
  clockNow,
  recurringReminderPatterns,
  reminders,
  skillList,
}) {
  const mountedSet = new Set(activeSessionSkillIds);
  const lookbackStart = clockNow - 14 * 24 * 60 * 60 * 1000;

  return recurringReminderPatterns.map((pattern) => {
    const relatedReminders = reminders.filter(
      (item) =>
        item.updatedAt >= lookbackStart &&
        normalizeReminderPatternKey(item.title) === normalizeReminderPatternKey(pattern.title)
    );
    const matchedSkill = skillList
      .filter((skill) => skill.enabled && matchesSkillToReminderPattern(skill, pattern.title))
      .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0];
    const closedCount = relatedReminders.filter((item) => item.status === "done").length;
    const openCount = relatedReminders.length - closedCount;

    const status = matchedSkill
      ? mountedSet.has(matchedSkill.id)
        ? "mounted"
        : "available"
      : "missing";

    return {
      ...pattern,
      matchedSkillId: matchedSkill?.id || 0,
      matchedSkillName: matchedSkill?.name || "",
      closedCount,
      openCount,
      status,
    };
  });
}

export function buildTodayReviewSignals({
  clockNow,
  noteList,
  recurringPatternInsights,
  reminders,
  t,
}) {
  const todayStartAt = getDayStartTimestamp(clockNow);

  const closedTodayCount = reminders.filter(
    (item) => item.status === "done" && item.updatedAt >= todayStartAt
  ).length;
  const closedCoveredTodayCount = reminders.filter((item) => {
    if (item.status !== "done" || item.updatedAt < todayStartAt) {
      return false;
    }
    const matchedPattern = recurringPatternInsights.find(
      (pattern) =>
        pattern.status !== "missing" &&
        normalizeReminderPatternKey(pattern.title) === normalizeReminderPatternKey(item.title)
    );
    return Boolean(matchedPattern);
  }).length;
  const queuedNextCount = reminders.filter(
    (item) =>
      item.status !== "done" &&
      item.createdAt >= todayStartAt &&
      Number.isFinite(Number(item.dueAt)) &&
      item.dueAt > clockNow
  ).length;
  const notesUpdatedTodayCount = noteList.filter((item) => item.updatedAt >= todayStartAt).length;
  const coveredCount = recurringPatternInsights.filter((item) => item.status !== "missing").length;

  return [
    { id: "closed", label: t("app.today.review.signal.closed"), value: `${closedTodayCount}` },
    {
      id: "closed-covered",
      label: t("app.today.review.signal.closedCovered"),
      value: `${closedCoveredTodayCount}`,
    },
    { id: "queued", label: t("app.today.review.signal.queued"), value: `${queuedNextCount}` },
    { id: "notes", label: t("app.today.review.signal.notes"), value: `${notesUpdatedTodayCount}` },
    { id: "covered", label: t("app.today.review.signal.covered"), value: `${coveredCount}` },
  ];
}

export function buildRuleEffectivenessInsights({
  clockNow,
  recurringPatternInsights,
  reminders,
}) {
  const todayStartAt = getDayStartTimestamp(clockNow);
  const stateRank = {
    working: 0,
    idle: 1,
    ready: 2,
  };

  return recurringPatternInsights
    .filter((item) => item.status !== "missing")
    .map((item) => {
      const closedTodayCount = reminders.filter(
        (reminder) =>
          reminder.status === "done" &&
          reminder.updatedAt >= todayStartAt &&
          normalizeReminderPatternKey(reminder.title) === normalizeReminderPatternKey(item.title)
      ).length;
      const totalCount = item.closedCount + item.openCount;
      const closureRate = totalCount > 0 ? Math.round((item.closedCount / totalCount) * 100) : 0;
      const effectivenessState =
        item.status === "mounted" ? (closedTodayCount > 0 ? "working" : "idle") : "ready";

      return {
        ...item,
        closedTodayCount,
        closureRate,
        effectivenessState,
      };
    })
    .sort(
      (left, right) =>
        (stateRank[left.effectivenessState] ?? 99) - (stateRank[right.effectivenessState] ?? 99) ||
        right.closedTodayCount - left.closedTodayCount ||
        right.closureRate - left.closureRate ||
        right.count - left.count ||
        right.lastSeenAt - left.lastSeenAt
    );
}

export function buildRuleEffectivenessSignals({ ruleEffectivenessInsights, t }) {
  return [
    {
      id: "working",
      label: t("app.today.review.rule.signal.working"),
      value: `${
        ruleEffectivenessInsights.filter((item) => item.effectivenessState === "working").length
      }`,
    },
    {
      id: "idle",
      label: t("app.today.review.rule.signal.idle"),
      value: `${
        ruleEffectivenessInsights.filter((item) => item.effectivenessState === "idle").length
      }`,
    },
    {
      id: "ready",
      label: t("app.today.review.rule.signal.ready"),
      value: `${
        ruleEffectivenessInsights.filter((item) => item.effectivenessState === "ready").length
      }`,
    },
  ];
}

export function buildRuleActionRecommendations({ ruleEffectivenessInsights, t }) {
  const actionRank = {
    mount: 0,
    tune: 1,
    unmount: 2,
  };

  return ruleEffectivenessInsights
    .flatMap((item) => {
      if (item.status === "available" && item.openCount > 0) {
        return [
          {
            ...item,
            actionType: "mount",
            actionTitle: t("app.today.review.rule.action.mount.title"),
            reason: t("app.today.review.rule.action.mount.reason", {
              open: item.openCount,
            }),
          },
        ];
      }

      if (item.status === "mounted" && item.openCount > item.closedCount) {
        return [
          {
            ...item,
            actionType: "tune",
            actionTitle: t("app.today.review.rule.action.tune.title"),
            reason: t("app.today.review.rule.action.tune.reason", {
              closed: item.closedCount,
              open: item.openCount,
            }),
          },
        ];
      }

      if (item.status === "mounted" && item.closedTodayCount === 0 && item.openCount === 0) {
        return [
          {
            ...item,
            actionType: "unmount",
            actionTitle: t("app.today.review.rule.action.unmount.title"),
            reason: t("app.today.review.rule.action.unmount.reason"),
          },
        ];
      }

      return [];
    })
    .sort(
      (left, right) =>
        (actionRank[left.actionType] ?? 99) - (actionRank[right.actionType] ?? 99) ||
        right.openCount - left.openCount ||
        right.closedTodayCount - left.closedTodayCount ||
        right.closureRate - left.closureRate ||
        right.count - left.count
    )
    .slice(0, 3);
}

export function buildRuntimeRecommendedSkills({
  activeSessionRecommendedSkills,
  activeSessionSkillIds,
  recurringPatternInsights,
  skillList,
  t,
}) {
  const mountedSet = new Set(activeSessionSkillIds);
  const mergedRecommendations = [];
  const seenSkillIds = new Set();

  recurringPatternInsights.forEach((pattern) => {
    if (!pattern.matchedSkillId || pattern.status === "mounted") {
      return;
    }

    const matchedSkill = skillList.find((skill) => skill.id === pattern.matchedSkillId);

    if (!matchedSkill || seenSkillIds.has(matchedSkill.id)) {
      return;
    }

    seenSkillIds.add(matchedSkill.id);
    mergedRecommendations.push({
      ...matchedSkill,
      recommendationReason: t("app.agent.recommend.patternReason", {
        count: pattern.count,
        title: pattern.title,
      }),
    });
  });

  activeSessionRecommendedSkills.forEach((skill) => {
    if (mountedSet.has(skill.id) || seenSkillIds.has(skill.id)) {
      return;
    }

    seenSkillIds.add(skill.id);
    mergedRecommendations.push(skill);
  });

  return mergedRecommendations.slice(0, 5);
}

export function selectContinueSessionItems(sessionList, activeSessionId) {
  return sessionList.filter((session) => session.id !== activeSessionId).slice(0, 5);
}

export function selectRecentCaptureItems(noteList, reminders) {
  return [
    ...noteList.map((note) => ({
      id: `note-${note.id}`,
      kind: "note",
      title: note.title,
      detail: note.summary,
      updatedAt: note.updatedAt,
      targetId: note.id,
      tags: note.tags || [],
    })),
    ...reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      kind: "reminder",
      title: reminder.title,
      detail: reminder.preview,
      updatedAt: reminder.updatedAt,
      targetId: reminder.id,
      status: reminder.status,
    })),
  ]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 6);
}
