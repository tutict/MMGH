import { useEffect, useRef } from "react";

const REMINDER_ALERT_SOUND_SRC = "/reply-pulse.mp3";
const MAX_REMINDER_TIMER_DELAY_MS = 60 * 60 * 1000;

function createReminderAlertKey(reminder) {
  return `${reminder.id}:${reminder.updatedAt}:${reminder.status}`;
}

function isOpenReminderWithDueTime(reminder) {
  return reminder?.status !== "done" && Number.isFinite(Number(reminder?.dueAt));
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

export function useReminderAlerts({ active, onOpen, reminders, t }) {
  const triggeredRemindersRef = useRef(new Set());
  const reminderAudioRef = useRef(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return undefined;
    }
    let timer = 0;
    const triggeredReminderKeys = triggeredRemindersRef.current;
    const triggerDueReminder = (dueReminder) => {
      const alertKey = createReminderAlertKey(dueReminder);
      triggeredReminderKeys.add(alertKey);
      void Promise.resolve(onOpen(dueReminder)).then((opened) => {
        if (!opened) {
          triggeredReminderKeys.delete(alertKey);
        }
      });
      playReminderTone(reminderAudioRef);
      window.setTimeout(() => {
        window.alert(t("app.reminders.alertDue", { title: dueReminder.title }));
      }, 120);
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
  }, [active, onOpen, reminders, t]);
}
