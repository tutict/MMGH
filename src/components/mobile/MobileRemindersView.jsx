import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

function MobileRemindersView({
  busy,
  clockNow,
  handleCreateReminder,
  handleDeleteReminder,
  handleOpenLinkedNote,
  handleSaveReminder,
  handleSelectReminder,
  handleToggleTodayReminderStatus,
  hasUnsavedReminder,
  lang,
  loading,
  noteList = [],
  reminderDraft = {},
  reminderSearch = "",
  reminders = [],
  selectedReminderId,
  setReminderDraft,
  setReminderSearch,
  t,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [openAfterCreate, setOpenAfterCreate] = useState(false);
  const deferredSearch = useDeferredValue(reminderSearch);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lang]
  );

  const filteredReminders = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) {
      return reminders;
    }

    return reminders.filter((item) => {
      const linkedTitle = noteList.find((note) => note.id === item.linkedNoteId)?.title || "";
      return [item.title, item.preview, linkedTitle, item.severity, item.status]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [deferredSearch, noteList, reminders]);

  const groups = useMemo(
    () => groupMobileReminders(filteredReminders, clockNow, t),
    [clockNow, filteredReminders, t]
  );
  const openCount = useMemo(
    () => reminders.filter((item) => item.status !== "done").length,
    [reminders]
  );
  const todayCount = groups.find((group) => group.key === "today")?.items.length || 0;
  const doneCount = groups.find((group) => group.key === "done")?.items.length || 0;
  const selectedLinkedNote = noteList.find(
    (note) => String(note.id) === String(reminderDraft.linkedNoteId || "")
  );

  useEffect(() => {
    if (!openAfterCreate || !reminderDraft.id) {
      return;
    }

    setEditorOpen(true);
    setOpenAfterCreate(false);
  }, [openAfterCreate, reminderDraft.id]);

  const openReminderEditor = async (reminder) => {
    if (!reminder?.id) {
      return;
    }
    if (reminder.id === selectedReminderId) {
      setEditorOpen(true);
      return;
    }

    const opened = await handleSelectReminder(reminder.id);
    if (opened) {
      setEditorOpen(true);
    }
  };

  const createReminderAndOpen = async () => {
    await handleCreateReminder();
    setOpenAfterCreate(true);
  };

  const openLinkedNote = async () => {
    if (!reminderDraft.linkedNoteId) {
      return;
    }

    await handleOpenLinkedNote(Number(reminderDraft.linkedNoteId));
    setEditorOpen(false);
  };

  return (
    <section className="mobile-page mobile-page--reminders">
      <section className="mobile-section mobile-section--flush">
        <div className="mobile-section__head">
          <div>
            <span className="mobile-eyebrow">{t("app.reminders.eyebrow")}</span>
            <h1>{t("app.reminders.title")}</h1>
          </div>
          <button
            type="button"
            className="mobile-primary-action"
            onClick={() => void createReminderAndOpen()}
            disabled={busy !== "" || loading}
          >
            {t("app.reminders.newReminder")}
          </button>
        </div>

        <div className="mobile-summary-grid" aria-label={t("app.reminders.title")}>
          <article className="mobile-summary-cell">
            <span>{t("app.view.reminders.badge.open")}</span>
            <strong>{openCount}</strong>
          </article>
          <article className="mobile-summary-cell">
            <span>{t("app.view.reminders.badge.due")}</span>
            <strong>{todayCount}</strong>
          </article>
          <article className="mobile-summary-cell">
            <span>{t("app.reminders.status.done")}</span>
            <strong>{doneCount}</strong>
          </article>
        </div>

        <div className="mobile-search-row">
          <input
            value={reminderSearch}
            onChange={(event) => setReminderSearch(event.target.value)}
            placeholder={t("app.reminders.search")}
            aria-label={t("app.reminders.search")}
          />
        </div>
      </section>

      <section className="mobile-reminder-groups">
        {groups.map((group) => (
          <section key={group.key} className="mobile-section mobile-reminder-group">
            <div className="mobile-section__head mobile-section__head--line">
              <h2>{group.title}</h2>
              <span className="mobile-muted">{group.items.length}</span>
            </div>
            <div className="mobile-list">
              {group.items.length > 0 ? (
                group.items.map((item) => (
                  <ReminderRow
                    key={item.id}
                    busy={busy}
                    dateFormatter={dateFormatter}
                    handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
                    item={item}
                    loading={loading}
                    noteList={noteList}
                    onOpen={() => void openReminderEditor(item)}
                    selected={item.id === selectedReminderId}
                    t={t}
                  />
                ))
              ) : (
                <div className="mobile-empty">{t("app.reminders.emptyBucket")}</div>
              )}
            </div>
          </section>
        ))}
      </section>

      <MobileSheet
        id="mobile-reminder-editor-sheet"
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={reminderDraft.title || t("app.reminders.newReminder")}
        eyebrow={t("app.reminders.editor.eyebrow")}
        actions={
          <>
            <button
              type="button"
              className="mobile-danger-action"
              onClick={() => void handleDeleteReminder()}
              disabled={!reminderDraft.id || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </button>
            <button
              type="button"
              className="mobile-primary-action"
              onClick={handleSaveReminder}
              disabled={!reminderDraft.id || !hasUnsavedReminder || busy !== "" || loading}
            >
              {busy === "save-reminder" ? t("app.common.saving") : t("app.reminders.save")}
            </button>
          </>
        }
      >
        {reminderDraft.id ? (
          <div className="mobile-form mobile-reminder-form">
            <label>
              <span>{t("app.reminders.form.title")}</span>
              <input
                value={reminderDraft.title || ""}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                placeholder={t("app.reminders.form.titlePlaceholder")}
              />
            </label>

            <div className="mobile-form-grid">
              <label>
                <span>{t("app.reminders.form.dueTime")}</span>
                <input
                  type="datetime-local"
                  value={reminderDraft.dueAt || ""}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      dueAt: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>{t("app.reminders.form.severity")}</span>
                <select
                  value={reminderDraft.severity || "medium"}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      severity: event.target.value,
                    }))
                  }
                >
                  <option value="low">{t("app.reminders.severity.low")}</option>
                  <option value="medium">{t("app.reminders.severity.medium")}</option>
                  <option value="high">{t("app.reminders.severity.high")}</option>
                  <option value="critical">{t("app.reminders.severity.critical")}</option>
                </select>
              </label>

              <label>
                <span>{t("app.reminders.form.status")}</span>
                <select
                  value={reminderDraft.status || "scheduled"}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="scheduled">{t("app.reminders.status.scheduled")}</option>
                  <option value="done">{t("app.reminders.status.done")}</option>
                </select>
              </label>

              <label>
                <span>{t("app.reminders.form.linkedNote")}</span>
                <select
                  value={String(reminderDraft.linkedNoteId || "")}
                  onChange={(event) =>
                    setReminderDraft((prev) => ({
                      ...prev,
                      linkedNoteId: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("app.reminders.form.noLinkedNote")}</option>
                  {noteList.map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>{t("app.reminders.form.note")}</span>
              <textarea
                value={reminderDraft.detail || ""}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    detail: event.target.value,
                  }))
                }
                placeholder={t("app.reminders.form.notePlaceholder")}
              />
            </label>

            {reminderDraft.linkedNoteId ? (
              <div className="mobile-linked-note-row">
                <span>
                  {t("app.reminders.linkedTo")}{" "}
                  {selectedLinkedNote?.title || t("app.reminders.note")}
                </span>
                <button type="button" className="mobile-secondary-action" onClick={openLinkedNote}>
                  {t("app.reminders.openNote")}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mobile-empty">{t("app.reminders.emptyState.description")}</div>
        )}
      </MobileSheet>
    </section>
  );
}

