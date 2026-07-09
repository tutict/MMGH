import React, { useDeferredValue, useMemo } from "react";
import { useI18n } from "../i18n";
import { AppButton, AppMenuItem, AppTextField } from "./ui";
import {
  countOpenReminders,
  filterReminders,
  groupReminders,
} from "./reminderWorkspaceModel";

function ReminderWorkspace({
  busy,
  clockNow,
  handleCreateReminder,
  handleDeleteReminder,
  handleOpenLinkedNote,
  handleSaveReminder,
  hasUnsavedReminder,
  loading,
  noteList,
  reminderDraft,
  reminderSearch,
  reminders,
  selectedReminderId,
  setReminderDraft,
  setReminderSearch,
  setSelectedReminderId,
}) {
  const { lang, t } = useI18n();
  const deferredReminderSearch = useDeferredValue(reminderSearch);
  const reminderDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lang]
  );

  const filteredReminders = useMemo(
    () => filterReminders(reminders, noteList, deferredReminderSearch),
    [deferredReminderSearch, noteList, reminders]
  );

  const groups = useMemo(
    () =>
      groupReminders(filteredReminders, clockNow, (key) =>
        t(`app.reminders.bucket.${key}`)
      ),
    [clockNow, filteredReminders, t]
  );
  const openCount = useMemo(() => countOpenReminders(reminders), [reminders]);
  const dueTodayCount = groups.find((group) => group.key === "today")?.items.length || 0;
  const doneCount = groups.find((group) => group.key === "done")?.items.length || 0;

  return (
    <section className="reminder-panel panel-surface">
      <div className="reminder-sidebar">
        <div className="reminder-sidebar__intro">
          <div className="section-head reminder-sidebar__head">
            <div>
              <span className="eyebrow">{t("app.reminders.eyebrow")}</span>
              <h3>{t("app.reminders.title")}</h3>
            </div>
            <AppButton
              className="solid-button"
              onClick={handleCreateReminder}
              disabled={busy !== "" || loading}
            >
              {t("app.reminders.newReminder")}
            </AppButton>
          </div>

          <div className="reminder-sidebar__summary">
            <article className="reminder-summary-card">
              <span>{t("app.view.reminders.badge.open")}</span>
              <strong>{openCount}</strong>
            </article>
            <article className="reminder-summary-card">
              <span>{t("app.view.reminders.badge.due")}</span>
              <strong>{dueTodayCount}</strong>
            </article>
            <article className="reminder-summary-card">
              <span>{t("app.reminders.status.done")}</span>
              <strong>{doneCount}</strong>
            </article>
          </div>
        </div>

        <div className="reminder-clock-card">
          <strong>{formatClock(clockNow, lang)}</strong>
          <span>{formatClockDate(clockNow, lang)}</span>
        </div>

        <AppTextField
          value={reminderSearch}
          onChange={(event) => setReminderSearch(event.target.value)}
          placeholder={t("app.reminders.search")}
          size="small"
          fullWidth
        />

        <div className="reminder-group-list">
          {groups.map((group) => (
            <section key={group.key} className="reminder-group">
              <div className="reminder-group__head">
                <span>{group.title}</span>
                <span>{group.items.length}</span>
              </div>
              <div className="reminder-card-list">
                {group.items.length > 0 ? (
                  group.items.map((item) => {
                    const linkedNote =
                      noteList.find((note) => note.id === item.linkedNoteId) || null;
                    return (
                      <AppButton
                        key={item.id}
                        className={`reminder-card ${
                          item.id === selectedReminderId ? "is-active" : ""
                        }`}
                        disabled={busy !== "" || loading}
                        onClick={() => setSelectedReminderId(item.id)}
                      >
                        <div className="reminder-card__head">
                          <strong>{item.title}</strong>
                          <span className={`priority-pill priority-${item.severity}`}>
                            {t(`app.reminders.severity.${item.severity}`)}
                          </span>
                        </div>
                        <p>{item.preview}</p>
                        <div className="reminder-card__meta">
                          <span>
                            {item.dueAt
                              ? reminderDateFormatter.format(item.dueAt)
                              : t("app.reminders.noDueDate")}
                          </span>
                          <span>{t(`app.reminders.status.${item.status === "done" ? "done" : "open"}`)}</span>
                        </div>
                        {linkedNote ? (
                          <span className="reminder-card__link">
                            {t("app.reminders.linked", { title: linkedNote.title })}
                          </span>
                        ) : null}
                      </AppButton>
                    );
                  })
                ) : (
                  <div className="reminder-empty-group">{t("app.reminders.emptyBucket")}</div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="reminder-editor">
        <div className="reminder-editor__toolbar">
          <div className="knowledge-editor__stamp">
            <span className="eyebrow">{t("app.reminders.editor.eyebrow")}</span>
            <p>{t("app.reminders.editor.description")}</p>
          </div>
          <div className="knowledge-editor__actions">
            <AppButton
              className="ghost-button"
              onClick={handleDeleteReminder}
              disabled={!reminderDraft.id || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </AppButton>
            <AppButton
              className="solid-button"
              onClick={handleSaveReminder}
              disabled={!reminderDraft.id || !hasUnsavedReminder || busy !== "" || loading}
            >
              {busy === "save-reminder" ? t("app.common.saving") : t("app.reminders.save")}
            </AppButton>
          </div>
        </div>

        {reminderDraft.id ? (
          <div className="reminder-editor__form">
            <div className="reminder-editor__hero">
              <div className={`reminder-editor__hero-priority priority-${reminderDraft.severity}`} />
              <div className="reminder-editor__hero-copy">
                <span className="eyebrow">{t("app.reminders.editor.eyebrow")}</span>
                <strong>{reminderDraft.title || t("app.reminders.newReminder")}</strong>
                <p>{t("app.reminders.editor.description")}</p>
              </div>
            </div>
            <label className="settings-form__row">
              <span>{t("app.reminders.form.title")}</span>
              <AppTextField
                value={reminderDraft.title}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                placeholder={t("app.reminders.form.titlePlaceholder")}
                size="small"
                fullWidth
              />
            </label>

            <div className="reminder-editor__grid">
              <label className="settings-form__row">
                <span>{t("app.reminders.form.dueTime")}</span>
                <AppTextField
                  type="datetime-local"
                  value={reminderDraft.dueAt}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      dueAt: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </label>

              <label className="settings-form__row">
                <span>{t("app.reminders.form.severity")}</span>
                <AppTextField
                  value={reminderDraft.severity}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      severity: event.target.value,
                    }))
                  }
                  select
                  size="small"
                  fullWidth
                >
                  <AppMenuItem value="low">{t("app.reminders.severity.low")}</AppMenuItem>
                  <AppMenuItem value="medium">{t("app.reminders.severity.medium")}</AppMenuItem>
                  <AppMenuItem value="high">{t("app.reminders.severity.high")}</AppMenuItem>
                  <AppMenuItem value="critical">{t("app.reminders.severity.critical")}</AppMenuItem>
                </AppTextField>
              </label>

              <label className="settings-form__row">
                <span>{t("app.reminders.form.status")}</span>
                <AppTextField
                  value={reminderDraft.status}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  select
                  size="small"
                  fullWidth
                >
                  <AppMenuItem value="scheduled">{t("app.reminders.status.scheduled")}</AppMenuItem>
                  <AppMenuItem value="done">{t("app.reminders.status.done")}</AppMenuItem>
                </AppTextField>
              </label>

              <label className="settings-form__row">
                <span>{t("app.reminders.form.linkedNote")}</span>
                <AppTextField
                  value={reminderDraft.linkedNoteId}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      linkedNoteId: event.target.value,
                    }))
                  }
                  select
                  size="small"
                  fullWidth
                >
                  <AppMenuItem value="">{t("app.reminders.form.noLinkedNote")}</AppMenuItem>
                  {noteList.map((note) => (
                    <AppMenuItem key={note.id} value={note.id}>
                      {note.title}
                    </AppMenuItem>
                  ))}
                </AppTextField>
              </label>
            </div>

            <label className="settings-form__row">
              <span>{t("app.reminders.form.note")}</span>
              <AppTextField
                className="knowledge-body-input reminder-detail-input"
                value={reminderDraft.detail}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    detail: event.target.value,
                  }))
                }
                placeholder={t("app.reminders.form.notePlaceholder")}
                multiline
                minRows={6}
                fullWidth
              />
            </label>

            {reminderDraft.linkedNoteId ? (
              <div className="reminder-linked-note">
                <span className="section-note">
                  {t("app.reminders.linkedTo")}{" "}
                  {noteList.find((note) => String(note.id) === String(reminderDraft.linkedNoteId))
                    ?.title || t("app.reminders.note")}
                </span>
                <AppButton
                  className="ghost-button"
                  onClick={() => handleOpenLinkedNote(Number(reminderDraft.linkedNoteId))}
                >
                  {t("app.reminders.openNote")}
                </AppButton>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="gallery-empty reminder-empty-state">
            <span className="eyebrow">{t("app.reminders.title")}</span>
            <h3>{t("app.reminders.emptyState.title")}</h3>
            <p>{t("app.reminders.emptyState.description")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatClock(value, lang) {
  return new Date(value).toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatClockDate(value, lang) {
  return new Date(value).toLocaleDateString(lang, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default ReminderWorkspace;
