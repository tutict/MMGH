import { useState } from "react";
import { MobileButton, MobilePage } from "../ui";

const TOOLS = ["session", "generate", "history", "templates"];

export default function MobileSkillsView({
  activeSkill,
  busy = "",
  handleCreateSkill,
  handleDeleteSkill,
  handleForgeSkill,
  handleOpenSkill,
  handleSaveSkill,
  handleToggleSkillMounted,
  loading = false,
  mountedSkillIds = [],
  setSkillDraft,
  skillDraft,
  skillList = [],
  t,
}: Record<string, any>) {
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState("session");
  const [prompt, setPrompt] = useState("");
  if (editing && activeSkill) {
    return (
      <MobilePage view="skills">
        <form className="mobile-editor" onSubmit={(event) => { event.preventDefault(); handleSaveSkill?.(); }}>
          <MobileButton variant="text" onClick={() => setEditing(false)}>{t?.("app.common.close") || "Back"}</MobileButton>
          <input aria-label={t?.("app.skills.form.name") || "Name"} value={skillDraft?.name || ""} onChange={(event) => setSkillDraft?.((prev) => ({ ...prev, name: event.target.value }))} />
          <textarea aria-label={t?.("app.skills.form.instructions") || "Instructions"} value={skillDraft?.instructions || ""} onChange={(event) => setSkillDraft?.((prev) => ({ ...prev, instructions: event.target.value }))} />
          <MobileButton type="submit" variant="contained">{t?.("app.skills.save") || "Save"}</MobileButton>
          <MobileButton variant="text" onClick={handleDeleteSkill}>{t?.("app.common.delete") || "Delete"}</MobileButton>
          <MobileButton variant="text" onClick={() => handleToggleSkillMounted?.(activeSkill.id)}>
            {mountedSkillIds.includes(activeSkill.id) ? "Mounted" : "Mount"}
          </MobileButton>
        </form>
      </MobilePage>
    );
  }
  return (
    <MobilePage view="skills">
      <div className="mobile-segmented" role="group" aria-label={t?.("app.skills.tools.label") || "Tools"}>
        {TOOLS.map((mode) => (
          <MobileButton key={mode} variant="text" aria-pressed={tool === mode} onClick={() => setTool(mode)}>
            {t?.(`app.skills.tools.${mode}`) || mode}
          </MobileButton>
        ))}
      </div>
      {tool === "generate" ? (
        <form className="mobile-editor" onSubmit={(event) => { event.preventDefault(); handleForgeSkill?.({ prompt, mode: "generate" }); }}>
          <textarea aria-label={t?.("app.skills.forge.title") || "Generate"} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <MobileButton type="submit" variant="contained" disabled={busy !== "" || loading}>{t?.("app.skills.forge.title") || "Generate"}</MobileButton>
        </form>
      ) : (
        <div className="mobile-editor">
          <MobileButton variant="contained" onClick={handleCreateSkill}>{t?.("app.skills.newSkill") || "New"}</MobileButton>
          {skillList.map((skill) => (
            <MobileButton key={skill.id} variant="text" onClick={() => { handleOpenSkill?.(skill.id); setEditing(true); }}>
              {skill.name}
            </MobileButton>
          ))}
        </div>
      )}
    </MobilePage>
  );
}
