const STARTER_TEMPLATE_ALIAS_FIXUPS = {
  "starter-note-recall": ["Note Recall", "笔记召回", "Local note recall"],
  "starter-knowledge-librarian": ["Knowledge Librarian", "知识整理员"],
  "starter-reminder-radar": ["Reminder Radar", "提醒雷达"],
  "starter-weather-brief": ["Weather Brief", "天气简报"],
  "starter-music-companion": ["Music Companion", "音乐陪听"],
  "starter-gallery-curator": ["Gallery Curator", "画廊策展"],
  "starter-settings-steward": ["Settings Steward", "设置管家"],
  "starter-release-guard": ["Release Guard", "发布守卫"],
  "starter-ui-polish": ["UI Polish", "界面打磨"],
  "starter-research-mode": ["Research Mode", "研究模式"],
  "starter-task-router": ["Task Router", "任务路由"],
};

export function createSkillTemplates(t) {
  return [
    {
      id: "starter-note-recall",
      name: t("app.skills.templates.noteRecall.name"),
      aliases: ["Note Recall", "笔记召回", "Local note recall"],
      description: t("app.skills.templates.noteRecall.description"),
      triggerHint: t("app.skills.templates.noteRecall.trigger"),
      instructions: t("app.skills.templates.noteRecall.instructions"),
      category: "memory",
    },
    {
      id: "starter-knowledge-librarian",
      name: t("app.skills.templates.knowledgeLibrarian.name"),
      aliases: ["Knowledge Librarian", "知识整理员"],
      description: t("app.skills.templates.knowledgeLibrarian.description"),
      triggerHint: t("app.skills.templates.knowledgeLibrarian.trigger"),
      instructions: t("app.skills.templates.knowledgeLibrarian.instructions"),
      category: "memory",
    },
    {
      id: "starter-reminder-radar",
      name: t("app.skills.templates.reminderRadar.name"),
      aliases: ["Reminder Radar", "提醒雷达"],
      description: t("app.skills.templates.reminderRadar.description"),
      triggerHint: t("app.skills.templates.reminderRadar.trigger"),
      instructions: t("app.skills.templates.reminderRadar.instructions"),
      category: "workflow",
    },
    {
      id: "starter-weather-brief",
      name: t("app.skills.templates.weatherBrief.name"),
      aliases: ["Weather Brief", "天气简报"],
      description: t("app.skills.templates.weatherBrief.description"),
      triggerHint: t("app.skills.templates.weatherBrief.trigger"),
      instructions: t("app.skills.templates.weatherBrief.instructions"),
      category: "research",
    },
    {
      id: "starter-music-companion",
      name: t("app.skills.templates.musicCompanion.name"),
      aliases: ["Music Companion", "音乐伴听"],
      description: t("app.skills.templates.musicCompanion.description"),
      triggerHint: t("app.skills.templates.musicCompanion.trigger"),
      instructions: t("app.skills.templates.musicCompanion.instructions"),
      category: "workflow",
    },
    {
      id: "starter-gallery-curator",
      name: t("app.skills.templates.galleryCurator.name"),
      aliases: ["Gallery Curator", "画廊策展"],
      description: t("app.skills.templates.galleryCurator.description"),
      triggerHint: t("app.skills.templates.galleryCurator.trigger"),
      instructions: t("app.skills.templates.galleryCurator.instructions"),
      category: "memory",
    },
    {
      id: "starter-settings-steward",
      name: t("app.skills.templates.settingsSteward.name"),
      aliases: ["Settings Steward", "设置管家"],
      description: t("app.skills.templates.settingsSteward.description"),
      triggerHint: t("app.skills.templates.settingsSteward.trigger"),
      instructions: t("app.skills.templates.settingsSteward.instructions"),
      category: "safety",
    },
    {
      id: "starter-release-guard",
      name: t("app.skills.templates.releaseGuard.name"),
      aliases: ["Release Guard", "发布守卫"],
      description: t("app.skills.templates.releaseGuard.description"),
      triggerHint: t("app.skills.templates.releaseGuard.trigger"),
      instructions: t("app.skills.templates.releaseGuard.instructions"),
      category: "safety",
    },
    {
      id: "starter-ui-polish",
      name: t("app.skills.templates.uiPolish.name"),
      aliases: ["UI Polish", "界面打磨"],
      description: t("app.skills.templates.uiPolish.description"),
      triggerHint: t("app.skills.templates.uiPolish.trigger"),
      instructions: t("app.skills.templates.uiPolish.instructions"),
      category: "ui",
    },
    {
      id: "starter-research-mode",
      name: t("app.skills.templates.researchMode.name"),
      aliases: ["Research Mode", "研究模式"],
      description: t("app.skills.templates.researchMode.description"),
      triggerHint: t("app.skills.templates.researchMode.trigger"),
      instructions: t("app.skills.templates.researchMode.instructions"),
      category: "research",
    },
    {
      id: "starter-task-router",
      name: t("app.skills.templates.taskRouter.name"),
      aliases: ["Task Router", "任务路由"],
      description: t("app.skills.templates.taskRouter.description"),
      triggerHint: t("app.skills.templates.taskRouter.trigger"),
      instructions: t("app.skills.templates.taskRouter.instructions"),
      category: "workflow",
    },
  ];
}

