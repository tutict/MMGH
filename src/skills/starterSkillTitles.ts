type SkillTitleSource = {
  name?: string | null;
};

type Translate = (key: string) => string;

const STARTER_SKILL_TITLE_KEYS = [
  {
    key: "app.skills.templates.noteRecall.name",
    names: ["Note Recall", "\u7b14\u8bb0\u53ec\u56de", "\u7b14\u8bb0\u4f18\u5148", "Local note recall"],
  },
  {
    key: "app.skills.templates.knowledgeLibrarian.name",
    names: ["Knowledge Librarian", "\u77e5\u8bc6\u6574\u7406\u5458", "\u6574\u7406\u7b14\u8bb0"],
  },
  {
    key: "app.skills.templates.reminderRadar.name",
    names: ["Reminder Radar", "\u63d0\u9192\u96f7\u8fbe", "\u6574\u7406\u63d0\u9192"],
  },
  {
    key: "app.skills.templates.weatherBrief.name",
    names: ["Weather Brief", "\u5929\u6c14\u7b80\u62a5", "\u5929\u6c14\u53c2\u8003"],
  },
  {
    key: "app.skills.templates.musicCompanion.name",
    names: ["Music Companion", "\u97f3\u4e50\u966a\u542c", "\u97f3\u4e50\u4f34\u542c", "\u97f3\u4e50\u5efa\u8bae"],
  },
  {
    key: "app.skills.templates.galleryCurator.name",
    names: ["Gallery Curator", "\u753b\u5eca\u7b56\u5c55", "\u6574\u7406\u56fe\u7247"],
  },
  {
    key: "app.skills.templates.settingsSteward.name",
    names: ["Settings Steward", "\u8bbe\u7f6e\u7ba1\u5bb6", "\u8bbe\u7f6e\u7ba1\u7406"],
  },
  {
    key: "app.skills.templates.releaseGuard.name",
    names: ["Release Guard", "\u53d1\u5e03\u5b88\u536b", "\u53d1\u5e03\u68c0\u67e5"],
  },
  {
    key: "app.skills.templates.uiPolish.name",
    names: ["UI Polish", "\u754c\u9762\u6253\u78e8"],
  },
  {
    key: "app.skills.templates.researchMode.name",
    names: ["Research Mode", "\u7814\u7a76\u6a21\u5f0f", "\u67e5\u8bc1\u6a21\u5f0f"],
  },
  {
    key: "app.skills.templates.taskRouter.name",
    names: ["Task Router", "\u4efb\u52a1\u8def\u7531", "\u4efb\u52a1\u62c6\u89e3"],
  },
] as const;

const STARTER_SKILL_TITLE_KEY_BY_NAME = new Map(
  STARTER_SKILL_TITLE_KEYS.flatMap((item) =>
    item.names.map((name) => [normalizeSkillNameForDisplay(name), item.key] as const)
  )
);

export function normalizeSkillNameForDisplay(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function resolveSkillDisplayTitle(
  skill: SkillTitleSource | null | undefined,
  translate: Translate
): string {
  const titleKey = STARTER_SKILL_TITLE_KEY_BY_NAME.get(normalizeSkillNameForDisplay(skill?.name));
  return titleKey ? translate(titleKey) : skill?.name || "";
}
