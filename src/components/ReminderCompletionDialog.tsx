import React from "react";
import { useI18n } from "../i18n";
import { AppButton, AppCheckbox, AppStatusChip, AppTextField } from "./ui";

function ReminderCompletionDialog({ busy, draft, noteList, onClose, onSubmit, panelRef, setDraft }) {
  const { t } = useI18n();
  const linkedNote =
    noteList.find((note) => String(note.id) === String(draft.linkedNoteId || "")) || null;
  const linkedNoteTitle = linkedNote?.title || "";

  return (
    <div className="completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-dialog-title">
      <AppButton
        className="completion-dialog__scrim"
        onClick={onClose}
        aria-label={t("app.common.close")}
        disableRipple
      />
      <section ref={panelRef} className="completion-dialog__panel panel-surface" tabIndex={-1}>
        <div className="completion-dialog__head">
          <div className="completion-dialog__copy">
            <span className="eyebrow">{t("app.today.review.eyebrow")}</span>
            <h3 id="completion-dialog-title">{t("app.today.review.title")}</h3>
            <p>{t("app.today.review.description")}</p>
          </div>
          <AppButton className="ghost-button" onClick={onClose}>
            {t("app.common.close")}
          </AppButton>
        </div>

        <div className="completion-dialog__subject">
          <span className="section-note">{t("app.today.review.subject")}</span>
          <strong>{draft.reminderTitle || t("app.reminders.defaultTitle")}</strong>
          <div className="completion-dialog__subject-meta">
            <span className="section-note">
              {linkedNoteTitle
                ? t("app.today.review.linkedNote", { title: linkedNoteTitle })
                : t("app.today.review.newNote")}
            </span>
            <AppStatusChip tone={draft.createFollowUp ? "running" : "completed"}>
              {draft.createFollowUp
                ? t("app.today.review.followUp")
                : t("app.today.review.noteMarker")}
            </AppStatusChip>
          </div>
        </div>

        <label className="settings-form__row">
          <span>{t("app.today.review.result")}</span>
          <AppTextField
            className="completion-dialog__textarea"
            value={draft.result}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                result: event.target.value,
              }))
            }
            placeholder={t("app.today.review.resultPlaceholder")}
            multiline
            minRows={4}
            fullWidth
          />
        </label>

        <div className="completion-dialog__toggles">
          <label className="completion-dialog__toggle">
            <AppCheckbox
              checked={draft.saveToNote}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  saveToNote: event.target.checked,
                }))
              }
            />
            <span className="completion-dialog__toggle-copy">
              <strong>{t("app.today.review.saveToNote")}</strong>
              <span className="section-note">
                {linkedNoteTitle
                  ? t("app.today.review.linkedNote", { title: linkedNoteTitle })
                  : t("app.today.review.newNote")}
              </span>
            </span>
          </label>
          <label className="completion-dialog__toggle">
            <AppCheckbox
              checked={draft.createFollowUp}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  createFollowUp: event.target.checked,
                }))
              }
            />
            <span className="completion-dialog__toggle-copy">
              <strong>{t("app.today.review.createFollowUp")}</strong>
              <span className="section-note">{t("app.today.review.followUpSeed", { title: draft.reminderTitle || t("app.reminders.defaultTitle") })}</span>
            </span>
          </label>
        </div>

        {draft.createFollowUp ? (
          <div className="completion-dialog__grid">
            <label className="settings-form__row">
              <span>{t("app.today.review.followUpTitle")}</span>
              <AppTextField
                value={draft.followUpTitle}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUpTitle: event.target.value,
                  }))
                }
                size="small"
                fullWidth
              />
            </label>
            <label className="settings-form__row">
              <span>{t("app.today.review.followUpDueAt")}</span>
              <AppTextField
                type="datetime-local"
                value={draft.followUpDueAt}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUpDueAt: event.target.value,
                  }))
                }
                size="small"
                fullWidth
              />
            </label>
          </div>
        ) : null}

        <div className="completion-dialog__actions">
          <AppButton className="ghost-button" onClick={onClose}>
            {t("app.common.cancel")}
          </AppButton>
          <AppButton
            className="solid-button"
            onClick={onSubmit}
            disabled={busy !== "" && busy !== "complete-reminder"}
          >
            {busy === "complete-reminder"
              ? t("app.common.saving")
              : t("app.today.review.submit")}
          </AppButton>
        </div>
      </section>
    </div>
  );
}

export default ReminderCompletionDialog;
