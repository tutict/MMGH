const REMINDER_GROUP_KEYS = ["overdue", "today", "upcoming", "done"];

export function filterReminders(reminders = [], noteList = [], search = "") {
  const needle = search.trim().toLowerCase();
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
}

export function groupReminders(reminders = [], now, titleForGroup) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const buckets = REMINDER_GROUP_KEYS.map((key) => ({
    key,
    title: titleForGroup(key),
    items: [],
  }));

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
    bucket.items.sort(compareReminderDueOrder);
  });

  return buckets;
}

export function countOpenReminders(reminders = []) {
  return reminders.filter((item) => item.status !== "done").length;
}

function compareReminderDueOrder(left, right) {
  if (!left.dueAt && !right.dueAt) {
    return (right.updatedAt || 0) - (left.updatedAt || 0);
  }
  if (!left.dueAt) {
    return 1;
  }
  if (!right.dueAt) {
    return -1;
  }
  return left.dueAt - right.dueAt;
}
