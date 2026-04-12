import {
  invokeTauri as invokeRuntimeTauri,
  isTauriAvailable as isTauriRuntimeAvailable,
} from "./tauri";

const STORAGE_KEY = "mmgh_notes_v1";
const DESKTOP_NOTES_COMMANDS_ENABLED = false;

const isTauriAvailable = () => DESKTOP_NOTES_COMMANDS_ENABLED && isTauriRuntimeAvailable();
const invokeTauri = (command, args) => invokeRuntimeTauri(command, args);

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
    return invokeTauri("list_notes", { query, limit });
  }
  const notes = filterNotes(readLocalNotes(), query);
  if (typeof limit === "number") {
    return notes.slice(0, limit);
  }
  return notes;
};

export const addNote = async ({ title, content, mood, tags } = {}) => {
  if (isTauriAvailable()) {
    return invokeTauri("add_note", { title, content, mood, tags });
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
    return invokeTauri("update_note", { id, title, content, mood, tags });
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
    return invokeTauri("delete_note", { id });
  }
  const notes = readLocalNotes().filter((note) => note.id !== id);
  writeLocalNotes(notes);
  return true;
};
