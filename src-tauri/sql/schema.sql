PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  due_at INTEGER,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  linked_note_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (linked_note_id) REFERENCES notes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
  ON sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_session_id_created_at
  ON messages(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_activity_session_id_created_at
  ON activity(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at
  ON notes(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_due_at
  ON reminders(due_at ASC, updated_at DESC);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  trigger_hint TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  permission_level TEXT NOT NULL DEFAULT 'low',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_updated_at
  ON skills(updated_at DESC);

CREATE TABLE IF NOT EXISTS session_skills (
  session_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, skill_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_skills_session_id
  ON session_skills(session_id);

CREATE INDEX IF NOT EXISTS idx_session_skills_skill_id
  ON session_skills(skill_id);
