import React from "react";
import { useI18n } from "../i18n";
import { AppButton, AppStatusChip, AppTextField } from "./ui";

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
    <section className="notes-workbench">
      <div className="notes-workbench__layout">
      <aside className="notes-index">
        <div className="notes-index__header">
          <div className="notes-index__heading">
            <div>
              <span className="notes-eyebrow">{t("app.knowledge.eyebrow")}</span>
              <h3>{t("app.knowledge.title")}</h3>
            </div>
            <AppButton
              className="notes-button notes-button--primary"
              onClick={handleCreateNote}
              disabled={busy !== "" || loading}
            >
              {t("app.knowledge.newPage")}
            </AppButton>
          </div>
          <div className="notes-index__stats">
            <article className="notes-stat">
              <span>{t("app.stats.notes")}</span>
              <strong>{filteredNotes.length}</strong>
            </article>
            <article className="notes-stat notes-stat--wide">
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

        <div className="notes-search">
          <span className="notes-note">
            {t("app.stats.notes")}: {filteredNotes.length}
          </span>
          <AppTextField fieldClassName="notes-input"
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder={t("app.knowledge.search")}
            size="small"
            fullWidth
          />
        </div>

        <div className="notes-list">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <AppButton
                key={note.id}
                className={`notes-entry ${note.id === activeNoteId ? "notes-is-selected" : ""}`}
                aria-current={note.id === activeNoteId ? "true" : undefined}
                onClick={() => handleOpenNote(note.id)}
              >
                <div className="notes-entry__head">
                  <span className="notes-entry__icon">{note.icon || "*"}</span>
                  <div className="notes-entry__title-block">
                    <strong>{note.title}</strong>
                    <span>{formatTime(note.updatedAt, lang)}</span>
                  </div>
                </div>
                <p>{note.summary}</p>
                <div className="notes-entry__meta">
                  <span>{(note.tags || []).slice(0, 2).join(" | ") || t("app.knowledge.noTags")}</span>
                  <span>{t("app.knowledge.editor.eyebrow")}</span>
                </div>
              </AppButton>
            ))
          ) : (
            <div className="notes-empty">
              <strong>{t("app.common.empty")}</strong>
              <p>{t("app.knowledge.editor.description")}</p>
            </div>
          )}
        </div>
      </aside>

      <div className="notes-editor">
        <div className="notes-editor__toolbar">
          <div className="notes-editor__stamp">
            <span className="notes-eyebrow">{t("app.knowledge.editor.eyebrow")}</span>
            <p>{t("app.knowledge.editor.description")}</p>
          </div>
          <div className="notes-editor__actions">
            <AppButton
              className="notes-button notes-button--secondary"
              onClick={handleDeleteNote}
              disabled={!activeNote || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </AppButton>
            <AppButton
              className="notes-button notes-button--primary"
              onClick={handleSaveNote}
              disabled={!hasUnsavedNote || busy !== "" || loading}
            >
              {busy === "save-note" ? t("app.common.saving") : t("app.knowledge.savePage")}
            </AppButton>
          </div>
        </div>

        <div className="notes-editor__form">
          <div className="notes-editor__hero">
            <div className="notes-editor__hero-icon">{noteDraft.icon || "*"}</div>
            <div className="notes-editor__hero-copy">
              <div className="notes-editor__hero-meta">
                <span className="notes-eyebrow">{t("app.knowledge.editor.eyebrow")}</span>
                <AppStatusChip className="notes-badge" tone={hasUnsavedNote ? "warning" : "completed"}>
                  {t(hasUnsavedNote ? "app.common.dirty" : "app.common.saved")}
                </AppStatusChip>
              </div>
              <strong>{noteDraft.title || t("app.knowledge.defaultTitle")}</strong>
              <p>
                {activeNoteUpdatedAt
                  ? formatTime(activeNoteUpdatedAt, lang)
                  : t("app.knowledge.editor.description")}
              </p>
            </div>
          </div>
          <div className="notes-editor__title-row">
            <AppTextField fieldClassName="notes-input"
              className="notes-input--icon"
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
            <AppTextField fieldClassName="notes-input"
              className="notes-input--title"
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

          <AppTextField fieldClassName="notes-input"
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

          <AppTextField fieldClassName="notes-input"
            className="notes-input--body"
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
      </div>
    </section>
  );
}

export default KnowledgeVault;
