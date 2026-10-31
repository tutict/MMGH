import { useEffect, useRef } from "react";

const REMINDER_ALERT_SOUND_SRC = "/reply-pulse.mp3";
const MAX_REMINDER_TIMER_DELAY_MS = 60 * 60 * 1000;
// UI automation and manual review set this key (or the query flag) before the
// workspace loads so a due test reminder cannot steal focus or play audio.
export const REMINDER_ALERTS_DISABLED_STORAGE_KEY = "mmgh-reminder-alerts-disabled";
const REMINDER_ALERTS_DISABLED_QUERY_KEY = "disableReminderAlerts";

function reminderAlertsDisabled() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    if (window.localStorage.getItem(REMINDER_ALERTS_DISABLED_STORAGE_KEY) === "1") {
      return true;
    }
  } catch {
    // Storage can be unavailable; fall through to the query flag.
  }
  return new URLSearchParams(window.location.search).get(REMINDER_ALERTS_DISABLED_QUERY_KEY) === "1";
}

function createReminderAlertKey(reminder) {
  return `${reminder.id}:${reminder.dueAt}:${reminder.status}`;
}

function isOpenReminderWithDueTime(reminder) {
  return reminder?.status !== "done" && Number.isFinite(Number(reminder?.dueAt));
}

// A reminder that was already overdue when the workspace arrived must not hijack
// the first view. The comparison is anchored to that moment, so a reminder created
// during the session still alarms even when its due time already passed.
function existedBeforeWorkspace(reminder, workspaceReadyAt) {
  const createdAt = Number(reminder?.createdAt);
  if (!Number.isFinite(createdAt)) {
    return true;
  }
  return createdAt <= workspaceReadyAt;
}

function findDueReminder(reminders, now, triggeredReminderKeys) {
  return reminders.find((item) => {
    if (!isOpenReminderWithDueTime(item) || Number(item.dueAt) > now) {
      return false;
    }
    return !triggeredReminderKeys.has(createReminderAlertKey(item));
  });
}

function resolveNextReminderDelay(reminders, now, triggeredReminderKeys) {
  const nextDueAt = reminders.reduce((nextValue, item) => {
    if (!isOpenReminderWithDueTime(item) || triggeredReminderKeys.has(createReminderAlertKey(item))) {
      return nextValue;
    }
    const dueAt = Number(item.dueAt);
    if (dueAt <= now) {
      return now;
    }
    return Math.min(nextValue, dueAt);
  }, Number.POSITIVE_INFINITY);
  if (!Number.isFinite(nextDueAt)) {
    return null;
  }
  return Math.min(Math.max(nextDueAt - now, 0), MAX_REMINDER_TIMER_DELAY_MS);
}

function playReminderTone(audioRef) {
  if (typeof window === "undefined") {
    return;
  }
  if (!audioRef.current) {
    audioRef.current = new Audio(REMINDER_ALERT_SOUND_SRC);
    audioRef.current.preload = "auto";
  }
  const audio = audioRef.current;
  try {
    audio.currentTime = 0;
  } catch (error) {
    console.error("Failed to rewind reminder tone", error);
  }
  void audio.play().catch(() => {});
}

export function useReminderAlerts({ active, onAlert, onOpen, reminders, workspaceReadyAt }) {
  const triggeredRemindersRef = useRef(new Set());
  const reminderAudioRef = useRef(null);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !workspaceReadyAt) {
      return undefined;
    }
    if (reminderAlertsDisabled()) {
      return undefined;
    }
    let timer = 0;
    const triggeredReminderKeys = triggeredRemindersRef.current;
    // Overdue reminders that predate the workspace should not hijack the first
    // view. The rule is evaluated per reminder against a fixed anchor, so it does
    // not depend on when the list happens to arrive.
    for (const reminder of reminders) {
      if (!isOpenReminderWithDueTime(reminder)) {
        continue;
      }
      const alertKey = createReminderAlertKey(reminder);
      if (triggeredReminderKeys.has(alertKey)) {
        continue;
      }
      const overdueBeforeWorkspace = Number(reminder.dueAt) <= workspaceReadyAt;
      if (overdueBeforeWorkspace && existedBeforeWorkspace(reminder, workspaceReadyAt)) {
        triggeredReminderKeys.add(alertKey);
      }
    }
    const triggerDueReminder = (dueReminder) => {
      const alertKey = createReminderAlertKey(dueReminder);
      triggeredReminderKeys.add(alertKey);
      const opened = Promise.resolve(onOpen(dueReminder));
      onAlert(dueReminder);
      void opened.then((didOpen) => {
        if (!didOpen) {
          triggeredReminderKeys.delete(alertKey);
        }
      });
      playReminderTone(reminderAudioRef);
    };
    const scheduleNextReminderCheck = () => {
      const now = Date.now();
      const dueReminder = findDueReminder(reminders, now, triggeredReminderKeys);
      if (dueReminder) {
        triggerDueReminder(dueReminder);
        return;
      }
      const nextDelay = resolveNextReminderDelay(reminders, now, triggeredReminderKeys);
      if (nextDelay == null) {
        return;
      }
      timer = window.setTimeout(scheduleNextReminderCheck, nextDelay);
    };
    scheduleNextReminderCheck();
    return () => window.clearTimeout(timer);
  }, [active, onAlert, onOpen, reminders, workspaceReadyAt]);
}
