let invokePromise = null;

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

export const invokeTauri = async (command, args) => {
  if (!isTauriAvailable()) {
    throw new Error("Tauri runtime is not available.");
  }

  const invoke = await loadInvoke();
  return invoke(command, args);
};
