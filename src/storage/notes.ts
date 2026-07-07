import {
  invokeTauri as invokeRuntimeTauri,
  isTauriAvailable as isTauriRuntimeAvailable,
} from "./tauri";

const STORAGE_KEY = "mmgh_notes_v1";
const DESKTOP_NOTES_COMMANDS_ENABLED = false;

type NoteInput = {
  id?: number;
  title?: string;
  content?: string;
  mood?: string;
  tags?: string[] | string;
  createdAt?: number;
  updatedAt?: number;
};

type Note = {
  id: number;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

type ListNotesArgs = {
  query?: string;
  limit?: number;
};

type SaveNoteArgs = {
  id?: number;
  title?: string;
  content?: string;
  mood?: string;
  tags?: string[] | string;
};

const isTauriAvailable = () => DESKTOP_NOTES_COMMANDS_ENABLED && isTauriRuntimeAvailable();
const invokeTauri = <T = unknown>(command: string, args?: Record<string, unknown>) => invokeRuntimeTauri<T>(command, args);

const normalizeTags = (tags?: string[] | string): string[] => {
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

const normalizeNote = (note: NoteInput): Note => ({
  id: note.id ?? Date.now(),
  title: note.title ?? "",
  content: note.content ?? "",
  mood: note.mood ?? "",
  tags: normalizeTags(note.tags),
  createdAt: note.createdAt ?? Date.now(),
  updatedAt: note.updatedAt ?? note.createdAt ?? Date.now(),
});

const readLocalNotes = (): Note[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeNote) : [];
  } catch (error) {
    console.error("Failed to read local notes", error);
    return [];
  }
};

const writeLocalNotes = (notes: Note[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to write local notes", error);
  }
};

const filterNotes = (notes: Note[], query?: string): Note[] => {
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

export const listNotes = async ({ query, limit }: ListNotesArgs = {}): Promise<Note[]> => {
  if (isTauriAvailable()) {
    return invokeTauri<Note[]>("list_notes", { query, limit });
  }
  const notes = filterNotes(readLocalNotes(), query);
  if (typeof limit === "number") {
    return notes.slice(0, limit);
  }
  return notes;
};

export const addNote = async ({ title, content, mood, tags }: SaveNoteArgs = {}): Promise<Note> => {
  if (isTauriAvailable()) {
    return invokeTauri<Note>("add_note", { title, content, mood, tags });
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

export const updateNote = async ({ id, title, content, mood, tags }: SaveNoteArgs): Promise<Note | undefined> => {
  if (isTauriAvailable()) {
    return invokeTauri<Note>("update_note", { id, title, content, mood, tags });
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

export const deleteNote = async (id: number): Promise<boolean> => {
  if (isTauriAvailable()) {
    return invokeTauri<boolean>("delete_note", { id });
  }
  const notes = readLocalNotes().filter((note) => note.id !== id);
  writeLocalNotes(notes);
  return true;
};
