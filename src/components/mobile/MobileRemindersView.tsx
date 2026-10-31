import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  filterReminders,
  groupReminders,
} from "../reminderWorkspaceModel";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import { AppMenuItem, MobileTextField, MobileButton, MobileCheckButton, MobileEmpty, MobileForm, MobileFormGrid, MobileList, MobilePage, MobileRow, MobileSearchRow, MobileSection, MobileSectionHead } from "../ui";

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
}: Record<string, any>) {
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

  const filteredReminders = useMemo(
    () => filterReminders(reminders, noteList, deferredSearch),
    [deferredSearch, noteList, reminders]
  );

  const groups = useMemo(
    () =>
      groupReminders(filteredReminders, clockNow, (key) =>
        t(`app.reminders.bucket.${key}`)
      ),
    [clockNow, filteredReminders, t]
  );
  const populatedGroups = groups.filter((group) => group.items.length > 0);
  const hasReminders = reminders.length > 0;
  const hasMatches = filteredReminders.length > 0;
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
    <MobilePage view="reminders">
      <div className="mobile-toolbar mobile-reminders__toolbar">
        <MobileButton
          variant="contained"
          mobileAction="primary"
          onClick={() => void createReminderAndOpen()}
          disabled={busy !== "" || loading}
        >
          {t("app.reminders.newReminder")}
        </MobileButton>
        {reminders.length > 2 ? (
          <MobileSearchRow>
            <MobileTextField
              value={reminderSearch}
              onChange={(event) => setReminderSearch(event.target.value)}
              placeholder={t("app.reminders.search")}
              aria-label={t("app.reminders.search")}
              fullWidth
              size="small"
            />
          </MobileSearchRow>
        ) : null}
      </div>

      {!hasReminders ? (
        <section className="mobile-empty-hero">
          <strong>{mobileText(lang, "emptyReminders")}</strong>
          <p>{mobileText(lang, "emptyRemindersHint")}</p>
        </section>
      ) : hasMatches ? (
        <section className="mobile-reminder-groups">
          {populatedGroups.map((group) => (
            <MobileSection key={group.key} className="mobile-reminder-group">
              <MobileSectionHead line>
                <h2>{group.title}</h2>
                <span className="mobile-section__count">{group.items.length}</span>
              </MobileSectionHead>
              <MobileList>
                {group.items.map((item) => (
                  <ReminderRow
                    key={item.id}
                    busy={busy}
                    dateFormatter={dateFormatter}
                    handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
                    item={item}
                    loading={loading}
                    onOpen={() => void openReminderEditor(item)}
                    selected={item.id === selectedReminderId}
                    t={t}
                  />
                ))}
              </MobileList>
            </MobileSection>
          ))}
        </section>
      ) : (
        <section className="mobile-empty-hero">
          <strong>{mobileText(lang, "emptyRemindersSearch")}</strong>
        </section>
      )}

      <MobileSheet
        id="mobile-reminder-editor-sheet"
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={reminderDraft.title || t("app.reminders.newReminder")}
        eyebrow={t("app.reminders.editor.eyebrow")}
        actions={
          <>
            <MobileButton
              color="error"
              variant="text"
              mobileAction="danger"
              onClick={() => void handleDeleteReminder()}
              disabled={!reminderDraft.id || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </MobileButton>
            <MobileButton
              variant="contained"
              mobileAction="primary"
              onClick={handleSaveReminder}
              disabled={!reminderDraft.id || !hasUnsavedReminder || busy !== "" || loading}
            >
              {busy === "save-reminder" ? t("app.common.saving") : t("app.reminders.save")}
            </MobileButton>
          </>
        }
      >
        {reminderDraft.id ? (
          <MobileForm>
            <MobileTextField
              label={t("app.reminders.form.title")}
              value={reminderDraft.title || ""}
              onChange={(event) =>
                setReminderDraft((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              placeholder={t("app.reminders.form.titlePlaceholder")}
              fullWidth
              size="small"
            />

            <MobileFormGrid>
              <MobileTextField
                label={t("app.reminders.form.dueTime")}
                type="datetime-local"
                value={reminderDraft.dueAt || ""}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    dueAt: event.target.value,
                  }))
                }
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <MobileTextField
                label={t("app.reminders.form.severity")}
                select
                value={reminderDraft.severity || "medium"}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    severity: event.target.value,
                  }))
                }
                fullWidth
                size="small"
              >
                <AppMenuItem value="low">{t("app.reminders.severity.low")}</AppMenuItem>
                <AppMenuItem value="medium">{t("app.reminders.severity.medium")}</AppMenuItem>
                <AppMenuItem value="high">{t("app.reminders.severity.high")}</AppMenuItem>
                <AppMenuItem value="critical">{t("app.reminders.severity.critical")}</AppMenuItem>
              </MobileTextField>

              <MobileTextField
                label={t("app.reminders.form.linkedNote")}
                select
                value={String(reminderDraft.linkedNoteId || "")}
                onChange={(event) =>
                  setReminderDraft((prev) => ({
                    ...prev,
                    linkedNoteId: event.target.value,
                  }))
                }
                fullWidth
                size="small"
              >
                <AppMenuItem value="">{t("app.reminders.form.noLinkedNote")}</AppMenuItem>
                {noteList.map((note) => (
                  <AppMenuItem key={note.id} value={note.id}>
                    {note.title}
                  </AppMenuItem>
                ))}
              </MobileTextField>
            </MobileFormGrid>

            <MobileTextField
              label={t("app.reminders.form.note")}
              value={reminderDraft.detail || ""}
              onChange={(event) =>
                setReminderDraft((prev) => ({
                  ...prev,
                  detail: event.target.value,
                }))
              }
              placeholder={t("app.reminders.form.notePlaceholder")}
              fullWidth
              multiline
              minRows={4}
              size="small"
            />

            {reminderDraft.linkedNoteId ? (
              <div className="mobile-linked-note-row">
                <span>
                  {t("app.reminders.linkedTo")} {" "}
                  {selectedLinkedNote?.title || t("app.reminders.note")}
                </span>
                <MobileButton
                  variant="outlined"
                  mobileAction="secondary"
                  onClick={openLinkedNote}
                >
                  {t("app.reminders.openNote")}
                </MobileButton>
              </div>
            ) : null}
          </MobileForm>
        ) : (
          <MobileEmpty as="div">{t("app.reminders.emptyState.description")}</MobileEmpty>
        )}
      </MobileSheet>
    </MobilePage>
  );
}

