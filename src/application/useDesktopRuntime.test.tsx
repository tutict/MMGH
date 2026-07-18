import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import useDesktopRuntime, { mergeDesktopWindowState } from "./useDesktopRuntime";

type EventHandler = (payload: unknown) => void;

const tauriMock = vi.hoisted(() => ({
  getDesktopWindowState: vi.fn<() => Promise<unknown>>(),
  isTauriAvailable: vi.fn<() => boolean>(),
  listenToDesktopLifecycle: vi.fn<(handler?: EventHandler) => Promise<() => void>>(),
  listenToDesktopWindowState: vi.fn<(handler?: EventHandler) => Promise<() => void>>(),
}));

vi.mock("../storage/tauri", () => tauriMock);

const WINDOW_STATE = {
  label: "main",
  visible: true,
  focused: true,
  minimized: false,
  maximized: false,
  fullscreen: false,
  resizable: true,
  decorated: true,
  width: 1280,
  height: 800,
  scaleFactor: 1,
};

function Probe({
  onRestoredFromTray = () => {},
  onVisibilityChange = () => {},
}: {
  onRestoredFromTray?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const runtime = useDesktopRuntime({ onRestoredFromTray, onVisibilityChange });

  return (
    <output data-testid="runtime">
      {[
        runtime.available,
        runtime.synced,
        runtime.lifecycle,
        runtime.windowState?.label || "none",
        runtime.windowState?.visible ?? "unknown",
        runtime.windowState?.focused ?? "unknown",
      ].join("|")}
    </output>
  );
}

beforeEach(() => {
  tauriMock.getDesktopWindowState.mockReset();
  tauriMock.isTauriAvailable.mockReset();
  tauriMock.listenToDesktopLifecycle.mockReset();
  tauriMock.listenToDesktopWindowState.mockReset();

  tauriMock.isTauriAvailable.mockReturnValue(false);
  tauriMock.getDesktopWindowState.mockResolvedValue(WINDOW_STATE);
  tauriMock.listenToDesktopLifecycle.mockResolvedValue(() => {});
  tauriMock.listenToDesktopWindowState.mockResolvedValue(() => {});
});

test("Web fallback is already synced and registers no Tauri resources", () => {
  render(<Probe />);

  expect(screen.getByTestId("runtime")).toHaveTextContent("false|true||none|unknown|unknown");
  expect(tauriMock.getDesktopWindowState).not.toHaveBeenCalled();
  expect(tauriMock.listenToDesktopWindowState).not.toHaveBeenCalled();
  expect(tauriMock.listenToDesktopLifecycle).not.toHaveBeenCalled();
});

test("Tauri state and lifecycle events update projection and emit explicit outputs", async () => {
  let handleWindowState: EventHandler | undefined;
  let handleLifecycle: EventHandler | undefined;
  const unlistenWindowState = vi.fn();
  const unlistenLifecycle = vi.fn();
  const onVisibilityChange = vi.fn();
  const onRestoredFromTray = vi.fn();

  tauriMock.isTauriAvailable.mockReturnValue(true);
  tauriMock.listenToDesktopWindowState.mockImplementation(async (handler) => {
    handleWindowState = handler;
    return unlistenWindowState;
  });
  tauriMock.listenToDesktopLifecycle.mockImplementation(async (handler) => {
    handleLifecycle = handler;
    return unlistenLifecycle;
  });

  const view = render(
    <Probe
      onRestoredFromTray={onRestoredFromTray}
      onVisibilityChange={onVisibilityChange}
    />
  );

  await waitFor(() => {
    expect(screen.getByTestId("runtime")).toHaveTextContent("true|true||main|true|true");
  });
  expect(onVisibilityChange).toHaveBeenLastCalledWith(true);

  act(() => {
    handleWindowState?.({ ...WINDOW_STATE, visible: false, focused: false });
  });
  expect(screen.getByTestId("runtime")).toHaveTextContent("true|true||main|false|false");
  expect(onVisibilityChange).toHaveBeenLastCalledWith(false);

  act(() => {
    handleLifecycle?.({ reason: "restored-from-tray" });
  });
  expect(screen.getByTestId("runtime")).toHaveTextContent(
    "true|true|restored-from-tray|main|false|false"
  );
  expect(onRestoredFromTray).toHaveBeenCalledTimes(1);

  view.unmount();
  await waitFor(() => {
    expect(unlistenWindowState).toHaveBeenCalledTimes(1);
    expect(unlistenLifecycle).toHaveBeenCalledTimes(1);
  });
});

test("equivalent desktop window payloads reuse the previous projection", () => {
  const equalState = { ...WINDOW_STATE };
  const changedState = { ...WINDOW_STATE, width: WINDOW_STATE.width + 1 };

  expect(mergeDesktopWindowState(WINDOW_STATE, equalState)).toBe(WINDOW_STATE);
  expect(mergeDesktopWindowState(WINDOW_STATE, changedState)).toBe(changedState);
  expect(mergeDesktopWindowState(null, WINDOW_STATE)).toBe(WINDOW_STATE);
});

test("read and listener failures remain contained in an unsynced Tauri projection", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  tauriMock.isTauriAvailable.mockReturnValue(true);
  tauriMock.getDesktopWindowState.mockRejectedValue(new Error("read failed"));
  tauriMock.listenToDesktopWindowState.mockRejectedValue(new Error("window listener failed"));
  tauriMock.listenToDesktopLifecycle.mockRejectedValue(new Error("lifecycle listener failed"));

  try {
    render(<Probe />);

    await waitFor(() => {
      expect(tauriMock.listenToDesktopLifecycle).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("runtime")).toHaveTextContent(
      "true|false||none|unknown|unknown"
    );
    expect(consoleError).toHaveBeenCalledTimes(3);
  } finally {
    consoleError.mockRestore();
  }
});

test("a listener that resolves after unmount is detached immediately", async () => {
  let resolveUnlisten: ((unlisten: () => void) => void) | undefined;
  const unlistenWindowState = vi.fn();

  tauriMock.isTauriAvailable.mockReturnValue(true);
  tauriMock.listenToDesktopWindowState.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveUnlisten = resolve;
      })
  );

  const view = render(<Probe />);
  await waitFor(() => {
    expect(tauriMock.listenToDesktopWindowState).toHaveBeenCalledTimes(1);
  });

  view.unmount();
  act(() => {
    resolveUnlisten?.(unlistenWindowState);
  });

  await waitFor(() => {
    expect(unlistenWindowState).toHaveBeenCalledTimes(1);
  });
  expect(tauriMock.listenToDesktopLifecycle).not.toHaveBeenCalled();
});
