import { describe, expect, it } from "vitest";

import { normalizeSkillNameForDisplay, resolveSkillDisplayTitle } from "./starterSkillTitles";

describe("starter skill titles", () => {
  it("normalizes aliases before resolving the localized title", () => {
    expect(normalizeSkillNameForDisplay("  Note Recall  ")).toBe("note recall");
    expect(resolveSkillDisplayTitle({ name: "  NOTE RECALL " }, (key) => "translated:" + key)).toBe(
      "translated:app.skills.templates.noteRecall.name"
    );
  });

  it("keeps custom skill names unchanged", () => {
    expect(resolveSkillDisplayTitle({ name: "My Workflow" }, (key) => key)).toBe("My Workflow");
  });
});
