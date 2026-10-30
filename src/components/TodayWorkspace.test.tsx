import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi } from "vitest";
import { I18nProvider } from "../i18n";
import { resolveRuleActionTone } from "../utils/todayWorkflow";
import TodayWorkspace from "./TodayWorkspace";

const tuneRecommendation = {
  actionType: "tune",
  actionTitle: "调整这条规则",
  reason: "这条规则已经挂载，但最近未完成事项（3）已经多于完成数（1）。",
  matchedSkillId: 42,
  matchedSkillName: "周报助手",
  title: "周报",
};

function renderToday(ruleActionRecommendations: unknown[] = []) {
  const handlers = {
    handleOpenLinkedNote: vi.fn(),
    handleOpenNote: vi.fn(),
    handleOpenSession: vi.fn(),
    handleOpenSkill: vi.fn(async () => true),
    handleSelectReminder: vi.fn(async () => true),
    handleToggleSkillMounted: vi.fn(async () => undefined),
    handleToggleTodayReminderStatus: vi.fn(),
    openView: vi.fn(),
  };

  const view = render(
    <I18nProvider initialLang="zh-CN">
      <TodayWorkspace
        activeSession={null}
        activeSessionId=""
        busy=""
        clockNow={1_710_000_000_000}
        completedTodayItems={[]}
        continueSessionItems={[]}
        formatTime={() => "2026-03-09"}
        handleOpenLinkedNote={handlers.handleOpenLinkedNote}
        handleOpenNote={handlers.handleOpenNote}
        handleOpenSession={handlers.handleOpenSession}
        handleOpenSkill={handlers.handleOpenSkill}
        handleSelectReminder={handlers.handleSelectReminder}
        handleToggleSkillMounted={handlers.handleToggleSkillMounted}
        handleToggleTodayReminderStatus={handlers.handleToggleTodayReminderStatus}
        lang="zh-CN"
        loading={false}
        noteList={[]}
        openReminderCount={0}
        openView={handlers.openView}
        recentCaptureItems={[]}
        resolveReminderUrgency={() => "today"}
        resolveRuleActionTone={resolveRuleActionTone}
        ruleActionRecommendations={ruleActionRecommendations}
        todayReminderItems={[]}
        todayReviewSignals={[]}
      />
    </I18nProvider>
  );

  return { ...view, handlers };
}

test("the desktop Today keeps one rule-suggestion card", () => {
  const { container } = renderToday([tuneRecommendation]);
  expect(container.querySelectorAll(".today-rule-item")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "建议动作" })).toBeTruthy();
  expect(screen.getByText("调优")).toBeTruthy();
  expect(screen.getByText("周报助手")).toBeTruthy();
  expect(screen.getByText("循环：周报")).toBeTruthy();
});

test("the rule card stays hidden when no rule needs a move", () => {
  const { container } = renderToday([]);
  expect(container.querySelector(".today-rule-item")).toBeNull();
  expect(screen.queryByRole("heading", { name: "建议动作" })).toBeNull();
});

test("a tune recommendation opens the rule it belongs to", async () => {
  const user = userEvent.setup();
  const { handlers } = renderToday([tuneRecommendation]);
  await user.click(screen.getByRole("button", { name: "打开规则" }));
  expect(handlers.handleOpenSkill).toHaveBeenCalledWith(42);
  expect(handlers.openView).toHaveBeenCalledWith("skills");
});

test("a mount recommendation mounts the rule in the current session", async () => {
  const user = userEvent.setup();
  const { handlers } = renderToday([
    { ...tuneRecommendation, actionType: "mount", actionTitle: "挂载这条规则" },
  ]);
  await user.click(screen.getByRole("button", { name: "挂载" }));
  expect(handlers.handleToggleSkillMounted).toHaveBeenCalledWith(42);
  expect(handlers.openView).not.toHaveBeenCalled();
});
