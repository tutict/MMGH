import { expect, test } from "vitest";

import {
  buildRecurringPatternInsights,
  buildRuleActionRecommendations,
  buildRuleEffectivenessInsights,
  buildRuntimeRecommendedSkills,
  buildTodayReviewSignals,
  selectRecentCaptureItems,
  selectRecurringReminderPatterns,
  selectTodayReminderItems,
} from "./todayInsights";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const clockNow = new Date("2026-04-14T10:00:00+08:00").getTime();

function t(key, values = {}) {
  return `${key}:${JSON.stringify(values)}`;
}

test("selectTodayReminderItems prioritizes overdue and soon reminders first", () => {
  const reminders = [
    { id: 1, title: "Later", status: "scheduled", dueAt: clockNow + 48 * HOUR },
    { id: 2, title: "Soon", status: "scheduled", dueAt: clockNow + 2 * HOUR },
    { id: 3, title: "Done", status: "done", dueAt: clockNow - HOUR },
    { id: 4, title: "Overdue", status: "scheduled", dueAt: clockNow - HOUR },
    { id: 5, title: "Today", status: "scheduled", dueAt: clockNow + 12 * HOUR },
  ];

  expect(selectTodayReminderItems(reminders, clockNow).map((item) => item.id)).toEqual([
    4,
    2,
    5,
    1,
  ]);
});

test("pattern and rule selectors surface mounted, available, and missing flows", () => {
  const reminders = [
    {
      id: 1,
      title: "Weekly review",
      status: "done",
      createdAt: clockNow - HOUR,
      updatedAt: clockNow - HOUR,
      dueAt: clockNow - 2 * HOUR,
    },
    {
      id: 2,
      title: "Weekly review",
      status: "scheduled",
      createdAt: clockNow - 2 * HOUR,
      updatedAt: clockNow - 2 * HOUR,
      dueAt: clockNow + HOUR,
    },
    {
      id: 3,
      title: "Inbox cleanup",
      status: "scheduled",
      createdAt: clockNow - 3 * HOUR,
      updatedAt: clockNow - 3 * HOUR,
      dueAt: clockNow + 3 * HOUR,
    },
    {
      id: 4,
      title: "Inbox cleanup",
      status: "scheduled",
      createdAt: clockNow - DAY,
      updatedAt: clockNow - DAY,
      dueAt: clockNow + 4 * HOUR,
    },
    {
      id: 5,
      title: "Archive logs",
      status: "done",
      createdAt: clockNow - 2 * DAY,
      updatedAt: clockNow - 2 * DAY,
      dueAt: clockNow - 2 * DAY,
    },
    {
      id: 6,
      title: "Archive logs",
      status: "done",
      createdAt: clockNow - 3 * DAY,
      updatedAt: clockNow - 3 * DAY,
      dueAt: clockNow - 3 * DAY,
    },
  ];
  const recurringReminderPatterns = selectRecurringReminderPatterns(reminders, clockNow);
  const skillList = [
    {
      id: 101,
      name: "Weekly review helper",
      summary: "Weekly review checklist",
      triggerHint: "weekly review",
      enabled: true,
      updatedAt: clockNow,
    },
    {
      id: 102,
      name: "Inbox cleanup helper",
      summary: "Inbox cleanup routine",
      triggerHint: "inbox cleanup",
      enabled: true,
      updatedAt: clockNow - HOUR,
    },
  ];

  const recurringPatternInsights = buildRecurringPatternInsights({
    activeSessionSkillIds: [101],
    clockNow,
    recurringReminderPatterns,
    reminders,
    skillList,
  });

  expect(recurringPatternInsights.map((item) => [item.title, item.status])).toEqual([
    ["Weekly review", "mounted"],
    ["Inbox cleanup", "available"],
    ["Archive logs", "missing"],
  ]);

  const ruleEffectivenessInsights = buildRuleEffectivenessInsights({
    clockNow,
    recurringPatternInsights,
    reminders,
  });

  expect(ruleEffectivenessInsights.map((item) => [item.title, item.effectivenessState])).toEqual([
    ["Weekly review", "working"],
    ["Inbox cleanup", "ready"],
  ]);

  const recommendations = buildRuleActionRecommendations({
    ruleEffectivenessInsights,
    t,
  });

  expect(recommendations.map((item) => item.actionType)).toEqual(["mount"]);
  expect(recommendations[0].title).toBe("Inbox cleanup");
});

test("runtime recommendations merge pattern matches with agent suggestions without duplicates", () => {
  const recurringPatternInsights = [
    {
      title: "Weekly review",
      count: 3,
      matchedSkillId: 101,
      status: "available",
    },
    {
      title: "Inbox cleanup",
      count: 2,
      matchedSkillId: 102,
      status: "mounted",
    },
  ];
  const skillList = [
    { id: 101, name: "Weekly review helper" },
    { id: 102, name: "Inbox cleanup helper" },
    { id: 103, name: "Project wrap-up helper" },
  ];
  const activeSessionRecommendedSkills = [
    { id: 101, name: "Weekly review helper" },
    { id: 103, name: "Project wrap-up helper" },
  ];

  const recommendations = buildRuntimeRecommendedSkills({
    activeSessionRecommendedSkills,
    activeSessionSkillIds: [102],
    recurringPatternInsights,
    skillList,
    t,
  });

  expect(recommendations.map((item) => item.id)).toEqual([101, 103]);
  expect(recommendations[0].recommendationReason).toContain("app.agent.recommend.patternReason");
});

test("today review and recent capture selectors summarize mixed workspace activity", () => {
  const reminders = [
    {
      id: 1,
      title: "Weekly review",
      status: "done",
      createdAt: clockNow - HOUR,
      updatedAt: clockNow - HOUR,
      dueAt: clockNow - 2 * HOUR,
      preview: "Finished",
    },
    {
      id: 2,
      title: "Weekly review",
      status: "scheduled",
      createdAt: clockNow - 30 * 60 * 1000,
      updatedAt: clockNow - 30 * 60 * 1000,
      dueAt: clockNow + HOUR,
      preview: "Queued",
    },
  ];
  const recurringPatternInsights = [
    {
      title: "Weekly review",
      status: "mounted",
    },
  ];
  const noteList = [
    {
      id: 10,
      title: "Review notes",
      summary: "Updated",
      updatedAt: clockNow - 20 * 60 * 1000,
      tags: ["reminder"],
    },
  ];

  expect(
    buildTodayReviewSignals({
      clockNow,
      noteList,
      recurringPatternInsights,
      reminders,
      t,
    }).map((item) => [item.id, item.value])
  ).toEqual([
    ["closed", "1"],
    ["closed-covered", "1"],
    ["queued", "1"],
    ["notes", "1"],
    ["covered", "1"],
  ]);

  expect(selectRecentCaptureItems(noteList, reminders).map((item) => item.id)).toEqual([
    "note-10",
    "reminder-2",
    "reminder-1",
  ]);
});
