import { useEffect, useRef, useState } from "react";
import {
  getDesktopWindowState,
  isTauriAvailable,
  listenToDesktopLifecycle,
  listenToDesktopWindowState,
  type DesktopWindowState,
} from "../storage/tauri";

export type DesktopRuntimeState = {
  available: boolean;
  synced: boolean;
  lifecycle: string;
  windowState: DesktopWindowState | null;
};

type DesktopRuntimeOptions = {
  onRestoredFromTray?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
};

export function createInitialDesktopRuntime(
  available = isTauriAvailable()
): DesktopRuntimeState {
  return {
    available,
    synced: !available,
    lifecycle: "",
    windowState: null,
  };
}

export function mergeDesktopWindowState(
  previousState: DesktopWindowState | null,
  nextState: DesktopWindowState
): DesktopWindowState {
  if (!previousState) {
    return nextState;
  }

  return previousState.label === nextState.label &&
    previousState.visible === nextState.visible &&
    previousState.focused === nextState.focused &&
    previousState.minimized === nextState.minimized &&
    previousState.maximized === nextState.maximized &&
    previousState.fullscreen === nextState.fullscreen &&
    previousState.resizable === nextState.resizable &&
    previousState.decorated === nextState.decorated &&
    previousState.width === nextState.width &&
    previousState.height === nextState.height &&
    previousState.scaleFactor === nextState.scaleFactor
    ? previousState
    : nextState;
}

export default function useDesktopRuntime({
  onRestoredFromTray,
  onVisibilityChange,
}: DesktopRuntimeOptions = {}): DesktopRuntimeState {
  const [runtime, setRuntime] = useState<DesktopRuntimeState>(() =>
    createInitialDesktopRuntime()
  );
  const onRestoredFromTrayRef = useRef(onRestoredFromTray);
  const onVisibilityChangeRef = useRef(onVisibilityChange);

  useEffect(() => {
    onRestoredFromTrayRef.current = onRestoredFromTray;
    onVisibilityChangeRef.current = onVisibilityChange;
  }, [onRestoredFromTray, onVisibilityChange]);

  useEffect(() => {
    if (!isTauriAvailable()) {
      return undefined;
    }

    let disposed = false;
    const unlistenCallbacks: Array<() => void> = [];

    const applyWindowState = (nextState: DesktopWindowState) => {
      if (disposed || !nextState) {
        return;
      }

      setRuntime((current) => ({
        ...current,
        available: true,
        synced: true,
        windowState: mergeDesktopWindowState(current.windowState, nextState),
      }));
      if (
        typeof nextState.visible === "boolean" ||
        typeof nextState.focused === "boolean"
      ) {
        onVisibilityChangeRef.current?.(
          Boolean(nextState.visible) && Boolean(nextState.focused)
        );
      }
    };

    const connectDesktopRuntime = async () => {
      try {
        applyWindowState(await getDesktopWindowState());
      } catch (error) {
        console.error("Failed to read initial desktop window state", error);
        if (!disposed) {
          setRuntime((current) => ({
            ...current,
            available: true,
            synced: false,
          }));
        }
      }

      try {
        const unlistenWindowState = await listenToDesktopWindowState(applyWindowState);
        if (disposed) {
          unlistenWindowState?.();
          return;
        }
        unlistenCallbacks.push(unlistenWindowState);
      } catch (error) {
        console.error("Failed to listen to desktop window state", error);
      }

      try {
        const unlistenLifecycle = await listenToDesktopLifecycle((payload) => {
          if (disposed) {
            return;
          }

          const reason = String(payload?.reason || "");
          setRuntime((current) => ({
            ...current,
            available: true,
            synced: true,
            lifecycle: reason,
          }));

          if (reason === "restored-from-tray") {
            onRestoredFromTrayRef.current?.();
          }
        });

        if (disposed) {
          unlistenLifecycle?.();
          return;
        }
        unlistenCallbacks.push(unlistenLifecycle);
      } catch (error) {
        console.error("Failed to listen to desktop lifecycle", error);
      }
    };

    void connectDesktopRuntime();

    return () => {
      disposed = true;
      Promise.all(
        unlistenCallbacks.map(async (unlisten) => {
          unlisten();
        })
      ).catch((error) => {
        console.error("Failed to detach desktop listeners", error);
      });
    };
  }, []);

  return runtime;
}
