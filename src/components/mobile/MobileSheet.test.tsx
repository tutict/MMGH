import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import MobileSheet from "./MobileSheet";

function SheetHarness() {
  const [open, setOpen] = useState(false);
  const [triggerVisible, setTriggerVisible] = useState(true);

  return (
    <div className="mobile-app">
      <h1 id="mobile-page-title" tabIndex={-1}>
        Reminders
      </h1>
      {triggerVisible ? (
        <button type="button" onClick={() => setOpen(true)}>
          Open editor
        </button>
      ) : null}
      <MobileSheet
        id="reminder-sheet"
        open={open}
        onClose={() => setOpen(false)}
        title="Reminder"
        closeLabel="Close"
        actions={
          <button
            type="button"
            onClick={() => {
              setTriggerVisible(false);
              setOpen(false);
            }}
          >
            Delete
          </button>
        }
      >
        <p>Reminder body</p>
      </MobileSheet>
    </div>
  );
}

test("mobile sheet returns focus to the control that opened it", async () => {
  const user = userEvent.setup();
  render(<SheetHarness />);

  const trigger = screen.getByText("Open editor");
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "Reminder" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Close" }));

  expect(document.activeElement).toBe(trigger);
});

test("mobile sheet keeps focus inside the shell when the trigger is gone", async () => {
  const user = userEvent.setup();
  render(<SheetHarness />);

  await user.click(screen.getByText("Open editor"));
  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.queryByRole("dialog", { name: "Reminder" })).not.toBeInTheDocument();
  expect(document.activeElement).not.toBe(document.body);
  expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
});

test("mobile sheet restores focus when it unmounts while open", async () => {
  const user = userEvent.setup();

  function UnmountHarness() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(true);

    return (
      <div className="mobile-app">
        <h1 id="mobile-page-title" tabIndex={-1}>
          Reminders
        </h1>
        <button type="button" onClick={() => setOpen(true)}>
          Open editor
        </button>
        <button type="button" onClick={() => setMounted(false)}>
          Switch view
        </button>
        {mounted ? (
          <MobileSheet
            id="reminder-sheet"
            open={open}
            onClose={() => setOpen(false)}
            title="Reminder"
            closeLabel="Close"
          >
            <p>Reminder body</p>
          </MobileSheet>
        ) : null}
      </div>
    );
  }

  render(<UnmountHarness />);

  const trigger = screen.getByText("Open editor");
  await user.click(trigger);
  // The sheet is modal, so the shell behind it is hidden from assistive
  // technology while it is open.
  await user.click(screen.getByText("Switch view"));

  expect(document.activeElement).toBe(trigger);
});
