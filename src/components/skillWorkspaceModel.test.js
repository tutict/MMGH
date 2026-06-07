import {
  buildDraftDisplay,
  buildSkillDisplay,
  buildTemplateNameMap,
  createSkillTemplates,
  findInstalledStarterSkill,
  getSkillMeta,
  normalizeStarterTemplates,
  toHistoryReasonKey,
} from "./skillWorkspaceModel";

const translations = {
  "app.skills.templates.noteRecall.name": "笔记优先",
  "app.skills.templates.noteRecall.description": "读取本地笔记作为稳定上下文。",
  "app.skills.templates.noteRecall.trigger": "用户需要本地笔记时",
  "app.skills.templates.noteRecall.instructions": "先检查本地笔记。",
  "app.skills.source.starter": "内置",
  "app.skills.source.workspace": "工作区",
  "app.skills.category.memory": "记忆",
  "app.skills.category.research": "研究",
  "app.skills.category.safety": "安全",
  "app.skills.category.ui": "界面",
  "app.skills.category.workflow": "工作流",
};

function t(key) {
  return translations[key] || key;
}

function buildTemplateFixtures() {
  const templates = normalizeStarterTemplates(createSkillTemplates(t));
  return {
    templates,
    templateNameMap: buildTemplateNameMap(templates),
  };
}

test("buildSkillDisplay localizes starter skills through aliases", () => {
  const { templateNameMap } = buildTemplateFixtures();
  const savedSkill = {
    id: 1,
    name: "Note Recall",
    summary: "Stored summary",
    description: "Stored description",
    instructions: "Stored instructions",
    triggerHint: "Stored trigger",
  };

  expect(buildSkillDisplay(savedSkill, templateNameMap)).toMatchObject({
    id: 1,
    name: "笔记优先",
    summary: "读取本地笔记作为稳定上下文。",
    description: "读取本地笔记作为稳定上下文。",
    instructions: "先检查本地笔记。",
    triggerHint: "用户需要本地笔记时",
  });
});

test("buildDraftDisplay keeps edited starter fields instead of overwriting them", () => {
  const { templates } = buildTemplateFixtures();
  const starterTemplate = templates.find((template) => template.id === "starter-note-recall");
  const activeSkill = {
    name: "Note Recall",
    description: "Stored description",
    instructions: "Stored instructions",
    triggerHint: "Stored trigger",
  };
  const draft = {
    name: "Custom recall",
    description: "Stored description",
    instructions: "Edited instructions",
    triggerHint: "Stored trigger",
  };

  expect(buildDraftDisplay(draft, activeSkill, starterTemplate)).toMatchObject({
    name: "Custom recall",
    description: "读取本地笔记作为稳定上下文。",
    instructions: "Edited instructions",
    triggerHint: "用户需要本地笔记时",
  });
});

test("starter lookup and meta support legacy names", () => {
  const { templates, templateNameMap } = buildTemplateFixtures();
  const noteTemplate = templates.find((template) => template.id === "starter-note-recall");
  const installedSkill = {
    id: 7,
    name: "Local note recall",
    summary: "memory context",
    triggerHint: "",
  };

  expect(findInstalledStarterSkill(noteTemplate, [installedSkill])).toBe(installedSkill);
  expect(getSkillMeta(installedSkill, new Set([7]), templateNameMap, t)).toMatchObject({
    mounted: true,
    sourceLabel: "内置",
    categoryLabel: "记忆",
    starterTemplate: noteTemplate,
  });
});

test("workspace skill meta infers a fallback category", () => {
  const { templateNameMap } = buildTemplateFixtures();
  const workspaceSkill = {
    id: 3,
    name: "Release Checklist",
    summary: "Guard destructive migration steps.",
    triggerHint: "Before shipping risky changes",
  };

  expect(getSkillMeta(workspaceSkill, new Set(), templateNameMap, t)).toMatchObject({
    mounted: false,
    sourceLabel: "工作区",
    categoryLabel: "安全",
    starterTemplate: null,
  });
});

test("history reasons map storage values to i18n keys", () => {
  expect(toHistoryReasonKey("ai-rewrite")).toBe("aiRewrite");
  expect(toHistoryReasonKey("restore")).toBe("restore");
  expect(toHistoryReasonKey("manual-save")).toBe("manualSave");
});
