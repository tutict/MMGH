import { expect, test } from "vitest";
import {
  countOpenReminders,
  filterReminders,
  groupReminders,
} from "./reminderWorkspaceModel";

const now = new Date(2026, 5, 14, 10, 0, 0).getTime();
const day = 24 * 60 * 60 * 1000;

function titles(groups, key) {
  return groups.find((group) => group.key === key)?.items.map((item) => item.title) || [];
}

test("filterReminders searches reminder fields and linked note titles", () => {
  const reminders = [
    {
      id: 1,
      title: "Deploy invoice",
      preview: "Follow up",
      severity: "high",
      status: "scheduled",
      linkedNoteId: 10,
    },
    {
      id: 2,
      title: "Buy coffee",
      preview: "Groceries",
      severity: "low",
      status: "done",
      linkedNoteId: 20,
    },
  ];
  const notes = [
    { id: 10, title: "Finance" },
    { id: 20, title: "Errands" },
  ];

  expect(filterReminders(reminders, notes, "finance").map((item) => item.id)).toEqual([1]);
  expect(filterReminders(reminders, notes, "done").map((item) => item.id)).toEqual([2]);
  expect(filterReminders(reminders, notes, "").map((item) => item.id)).toEqual([1, 2]);
});

test("groupReminders buckets open reminders by due date and keeps done separate", () => {
  const reminders = [
    { id: 1, title: "later", dueAt: now + day * 2, status: "scheduled", updatedAt: now },
    { id: 2, title: "done", dueAt: now - day, status: "done", updatedAt: now },
    { id: 3, title: "today", dueAt: now + 60_000, status: "scheduled", updatedAt: now },
    { id: 4, title: "overdue", dueAt: now - day, status: "scheduled", updatedAt: now },
    { id: 5, title: "no due new", dueAt: null, status: "scheduled", updatedAt: now + 2 },
    { id: 6, title: "no due old", status: "scheduled", updatedAt: now + 1 },
  ];

  const groups = groupReminders(reminders, now, (key) => key);

  expect(titles(groups, "overdue")).toEqual(["overdue"]);
  expect(titles(groups, "today")).toEqual(["today"]);
  expect(titles(groups, "upcoming")).toEqual(["later", "no due new", "no due old"]);
  expect(titles(groups, "done")).toEqual(["done"]);
});

test("countOpenReminders ignores done reminders", () => {
  expect(
    countOpenReminders([
      { id: 1, status: "scheduled" },
      { id: 2, status: "done" },
      { id: 3, status: "open" },
    ])
  ).toBe(2);
});