function ReminderRow({
  busy,
  dateFormatter,
  handleToggleTodayReminderStatus,
  item,
  loading,
  noteList,
  onOpen,
  selected,
  t,
}) {
  const linkedNote = noteList.find((note) => note.id === item.linkedNoteId) || null;
  const dueLabel = item.dueAt ? formatReminderDue(item.dueAt, dateFormatter) : t("app.reminders.noDueDate");
  const statusKey = item.status === "done" ? "done" : "open";

  return (
    <div className={`mobile-row mobile-reminder-row ${selected ? "is-active" : ""}`}>
      <button
        type="button"
        className={`mobile-check ${item.status === "done" ? "is-done" : ""}`}
        onClick={() => void handleToggleTodayReminderStatus(item)}
        disabled={busy !== "" || loading}
        aria-label={`${t(`app.reminders.status.${statusKey}`)} ${item.title}`}
      >
        <span aria-hidden="true">{item.status === "done" ? "↺" : "✓"}</span>
      </button>
      <button
        type="button"
        className="mobile-row__body"
        onClick={onOpen}
        disabled={busy !== "" || loading}
      >
        <strong>{item.title || t("app.reminders.defaultTitle")}</strong>
        <span>{item.preview || t("app.reminders.emptyBucket")}</span>
        <span className="mobile-reminder-meta">
          <span>{dueLabel}</span>
          <span>{t(`app.reminders.severity.${item.severity || "medium"}`)}</span>
          <span>{t(`app.reminders.status.${statusKey}`)}</span>
        </span>
        {linkedNote ? <small>{t("app.reminders.linked", { title: linkedNote.title })}</small> : null}
      </button>
    </div>
  );
}

function groupMobileReminders(reminders, now, t) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const buckets = [
    { key: "overdue", title: t("app.reminders.bucket.overdue"), items: [] },
    { key: "today", title: t("app.reminders.bucket.today"), items: [] },
    { key: "upcoming", title: t("app.reminders.bucket.upcoming"), items: [] },
    { key: "done", title: t("app.reminders.bucket.done"), items: [] },
  ];

  reminders.forEach((item) => {
    if (item.status === "done") {
      buckets[3].items.push(item);
      return;
    }
    if (!item.dueAt) {
      buckets[2].items.push(item);
      return;
    }
    if (item.dueAt < todayStart.getTime()) {
      buckets[0].items.push(item);
      return;
    }
    if (item.dueAt < tomorrowStart.getTime()) {
      buckets[1].items.push(item);
      return;
    }
    buckets[2].items.push(item);
  });

  buckets.forEach((bucket) => {
    bucket.items.sort((left, right) => {
      if (!left.dueAt && !right.dueAt) {
        return right.updatedAt - left.updatedAt;
      }
      if (!left.dueAt) {
        return 1;
      }
      if (!right.dueAt) {
        return -1;
      }
      return left.dueAt - right.dueAt;
    });
  });

  return buckets;
}

function formatReminderDue(value, formatter) {
  try {
    return formatter.format(new Date(value));
  } catch {
    return String(value);
  }
}

export default MobileRemindersView;
