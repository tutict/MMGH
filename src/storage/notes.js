const STORAGE_KEY = "mmgh_notes_v1";

const isTauriAvailable = () =>
  typeof window !== "undefined" &&
  window.__TAURI__ &&
  window.__TAURI__.tauri &&
  window.__TAURI__.tauri.promisified;

const invokeTauri = (payload) => window.__TAURI__.tauri.promisified(payload);

const ionicApiBase = (() => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_IONIC_API;
  }
  return undefined;
})();

const isIonicEnabled = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const mode = import.meta.env.VITE_BACKEND;
    if (mode === "ionic") {
      return true;
    }
  }
  return Boolean(ionicApiBase);
};

const getIonicBaseUrl = () => ionicApiBase || "http://127.0.0.1:4781";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${getIonicBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  if (data && data.error) {
    throw new Error(data.error);
  }
  return data;
};

const normalizeTags = (tags) => {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags.filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeNote = (note) => ({
  id: note.id,
  title: note.title ?? "",
  content: note.content ?? "",
  mood: note.mood ?? "",
  tags: normalizeTags(note.tags),
  createdAt: note.createdAt ?? Date.now(),
  updatedAt: note.updatedAt ?? note.createdAt ?? Date.now(),
});

const readLocalNotes = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeNote) : [];
  } catch (error) {
    console.error("Failed to read local notes", error);
    return [];
  }
};

const writeLocalNotes = (notes) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to write local notes", error);
  }
};

const filterNotes = (notes, query) => {
  if (!query) {
    return notes;
  }
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return notes;
  }
  return notes.filter((note) => {
    const haystack = [
      note.title,
      note.content,
      note.mood,
      note.tags?.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
};

export const listNotes = async ({ query, limit } = {}) => {
  if (isTauriAvailable()) {
    return invokeTauri({ cmd: "listNotes", query, limit });
  }
  if (isIonicEnabled()) {
    const params = new URLSearchParams();
    if (query) {
      params.set("query", query);
    }
    if (typeof limit === "number") {
      params.set("limit", String(limit));
    }
    const suffix = params.toString() ? `?${params}` : "";
    const data = await requestJson(`/notes${suffix}`);
    return Array.isArray(data?.notes)
      ? data.notes.map(normalizeNote)
      : [];
  }
  const notes = filterNotes(readLocalNotes(), query);
  if (typeof limit === "number") {
    return notes.slice(0, limit);
  }
  return notes;
};

export const addNote = async ({ title, content, mood, tags } = {}) => {
  if (isTauriAvailable()) {
    return invokeTauri({ cmd: "addNote", title, content, mood, tags });
  }
  if (isIonicEnabled()) {
    const data = await requestJson("/notes", {
      method: "POST",
      body: JSON.stringify({ title, content, mood, tags }),
    });
    return data?.note ? normalizeNote(data.note) : null;
  }
  const now = Date.now();
  const note = normalizeNote({
    id: now,
    title,
    content,
    mood,
    tags,
    createdAt: now,
    updatedAt: now,
  });
  const notes = [note, ...readLocalNotes()];
  writeLocalNotes(notes);
  return note;
};

export const updateNote = async ({ id, title, content, mood, tags }) => {
  if (isTauriAvailable()) {
    return invokeTauri({ cmd: "updateNote", id, title, content, mood, tags });
  }
  if (isIonicEnabled()) {
    const data = await requestJson(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, content, mood, tags }),
    });
    return data?.note ? normalizeNote(data.note) : null;
  }
  const notes = readLocalNotes();
  const updatedAt = Date.now();
  const nextNotes = notes.map((note) =>
    note.id === id
      ? normalizeNote({
          ...note,
          title,
          content,
          mood,
          tags,
          updatedAt,
        })
      : note
  );
  writeLocalNotes(nextNotes);
  return nextNotes.find((note) => note.id === id);
};

export const deleteNote = async (id) => {
  if (isTauriAvailable()) {
    return invokeTauri({ cmd: "deleteNote", id });
  }
  if (isIonicEnabled()) {
    await requestJson(`/notes/${id}`, { method: "DELETE" });
    return true;
  }
  const notes = readLocalNotes().filter((note) => note.id !== id);
  writeLocalNotes(notes);
  return true;
};
