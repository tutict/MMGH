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
  const allGroups = useMemo(
    () =>
      groupReminders(reminders, clockNow, (key) =>
        t(`app.reminders.bucket.${key}`)
      ),
    [clockNow, reminders, t]
  );
  const openCount = useMemo(() => countOpenReminders(reminders), [reminders]);
  const dueTodayCount = allGroups.find((group) => group.key === "today")?.items.length || 0;
  const doneCount = allGroups.find((group) => group.key === "done")?.items.length || 0;
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <section
      className={`desk-reminders reminder-panel ${
        reminders.length === 0 && !reminderDraft.id ? "is-empty" : ""
      }`}
    >
      <aside className="reminder-sidebar">
        <div className="reminder-sidebar__head">
          <h2>{t("app.reminders.title")}</h2>
          <AppButton
            className={reminderDraft.id ? "ghost-button" : "solid-button"}
            onClick={handleCreateReminder}
            disabled={busy !== "" || loading}
          >
            {t("app.reminders.newReminder")}
          </AppButton>
        </div>

        <AppTextField
          value={reminderSearch}
          onChange={(event) => setReminderSearch(event.target.value)}
          placeholder={t("app.reminders.search")}
          aria-label={t("app.reminders.search")}
          size="small"
          fullWidth
        />

        <dl className="reminder-stats">
          <div>
            <dt>{t("app.view.reminders.badge.open")}</dt>
            <dd>{openCount}</dd>
          </div>
          <div>
            <dt>{t("app.view.reminders.badge.due")}</dt>
            <dd>{dueTodayCount}</dd>
          </div>
          <div>
            <dt>{t("app.reminders.status.done")}</dt>
            <dd>{doneCount}</dd>
          </div>
        </dl>
      </aside>

      <div className="reminder-list-pane scroll-area">
        {visibleGroups.length > 0 ? (
          visibleGroups.map((group) => (
            <section key={group.key} className="reminder-group">
              <div className="reminder-group__head">
                <span>{group.title}</span>
                <span className="desk-count">{group.items.length}</span>
              </div>
              <div className="desk-list">
                {group.items.map((item) => {
                  const linkedNote =
                    noteList.find((note) => note.id === item.linkedNoteId) || null;
                  const isOverdue =
                    item.status !== "done" && Boolean(item.dueAt) && item.dueAt < clockNow;
                  return (
                    <AppButton
                      key={item.id}
                      className={`desk-row desk-row--button reminder-card ${
                        item.id === selectedReminderId ? "is-active" : ""
                      }`}
                      disabled={busy !== "" || loading}
                      onClick={() => setSelectedReminderId(item.id)}
                    >
                      <span
                        className={`desk-status-dot severity-${item.severity}`}
                        aria-hidden="true"
                      />
                      <span className="reminder-card__body">
                        <strong>{item.title}</strong>
                        <span className="desk-row__meta">
                          <span className={isOverdue ? "danger-copy" : undefined}>
                            {item.dueAt
                              ? reminderDateFormatter.format(item.dueAt)
                              : t("app.reminders.noDueDate")}
                          </span>
                          <span className="reminder-card__severity">
                            {t(`app.reminders.severity.${item.severity || "medium"}`)}
                          </span>
                          <span>
                            {linkedNote
                              ? t("app.reminders.linked", { title: linkedNote.title })
                              : item.preview || t("app.common.empty")}
                          </span>
                        </span>
                      </span>
                    </AppButton>
                  );
                })}
              </div>
            </section>
          ))
        ) : reminders.length > 0 ? (
          <p className="desk-empty">{t("app.reminders.emptyBucket")}</p>
        ) : (
          <div className="desk-empty reminder-empty-state">
            <strong>{t("app.reminders.emptyState.title")}</strong>
            <p>{t("app.reminders.emptyState.description")}</p>
          </div>
        )}
      </div>

      {reminderDraft.id ? (
        <div className="reminder-editor">
          <>
            <div className="reminder-editor__toolbar">
              <span className="section-note">
                {t(hasUnsavedReminder ? "app.common.dirty" : "app.common.saved")}
              </span>
              <div className="reminder-editor__actions">
                <AppButton
                  className="ghost-button"
                  onClick={handleDeleteReminder}
                  disabled={busy !== "" || loading}
                >
                  {t("app.common.delete")}
                </AppButton>
                <AppButton
                  className="solid-button"
                  onClick={handleSaveReminder}
                  disabled={!hasUnsavedReminder || busy !== "" || loading}
                >
                  {busy === "save-reminder" ? t("app.common.saving") : t("app.reminders.save")}
                </AppButton>
              </div>
            </div>

            <div className="reminder-editor__form">
              <label className="reminder-field">
                <span className="field-label">{t("app.reminders.form.title")}</span>
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
                <label className="reminder-field">
                  <span className="field-label">{t("app.reminders.form.dueTime")}</span>
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

                <label className="reminder-field">
                  <span className="field-label">{t("app.reminders.form.severity")}</span>
                  <AppTextField
                    value={reminderDraft.severity}
                    onChange={(event) =>
                      setReminderDraft((prev) => ({
                        ...prev,
                        severity: event.target.value,
                      }))
                    }
                    select
                    slotProps={{
                      select: {
                        SelectDisplayProps: {
                          "aria-label": t("app.reminders.form.severity"),
                        },
                      },
                    }}
                    size="small"
                    fullWidth
                  >
                    <AppMenuItem value="low">{t("app.reminders.severity.low")}</AppMenuItem>
                    <AppMenuItem value="medium">{t("app.reminders.severity.medium")}</AppMenuItem>
                    <AppMenuItem value="high">{t("app.reminders.severity.high")}</AppMenuItem>
                    <AppMenuItem value="critical">{t("app.reminders.severity.critical")}</AppMenuItem>
                  </AppTextField>
                </label>

                <label className="reminder-field">
                  <span className="field-label">{t("app.reminders.form.status")}</span>
                  <AppTextField
                    value={reminderDraft.status}
                    onChange={(event) =>
                      setReminderDraft((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    select
                    slotProps={{
                      select: {
                        SelectDisplayProps: {
                          "aria-label": t("app.reminders.form.status"),
                        },
                      },
                    }}
                    size="small"
                    fullWidth
                  >
                    <AppMenuItem value="scheduled">{t("app.reminders.status.scheduled")}</AppMenuItem>
                    <AppMenuItem value="done">{t("app.reminders.status.done")}</AppMenuItem>
                  </AppTextField>
                </label>

                <label className="reminder-field">
                  <span className="field-label">{t("app.reminders.form.linkedNote")}</span>
                  <AppTextField
                    value={reminderDraft.linkedNoteId}
                    onChange={(event) =>
                      setReminderDraft((prev) => ({
                        ...prev,
                        linkedNoteId: event.target.value,
                      }))
                    }
                    select
                    slotProps={{
                      select: {
                        SelectDisplayProps: {
                          "aria-label": t("app.reminders.form.linkedNote"),
                        },
                      },
                    }}
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

              <label className="reminder-field">
                <span className="field-label">{t("app.reminders.form.note")}</span>
                <AppTextField
                  className="reminder-detail-input"
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
          </>
        </div>
      ) : reminders.length > 0 ? (
        <div className="reminder-editor">
          <p className="desk-empty">{t("app.reminders.emptyState.title")}</p>
        </div>
      ) : null}
    </section>
  );
}

export default ReminderWorkspace;
