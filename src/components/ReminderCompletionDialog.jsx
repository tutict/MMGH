import React from "react";
import { useI18n } from "../i18n";

function ReminderCompletionDialog({ busy, draft, noteList, onClose, onSubmit, panelRef, setDraft }) {
  const { t } = useI18n();
  const linkedNote =
    noteList.find((note) => String(note.id) === String(draft.linkedNoteId || "")) || null;
  const linkedNoteTitle = linkedNote?.title || "";

  return (
    <div className="completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-dialog-title">
      <button
        type="button"
        className="completion-dialog__scrim"
        onClick={onClose}
        aria-label={t("app.common.close")}
      />
      <section ref={panelRef} className="completion-dialog__panel panel-surface" tabIndex={-1}>
        <div className="completion-dialog__head">
          <div className="completion-dialog__copy">
            <span className="eyebrow">{t("app.today.review.eyebrow")}</span>
            <h3 id="completion-dialog-title">{t("app.today.review.title")}</h3>
            <p>{t("app.today.review.description")}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            {t("app.common.close")}
          </button>
        </div>

        <div className="completion-dialog__subject">
          <span className="section-note">{t("app.today.review.subject")}</span>
          <strong>{draft.reminderTitle || t("app.reminders.defaultTitle")}</strong>
          <span className="section-note">
            {linkedNoteTitle
              ? t("app.today.review.linkedNote", { title: linkedNoteTitle })
              : t("app.today.review.newNote")}
          </span>
        </div>

        <label className="settings-form__row">
          <span>{t("app.today.review.result")}</span>
          <textarea
            className="field-area completion-dialog__textarea"
            value={draft.result}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                result: event.target.value,
              }))
            }
            placeholder={t("app.today.review.resultPlaceholder")}
          />
        </label>

        <div className="completion-dialog__toggles">
          <label className="completion-dialog__toggle">
            <input
              type="checkbox"
              checked={draft.saveToNote}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  saveToNote: event.target.checked,
                }))
              }
            />
            <span>{t("app.today.review.saveToNote")}</span>
          </label>
          <label className="completion-dialog__toggle">
            <input
              type="checkbox"
              checked={draft.createFollowUp}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  createFollowUp: event.target.checked,
                }))
              }
            />
            <span>{t("app.today.review.createFollowUp")}</span>
          </label>
        </div>

        {draft.createFollowUp ? (
          <div className="completion-dialog__grid">
            <label className="settings-form__row">
              <span>{t("app.today.review.followUpTitle")}</span>
              <input
                className="field-input"
                value={draft.followUpTitle}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUpTitle: event.target.value,
                  }))
                }
              />
            </label>
            <label className="settings-form__row">
              <span>{t("app.today.review.followUpDueAt")}</span>
              <input
                className="field-input"
                type="datetime-local"
                value={draft.followUpDueAt}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUpDueAt: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        <div className="completion-dialog__actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            {t("app.common.cancel")}
          </button>
          <button
            type="button"
            className="solid-button"
            onClick={onSubmit}
            disabled={busy !== "" && busy !== "complete-reminder"}
          >
            {busy === "complete-reminder"
              ? t("app.common.saving")
              : t("app.today.review.submit")}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ReminderCompletionDialog;
