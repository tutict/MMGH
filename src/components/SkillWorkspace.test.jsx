import React, { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { I18nProvider } from "../i18n";
import SkillWorkspace from "./SkillWorkspace";

const starterSkill = {
  id: 1,
  name: "Note Recall",
  summary: "Bias the agent toward local notes, durable facts, and previously captured context.",
  description: "Bias the agent toward local notes, durable facts, and previously captured context.",
  instructions:
    "Before answering, check whether the local note set likely contains stable context.",
  triggerHint:
    "Use when the operator asks for context from local notes, private docs, or stable project knowledge.",
  enabled: true,
  permissionLevel: "low",
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
};

function SkillWorkspaceHarness({ initialLang = "zh-CN" } = {}) {
  const [skillDraft, setSkillDraft] = useState({
    id: starterSkill.id,
    name: starterSkill.name,
    description: starterSkill.description,
    instructions: starterSkill.instructions,
    triggerHint: starterSkill.triggerHint,
    enabled: starterSkill.enabled,
  });
  const [skillSearch, setSkillSearch] = useState("");
  const skillImportInputRef = useRef(null);

  return (
    <I18nProvider initialLang={initialLang}>
      <SkillWorkspace
        activeSkill={starterSkill}
        activeSkillId={starterSkill.id}
        activeSkillVersions={[]}
        activeSessionRecommendedSkills={[]}
        activeSessionTitle="新任务"
        busy=""
        handleCreateSkill={vi.fn()}
        handleDeleteSkill={vi.fn()}
        handleExportAllSkills={vi.fn()}
        handleExportSkill={vi.fn()}
        handleInstallSkillTemplate={vi.fn()}
        handleForgeSkill={vi.fn()}
        handleImportSkills={vi.fn()}
        handleLoadSkillVersion={vi.fn()}
        handleOpenSkill={vi.fn()}
        handleRestoreSkillVersion={vi.fn()}
        handleSaveSkill={vi.fn()}
        handleToggleSkillMounted={vi.fn()}
        hasUnsavedSkill={false}
        loading={false}
        mountedSkillIds={[]}
        providerConfigured={false}
        setSkillDraft={setSkillDraft}
        setSkillSearch={setSkillSearch}
        skillActionContextKey="test"
        skillImportInputRef={skillImportInputRef}
        skillDraft={skillDraft}
        skillList={[starterSkill]}
        skillSearch={skillSearch}
      />
    </I18nProvider>
  );
}

test("skill workspace localizes starter skill display without rewriting saved data", () => {
  render(<SkillWorkspaceHarness />);

  expect(screen.getAllByText("笔记优先").length).toBeGreaterThan(0);
  expect(screen.getByDisplayValue("笔记优先")).toBeTruthy();
  expect(screen.getByDisplayValue("用户需要本地笔记、私有文档或稳定项目知识作为上下文时")).toBeTruthy();
  expect(screen.queryByText("Note Recall")).toBeNull();
});

test("skill workspace keeps secondary tools behind tabs", async () => {
  const user = userEvent.setup();
  render(<SkillWorkspaceHarness />);

  expect(screen.getByRole("tab", { name: "会话" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "历史" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "模板" })).toBeTruthy();
  expect(screen.queryByText("生成技能草稿")).toBeNull();
  expect(screen.queryByPlaceholderText("搜索模板")).toBeNull();

  await user.click(screen.getByRole("tab", { name: "生成" }));

  expect(screen.getByRole("tab", { name: "生成" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("生成技能草稿")).toBeTruthy();
});