export function buildTemplateNameMap(templates) {
  return new Map(
    templates.flatMap((template) =>
      [template.name, ...(template.aliases || [])].map((alias) => [
        normalizeName(alias),
        template,
      ])
    )
  );
}

export function buildSkillDisplay(skill, templateNameMap) {
  const starterTemplate = templateNameMap.get(normalizeName(skill?.name));
  if (!starterTemplate) {
    return {
      ...skill,
      name: skill?.name || "",
      description: skill?.description || "",
      triggerHint: skill?.triggerHint || "",
      instructions: skill?.instructions || "",
      summary: skill?.summary || skill?.description || "",
    };
  }

  return {
    ...skill,
    name: starterTemplate.name,
    description: starterTemplate.description,
    triggerHint: starterTemplate.triggerHint,
    instructions: starterTemplate.instructions,
    summary: starterTemplate.description,
  };
}

export function buildDraftDisplay(skillDraft, activeSkill, starterTemplate) {
  if (!starterTemplate || !activeSkill) {
    return skillDraft;
  }

  return {
    ...skillDraft,
    name: displayTemplateField(skillDraft.name, activeSkill.name, starterTemplate.name),
    description: displayTemplateField(
      skillDraft.description,
      activeSkill.description,
      starterTemplate.description
    ),
    instructions: displayTemplateField(
      skillDraft.instructions,
      activeSkill.instructions,
      starterTemplate.instructions
    ),
    triggerHint: displayTemplateField(
      skillDraft.triggerHint,
      activeSkill.triggerHint,
      starterTemplate.triggerHint
    ),
  };
}

export function getSkillMeta(skill, mountedSkillSet, templateNameMap, t) {
  const starterTemplate = templateNameMap.get(normalizeName(skill.name));
  return {
    mounted: mountedSkillSet.has(skill.id),
    starterTemplate: starterTemplate || null,
    sourceLabel: starterTemplate ? t("app.skills.source.starter") : t("app.skills.source.workspace"),
    categoryLabel: starterTemplate
      ? t(`app.skills.category.${starterTemplate.category}`)
      : t(`app.skills.category.${inferCategory(skill)}`),
  };
}

export function isStarterSkill(skill, templateNameMap) {
  return templateNameMap.has(normalizeName(skill.name));
}

export function findInstalledStarterSkill(template, skillList) {
  const aliases = new Set(
    [template.name, ...(template.aliases || [])].map((name) => normalizeName(name))
  );
  return skillList.find((skill) => aliases.has(normalizeName(skill.name)));
}

export function normalizeStarterTemplates(templates) {
  return templates.map((template) => ({
    ...template,
    aliases: [...new Set([...(template.aliases || []), ...(STARTER_TEMPLATE_ALIAS_FIXUPS[template.id] || [])])],
  }));
}

export function formatSkillDate(value, lang) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleDateString(lang, {
    month: "short",
    day: "numeric",
  });
}

export function formatSkillDateTime(value, lang) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString(lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toHistoryReasonKey(reason) {
  if (reason === "ai-rewrite") {
    return "aiRewrite";
  }
  if (reason === "restore") {
    return "restore";
  }
  return "manualSave";
}

function displayTemplateField(draftValue, activeValue, localizedValue) {
  if (String(draftValue || "") === String(activeValue || "") && localizedValue) {
    return localizedValue;
  }
  return draftValue || "";
}

function inferCategory(skill) {
  const haystack = [skill.name, skill.summary, skill.triggerHint].join(" ").toLowerCase();
  if (/(note|memory|knowledge|context|recall|gallery|album|photo|caption)/.test(haystack)) {
    return "memory";
  }
  if (/(ui|design|frontend|css|layout|motion)/.test(haystack)) {
    return "ui";
  }
  if (/(release|safe|risk|guard|migrate|destructive|security|settings|cache|provider|config)/.test(haystack)) {
    return "safety";
  }
  if (/(research|source|cite|docs|verify|weather|forecast)/.test(haystack)) {
    return "research";
  }
  return "workflow";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}
