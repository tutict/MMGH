type InvokeFn = typeof import("@tauri-apps/api/core")["invoke"];
type EventModule = typeof import("@tauri-apps/api/event");
type UnlistenFn = () => void;

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  }
}

let invokePromise: Promise<InvokeFn> | null = null;
let eventModulePromise: Promise<EventModule> | null = null;

export const DESKTOP_WINDOW_STATE_EVENT = "mmgh://desktop-window-state";
export const DESKTOP_LIFECYCLE_EVENT = "mmgh://desktop-lifecycle";

export const isTauriAvailable = (): boolean =>
  typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

const loadInvoke = async (): Promise<InvokeFn> => {
  if (!invokePromise) {
    invokePromise = import("@tauri-apps/api/core")
      .then((module) => module.invoke)
      .catch((error) => {
        invokePromise = null;
        throw error;
      });
  }

  return invokePromise;
};

const loadEventModule = async (): Promise<EventModule> => {
  if (!eventModulePromise) {
    eventModulePromise = import("@tauri-apps/api/event")
      .then((module) => module)
      .catch((error) => {
        eventModulePromise = null;
        throw error;
      });
  }

  return eventModulePromise;
};

export const invokeTauri = async <T = any>(command: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauriAvailable()) {
    throw new Error("Tauri runtime is not available.");
  }

  const invoke = await loadInvoke();
  return invoke<T>(command, args);
};

export const getDesktopWindowState = async () => invokeTauri("desktop_window_state");

export const listenToDesktopWindowState = async (handler?: (payload: unknown) => void): Promise<UnlistenFn> => {
  if (!isTauriAvailable()) {
    return () => {};
  }

  const { listen } = await loadEventModule();
  return listen(DESKTOP_WINDOW_STATE_EVENT, (event) => {
    handler?.(event.payload);
  });
};

export const listenToDesktopLifecycle = async (handler?: (payload: unknown) => void): Promise<UnlistenFn> => {
  if (!isTauriAvailable()) {
    return () => {};
  }

  const { listen } = await loadEventModule();
  return listen(DESKTOP_LIFECYCLE_EVENT, (event) => {
    handler?.(event.payload);
  });
};

