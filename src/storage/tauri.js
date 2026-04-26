let invokePromise = null;
let eventModulePromise = null;

export const DESKTOP_WINDOW_STATE_EVENT = "mmgh://desktop-window-state";
export const DESKTOP_LIFECYCLE_EVENT = "mmgh://desktop-lifecycle";

export const isTauriAvailable = () =>
  typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

const loadInvoke = async () => {
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

const loadEventModule = async () => {
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

export const invokeTauri = async (command, args) => {
  if (!isTauriAvailable()) {
    throw new Error("Tauri runtime is not available.");
  }

  const invoke = await loadInvoke();
  return invoke(command, args);
};

export const getDesktopWindowState = async () => invokeTauri("desktop_window_state");

export const listenToDesktopWindowState = async (handler) => {
  if (!isTauriAvailable()) {
    return () => {};
  }

  const { listen } = await loadEventModule();
  return listen(DESKTOP_WINDOW_STATE_EVENT, (event) => {
    handler?.(event.payload);
  });
};

export const listenToDesktopLifecycle = async (handler) => {
  if (!isTauriAvailable()) {
    return () => {};
  }

  const { listen } = await loadEventModule();
  return listen(DESKTOP_LIFECYCLE_EVENT, (event) => {
    handler?.(event.payload);
  });
};
