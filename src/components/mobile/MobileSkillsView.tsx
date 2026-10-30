import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { Switch } from "@mui/material";
import { useMemo, useState } from "react";
import {
  AppIconButton,
  MobileButton,
  MobileEmpty,
  MobileForm,
  MobileList,
  MobilePage,
  MobileRow,
  MobileTextField,
} from "../ui";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

export default function MobileSkillsView({
  activeSkill,
  busy = "",
  handleCreateSkill,
  handleDeleteSkill,
  handleForgeSkill,
  handleOpenSkill,
  handleSaveSkill,
  handleToggleSkillMounted,
  lang,
  loading = false,
  mountedSkillIds = [],
  setSkillDraft,
  skillDraft,
  skillList = [],
  t,
}: Record<string, any>) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const filteredSkills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return skillList;
    }
    return skillList.filter((skill) =>
      [skill.name, skill.summary, skill.triggerHint]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, skillList]);

  const openSkill = (skill) => {
    handleOpenSkill?.(skill.id);
    setEditorOpen(true);
  };

  const createSkill = async () => {
    await handleCreateSkill?.();
    setEditorOpen(true);
  };

  const deleteSkill = async () => {
    await handleDeleteSkill?.();
    setEditorOpen(false);
  };

  const submitGeneration = (event) => {
    event.preventDefault();
    handleForgeSkill?.({ prompt, mode: "generate" });
    setGenerateOpen(false);
  };

  return (
    <MobilePage view="skills">
      <div className="mobile-skill-toolbar">
        <MobileTextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t?.("app.skills.search") || "Search skills"}
          aria-label={t?.("app.skills.search") || "Search skills"}
          size="small"
          fullWidth
        />
        <AppIconButton
          className="mobile-note-add"
          onClick={() => void createSkill()}
          disabled={busy !== "" || loading}
          aria-label={t?.("app.skills.newSkill") || "New skill"}
        >
          <AddRoundedIcon fontSize="small" aria-hidden="true" />
        </AppIconButton>
        <AppIconButton
          className="mobile-note-add"
          onClick={() => setGenerateOpen(true)}
          disabled={busy !== "" || loading}
          aria-label={t?.("app.skills.forge.title") || "Generate"}
        >
          <AutoAwesomeRoundedIcon fontSize="small" aria-hidden="true" />
        </AppIconButton>
      </div>

      {skillList.length === 0 ? (
        <section className="mobile-empty-hero">
          <strong>{t?.("app.skills.centerTitle") || "Skill Library"}</strong>
          <p>{t?.("app.skills.editor.description")}</p>
          <MobileButton
            variant="contained"
            mobileAction="primary"
            onClick={() => void createSkill()}
            disabled={busy !== "" || loading}
          >
            {t?.("app.skills.newSkill") || "New skill"}
          </MobileButton>
        </section>
      ) : filteredSkills.length === 0 ? (
        <p className="mobile-empty">{mobileText(lang, "emptyList")}</p>
      ) : (
        <MobileList>
          {filteredSkills.map((skill) => {
            const isMounted = mountedSkillIds.includes(skill.id);
            return (
              <MobileRow key={skill.id}>
                <MobileButton
                  variant="text"
                  className="mobile-row__body"
                  onClick={() => openSkill(skill)}
                  disabled={busy !== "" || loading}
                >
                  <strong>{skill.name}</strong>
                  <span>{skill.summary || skill.triggerHint || t?.("app.skills.noTriggerHint")}</span>
                </MobileButton>
                <Switch
                  size="small"
                  checked={isMounted}
                  onChange={() => handleToggleSkillMounted?.(skill.id)}
                  disabled={busy !== "" || loading}
                  slotProps={{
                    input: {
                      "aria-label": `${t?.("app.skills.form.mountedOnSession") || "Mounted on session"} ${skill.name}`,
                    },
                  }}
                />
              </MobileRow>
            );
          })}
        </MobileList>
      )}

      <MobileSheet
        id="mobile-skill-editor"
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={skillDraft?.name || activeSkill?.name || t?.("app.skills.defaultTitle") || "New skill"}
        eyebrow={t?.("app.skills.eyebrow")}
        variant="full"
        actions={
          <>
            <MobileButton
              color="error"
              variant="text"
              mobileAction="danger"
              onClick={() => void deleteSkill()}
              disabled={!skillDraft?.id || busy !== "" || loading}
            >
              {t?.("app.common.delete") || "Delete"}
            </MobileButton>
            <MobileButton
              variant="contained"
              mobileAction="primary"
              onClick={handleSaveSkill}
              disabled={!skillDraft?.id || busy !== "" || loading}
            >
              {t?.("app.skills.save") || "Save skill"}
            </MobileButton>
          </>
        }
      >
        {skillDraft?.id ? (
          <MobileForm>
            <MobileTextField
              label={t?.("app.skills.form.name") || "Name"}
              value={skillDraft.name || ""}
              onChange={(event) => setSkillDraft?.((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t?.("app.skills.form.namePlaceholder")}
              size="small"
              fullWidth
            />
            <MobileTextField
              label={t?.("app.skills.form.description") || "Description"}
              value={skillDraft.description || ""}
              onChange={(event) => setSkillDraft?.((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t?.("app.skills.form.descriptionPlaceholder")}
              size="small"
              fullWidth
              multiline
              minRows={3}
            />
            <MobileTextField
              label={t?.("app.skills.form.triggerHint") || "Trigger"}
              value={skillDraft.triggerHint || ""}
              onChange={(event) => setSkillDraft?.((prev) => ({ ...prev, triggerHint: event.target.value }))}
              placeholder={t?.("app.skills.form.triggerHintPlaceholder")}
              size="small"
              fullWidth
            />
            <MobileTextField
              label={t?.("app.skills.form.instructions") || "Instructions"}
              value={skillDraft.instructions || ""}
              onChange={(event) => setSkillDraft?.((prev) => ({ ...prev, instructions: event.target.value }))}
              placeholder={t?.("app.skills.form.instructionsPlaceholder")}
              size="small"
              fullWidth
              multiline
              minRows={8}
            />
            <div className="mobile-field-note">
              <span>{t?.("app.skills.form.enabled") || "Enabled"}</span>
              <Switch
                size="small"
                checked={Boolean(skillDraft.enabled)}
                onChange={(event) =>
                  setSkillDraft?.((prev) => ({ ...prev, enabled: event.target.checked }))
                }
                slotProps={{ input: { "aria-label": t?.("app.skills.form.enabled") || "Enabled" } }}
              />
            </div>
          </MobileForm>
        ) : (
          <MobileEmpty>{t?.("app.common.loading") || "Loading..."}</MobileEmpty>
        )}
      </MobileSheet>

      <MobileSheet
        id="mobile-skill-generate"
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={t?.("app.skills.forge.title") || "Generate"}
        actions={
          <>
            <MobileButton variant="outlined" onClick={() => setGenerateOpen(false)}>
              {t?.("app.common.cancel") || "Cancel"}
            </MobileButton>
            <MobileButton
              type="submit"
              form="mobile-skill-generate-form"
              variant="contained"
              mobileAction="primary"
              disabled={busy !== "" || loading || !prompt.trim()}
            >
              {t?.("app.skills.forge.title") || "Generate"}
            </MobileButton>
          </>
        }
      >
        <MobileForm as="form" id="mobile-skill-generate-form" onSubmit={submitGeneration}>
          <MobileTextField
            label={t?.("app.skills.forge.title") || "Generate"}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t?.("app.skills.forge.placeholder")}
            size="small"
            fullWidth
            multiline
            minRows={4}
          />
        </MobileForm>
      </MobileSheet>
    </MobilePage>
  );
}
