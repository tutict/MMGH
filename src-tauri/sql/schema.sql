CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_note_tags (
  note_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag),
  FOREIGN KEY (note_id) REFERENCES knowledge_notes(id) ON DELETE CASCADE
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
  FOREIGN KEY (linked_note_id) REFERENCES knowledge_notes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  trigger_hint TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  permission_level TEXT NOT NULL DEFAULT 'low',
  origin TEXT NOT NULL DEFAULT 'user',
  catalog_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS starter_skill_tombstones (
  name TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session_skill_mounts (
  session_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, skill_id),
  FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_updated_at
  ON agent_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id_created_at
  ON session_messages(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id_id_desc
  ON session_messages(session_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_session_activity_session_id_created_at
  ON session_activity(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_notes_updated_at
  ON knowledge_notes(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_note_tags_tag
  ON knowledge_note_tags(tag, note_id);

CREATE INDEX IF NOT EXISTS idx_reminders_due_at
  ON reminders(due_at ASC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_status_due_at_updated_at
  ON reminders(status, due_at ASC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_skills_updated_at
  ON skills(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_skills_enabled_updated_at
  ON skills(enabled, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_skills_origin_catalog_key
  ON skills(origin, catalog_key);

CREATE INDEX IF NOT EXISTS idx_session_skill_mounts_session_id
  ON session_skill_mounts(session_id);

CREATE INDEX IF NOT EXISTS idx_session_skill_mounts_session_id_created_at
  ON session_skill_mounts(session_id, created_at ASC, skill_id ASC);

CREATE INDEX IF NOT EXISTS idx_session_skill_mounts_skill_id
  ON session_skill_mounts(skill_id);