function ReminderRow({
  busy,
  dateFormatter,
  handleToggleTodayReminderStatus,
  item,
  loading,
  onOpen,
  selected,
  t,
}) {
  const dueLabel = item.dueAt ? formatReminderDue(item.dueAt, dateFormatter) : t("app.reminders.noDueDate");
  const statusKey = item.status === "done" ? "done" : "open";
  const meta = [dueLabel, t(`app.reminders.severity.${item.severity || "medium"}`)]
    .filter(Boolean)
    .join(" · ");

  return (
    <MobileRow variant="reminder" active={selected}>
      <MobileCheckButton
        type="button"
        checked={item.status === "done"}
        onClick={() => void handleToggleTodayReminderStatus(item)}
        disabled={busy !== "" || loading}
        aria-label={`${t(`app.reminders.status.${statusKey}`)} ${item.title}`}
      >
        <span aria-hidden="true">
          <CheckRoundedIcon fontSize="inherit" />
        </span>
      </MobileCheckButton>
      <MobileButton
        variant="text"
        className="mobile-row__body"
        onClick={onOpen}
        disabled={busy !== "" || loading}
      >
        <strong>{item.title || t("app.reminders.defaultTitle")}</strong>
        <span className="mobile-row__meta">{meta}</span>
      </MobileButton>
    </MobileRow>
  );
}

function formatReminderDue(value, formatter) {
  try {
    return formatter.format(new Date(value));
  } catch {
    return String(value);
  }
}

export default MobileRemindersView;
