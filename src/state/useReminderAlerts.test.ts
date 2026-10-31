import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  REMINDER_ALERTS_DISABLED_STORAGE_KEY,
  useReminderAlerts,
} from "./useReminderAlerts";

const WORKSPACE_READY_AT = Date.parse("2026-03-01T08:00:00.000Z");

function createReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Call the dentist",
    detail: "",
    dueAt: WORKSPACE_READY_AT - 30_000,
    severity: "medium",
    status: "scheduled",
    linkedNoteId: null,
    createdAt: WORKSPACE_READY_AT - 60_000,
    updatedAt: WORKSPACE_READY_AT - 60_000,
    ...overrides,
  };
}

function renderAlerts(
  reminders: unknown[],
  onOpen: (reminder: unknown) => unknown,
  onAlert: (reminder: unknown) => void = vi.fn()
) {
  return renderHook(
    ({ items }: { items: unknown[] }) =>
      useReminderAlerts({
        active: true,
        onAlert,
        onOpen,
        reminders: items,
        workspaceReadyAt: WORKSPACE_READY_AT,
      }),
    { initialProps: { items: reminders } }
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WORKSPACE_READY_AT);
  window.localStorage.clear();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(async () => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("a reminder that was already overdue when the workspace arrived does not hijack the first view", () => {
  const onOpen = vi.fn(async (_reminder: unknown) => true);

  renderAlerts([createReminder()], onOpen);

  expect(onOpen).not.toHaveBeenCalled();
});

test("a leftover without a creation stamp is treated as pre-existing", () => {
  const onOpen = vi.fn(async (_reminder: unknown) => true);
  const { createdAt: _createdAt, ...legacyReminder } = createReminder();

  renderAlerts([legacyReminder], onOpen);

  expect(onOpen).not.toHaveBeenCalled();
});

test("a reminder created during the session still alarms when it is already overdue", async () => {
  const onOpen = vi.fn(async (_reminder: unknown) => true);
  const onAlert = vi.fn();
  const { rerender } = renderAlerts([], onOpen, onAlert);

  vi.setSystemTime(WORKSPACE_READY_AT + 60_000);
  await act(async () => {
    rerender({
      items: [
        createReminder({
          dueAt: WORKSPACE_READY_AT + 30_000,
          createdAt: WORKSPACE_READY_AT + 60_000,
          updatedAt: WORKSPACE_READY_AT + 60_000,
        }),
      ],
    });
  });

  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onOpen.mock.calls[0][0]).toMatchObject({ title: "Call the dentist" });
  expect(onAlert).toHaveBeenCalledTimes(1);
});

test("a reminder created during the session with a future due time waits for it", async () => {
  const onOpen = vi.fn(async (_reminder: unknown) => true);
  const { rerender } = renderAlerts([], onOpen);

  vi.setSystemTime(WORKSPACE_READY_AT + 60_000);
  await act(async () => {
    rerender({
      items: [
        createReminder({
          dueAt: WORKSPACE_READY_AT + 120_000,
          createdAt: WORKSPACE_READY_AT + 60_000,
          updatedAt: WORKSPACE_READY_AT + 60_000,
        }),
      ],
    });
  });

  expect(onOpen).not.toHaveBeenCalled();
});

test("disabling reminder alerts suppresses the open, the notice and the tone", async () => {
  window.localStorage.setItem(REMINDER_ALERTS_DISABLED_STORAGE_KEY, "1");
  const onOpen = vi.fn(async (_reminder: unknown) => true);
  const onAlert = vi.fn();
  const { rerender } = renderAlerts([], onOpen, onAlert);

  vi.setSystemTime(WORKSPACE_READY_AT + 60_000);
  await act(async () => {
    rerender({
      items: [
        createReminder({
          dueAt: WORKSPACE_READY_AT + 30_000,
          createdAt: WORKSPACE_READY_AT + 60_000,
          updatedAt: WORKSPACE_READY_AT + 60_000,
        }),
      ],
    });
  });

  expect(onOpen).not.toHaveBeenCalled();
  expect(onAlert).not.toHaveBeenCalled();
  expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});

test("editing a reminder without changing its due time does not alarm again", async () => {
  const onOpen = vi.fn(async (_reminder: unknown) => true);
  const reminder = createReminder({
    dueAt: WORKSPACE_READY_AT + 60_000,
    createdAt: WORKSPACE_READY_AT + 30_000,
    updatedAt: WORKSPACE_READY_AT + 30_000,
  });
  const { rerender } = renderAlerts([reminder], onOpen);

  await act(async () => {
    vi.advanceTimersByTime(61_000);
  });
  expect(onOpen).toHaveBeenCalledTimes(1);

  await act(async () => {
    rerender({ items: [{ ...reminder, updatedAt: WORKSPACE_READY_AT + 90_000 }] });
  });
  expect(onOpen).toHaveBeenCalledTimes(1);
});
