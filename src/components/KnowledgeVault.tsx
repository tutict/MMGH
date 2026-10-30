import React from "react";
import { useI18n } from "../i18n";
import { AppButton, AppTextField } from "./ui";

function KnowledgeVault({
  activeNote,
  activeNoteId,
  busy,
  filteredNotes,
  formatTime,
  handleCreateNote,
  handleDeleteNote,
  handleOpenNote,
  handleSaveNote,
  loading,
  noteDraft,
  noteSearch,
  setNoteDraft,
  setNoteSearch,
  hasUnsavedNote,
}) {
  const { lang, t } = useI18n();

  return (
    <section className="desk-knowledge notes-workbench">
      <div className="notes-workbench__layout">
        <aside className="notes-index">
          <div className="notes-index__header">
            <span className="section-note">
              {t("app.stats.notes")} {filteredNotes.length}
            </span>
            <AppButton
              className="solid-button"
              onClick={handleCreateNote}
              disabled={busy !== "" || loading}
            >
              {t("app.knowledge.newPage")}
            </AppButton>
          </div>

          <AppTextField
            fieldClassName="notes-input"
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder={t("app.knowledge.search")}
            aria-label={t("app.knowledge.search")}
            size="small"
            fullWidth
          />

          <div className="notes-list">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <AppButton
                  key={note.id}
                  className={`notes-entry ${note.id === activeNoteId ? "is-selected" : ""}`}
                  aria-current={note.id === activeNoteId ? "true" : undefined}
                  onClick={() => handleOpenNote(note.id)}
                >
                  <div className="notes-entry__head">
                    <span className="notes-entry__icon" aria-hidden="true">
                      {note.icon || "*"}
                    </span>
                    <strong>{note.title}</strong>
                    <span className="notes-entry__time">{formatTime(note.updatedAt, lang)}</span>
                  </div>
                  {note.summary ? <p>{note.summary}</p> : null}
                </AppButton>
              ))
            ) : (
              <p className="desk-empty">{t("app.knowledge.editor.description")}</p>
            )}
          </div>
        </aside>

        <div className="notes-editor">
          {activeNote ? (
            <>
              <div className="notes-editor__toolbar">
                <span className="section-note">
                  {t(hasUnsavedNote ? "app.common.dirty" : "app.common.saved")}
                  {activeNote.updatedAt ? ` · ${formatTime(activeNote.updatedAt, lang)}` : ""}
                </span>
                <div className="notes-editor__actions">
                  <AppButton
                    className="ghost-button"
                    onClick={handleDeleteNote}
                    disabled={busy !== "" || loading}
                  >
                    {t("app.common.delete")}
                  </AppButton>
                  <AppButton
                    className="solid-button"
                    onClick={handleSaveNote}
                    disabled={!hasUnsavedNote || busy !== "" || loading}
                  >
                    {busy === "save-note" ? t("app.common.saving") : t("app.knowledge.savePage")}
                  </AppButton>
                </div>
              </div>

              <div className="notes-editor__form">
                <div className="notes-editor__title-row">
                  <AppTextField
                    fieldClassName="notes-input"
                    className="notes-input--icon"
                    value={noteDraft.icon}
                    slotProps={{
                      htmlInput: { maxLength: 2, "aria-label": t("app.knowledge.form.icon") },
                    }}
                    onChange={(event) =>
                      setNoteDraft((prev) => ({
                        ...prev,
                        icon: event.target.value,
                      }))
                    }
                    size="small"
                  />
                  <AppTextField
                    fieldClassName="notes-input"
                    className="notes-input--title"
                    value={noteDraft.title}
                    onChange={(event) =>
                      setNoteDraft((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder={t("app.knowledge.defaultTitle")}
                    slotProps={{
                      htmlInput: { "aria-label": t("app.knowledge.form.title") },
                    }}
                    size="small"
                    fullWidth
                  />
                </div>

                <AppTextField
                  fieldClassName="notes-input"
                  value={noteDraft.tagsText}
                  onChange={(event) =>
                    setNoteDraft((prev) => ({
                      ...prev,
                      tagsText: event.target.value,
                    }))
                  }
                  placeholder={t("app.knowledge.tags")}
                  slotProps={{
                    htmlInput: { "aria-label": t("app.knowledge.tags") },
                  }}
                  size="small"
                  fullWidth
                />

                <AppTextField
                  fieldClassName="notes-input"
                  className="notes-input--body"
                  value={noteDraft.body}
                  onChange={(event) =>
                    setNoteDraft((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                  placeholder={t("app.knowledge.bodyPlaceholder")}
                  slotProps={{
                    htmlInput: { "aria-label": t("app.knowledge.form.body") },
                  }}
                  multiline
                  minRows={12}
                  fullWidth
                />
              </div>
            </>
          ) : (
            <div className="desk-empty notes-editor__empty">
              <p>{t("app.knowledge.editor.description")}</p>
              <AppButton
                className="solid-button"
                onClick={handleCreateNote}
                disabled={busy !== "" || loading}
              >
                {t("app.knowledge.newPage")}
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default KnowledgeVault;
