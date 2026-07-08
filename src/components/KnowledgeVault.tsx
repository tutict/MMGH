import AppTextField from "./ui/AppTextField";
import AppButton from "./ui/AppButton";
import React from "react";
import { useI18n } from "../i18n";

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
  const activeNoteUpdatedAt = activeNote?.updatedAt || 0;

  return (
    <section className="knowledge-panel panel-surface">
      <div className="knowledge-sidebar">
        <div className="knowledge-sidebar__intro">
          <div className="section-head knowledge-head">
            <div>
              <span className="eyebrow">{t("app.knowledge.eyebrow")}</span>
              <h3>{t("app.knowledge.title")}</h3>
            </div>
            <AppButton
              className="solid-button"
              onClick={handleCreateNote}
              disabled={busy !== "" || loading}
            >
              {t("app.knowledge.newPage")}
            </AppButton>
          </div>
          <div className="knowledge-sidebar__summary">
            <article className="knowledge-summary-card">
              <span>{t("app.stats.notes")}</span>
              <strong>{filteredNotes.length}</strong>
            </article>
            <article className="knowledge-summary-card knowledge-summary-card--wide">
              <span>{t("app.knowledge.editor.eyebrow")}</span>
              <strong>{activeNote?.title || t("app.knowledge.defaultTitle")}</strong>
              <p>
                {activeNoteUpdatedAt
                  ? formatTime(activeNoteUpdatedAt, lang)
                  : t("app.knowledge.editor.description")}
              </p>
            </article>
          </div>
        </div>

        <div className="knowledge-search-shell">
          <span className="section-note">
            {t("app.stats.notes")}: {filteredNotes.length}
          </span>
          <AppTextField
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder={t("app.knowledge.search")}
            size="small"
            fullWidth
          />
        </div>

        <div className="knowledge-note-list">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <AppButton
                key={note.id}
                className={`knowledge-note-card ${note.id === activeNoteId ? "is-active" : ""}`}
                onClick={() => handleOpenNote(note.id)}
              >
                <div className="knowledge-note-card__head">
                  <span className="knowledge-note-icon">{note.icon || "*"}</span>
                  <div className="knowledge-note-card__title-block">
                    <strong>{note.title}</strong>
                    <span>{formatTime(note.updatedAt, lang)}</span>
                  </div>
                </div>
                <p>{note.summary}</p>
                <div className="knowledge-note-card__meta">
                  <span>{(note.tags || []).slice(0, 2).join(" | ") || t("app.knowledge.noTags")}</span>
                  <span>{t("app.knowledge.editor.eyebrow")}</span>
                </div>
              </AppButton>
            ))
          ) : (
            <div className="knowledge-empty-state">
              <strong>{t("app.common.empty")}</strong>
              <p>{t("app.knowledge.editor.description")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="knowledge-editor">
        <div className="knowledge-editor__toolbar">
          <div className="knowledge-editor__stamp">
            <span className="eyebrow">{t("app.knowledge.editor.eyebrow")}</span>
            <p>{t("app.knowledge.editor.description")}</p>
          </div>
          <div className="knowledge-editor__actions">
            <AppButton
              className="ghost-button"
              onClick={handleDeleteNote}
              disabled={!activeNote || busy !== "" || loading}
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

        <div className="knowledge-editor__form">
          <div className="knowledge-editor__hero">
            <div className="knowledge-editor__hero-icon">{noteDraft.icon || "*"}</div>
            <div className="knowledge-editor__hero-copy">
              <div className="knowledge-editor__hero-meta">
                <span className="eyebrow">{t("app.knowledge.editor.eyebrow")}</span>
                <span className={`status-chip status-${hasUnsavedNote ? "warning" : "completed"}`}>
                  {t(hasUnsavedNote ? "app.common.dirty" : "app.common.saved")}
                </span>
              </div>
              <strong>{noteDraft.title || t("app.knowledge.defaultTitle")}</strong>
              <p>
                {activeNoteUpdatedAt
                  ? formatTime(activeNoteUpdatedAt, lang)
                  : t("app.knowledge.editor.description")}
              </p>
            </div>
          </div>
          <div className="knowledge-editor__title-row">
            <AppTextField
              className="knowledge-icon-input"
              value={noteDraft.icon}
              slotProps={{ htmlInput: { maxLength: 2 } }}
              onChange={(event) =>
                setNoteDraft((prev) => ({
                  ...prev,
                  icon: event.target.value,
                }))
              }
              size="small"
            />
            <AppTextField
              className="knowledge-title-input"
              value={noteDraft.title}
              onChange={(event) =>
                setNoteDraft((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              placeholder={t("app.knowledge.defaultTitle")}
              size="small"
              fullWidth
            />
          </div>

          <AppTextField
            value={noteDraft.tagsText}
            onChange={(event) =>
              setNoteDraft((prev) => ({
                ...prev,
                tagsText: event.target.value,
              }))
            }
            placeholder={t("app.knowledge.tags")}
            size="small"
            fullWidth
          />

          <AppTextField
            className="knowledge-body-input"
            value={noteDraft.body}
            onChange={(event) =>
              setNoteDraft((prev) => ({
                ...prev,
                body: event.target.value,
              }))
            }
            placeholder={t("app.knowledge.bodyPlaceholder")}
            multiline
            minRows={10}
            fullWidth
          />
        </div>
      </div>
    </section>
  );
}

export default KnowledgeVault;
