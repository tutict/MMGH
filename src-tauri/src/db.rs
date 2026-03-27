use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::cmd::{AgentSettingsInput, KnowledgeNoteInput, ReminderInput, SkillInput};

static DB_CONN: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));
const SETTINGS_KEY: &str = "agent_settings_v1";
const SESSION_SKILL_MIGRATION_KEY: &str = "session_skill_mount_migration_v1";
const STARTER_SKILL_SEED_MIGRATION_KEY: &str = "starter_skill_seed_migration_v1";

#[derive(Debug, Clone, Copy)]
struct StarterSkillSeed {
  name: &'static str,
  description: &'static str,
  instructions: &'static str,
  trigger_hint: &'static str,
  legacy_names: &'static [&'static str],
}

static STARTER_SKILL_SEEDS: &[StarterSkillSeed] = &[
  StarterSkillSeed {
    name: "Note Recall",
    description: "Bias the agent toward local notes, durable facts, and previously captured context.",
    instructions: "Before answering, check whether the local note set likely contains stable context. Prefer durable facts from notes over fresh guesses, and call out when the notes appear incomplete or stale.",
    trigger_hint: "Use when the operator asks for context from local notes, private docs, or stable project knowledge.",
    legacy_names: &["Local note recall"],
  },
  StarterSkillSeed {
    name: "Knowledge Librarian",
    description: "Turn volatile chat into clean notes, reusable summaries, and durable knowledge entries.",
    instructions: "Distill the conversation into durable facts, open questions, and next actions. Suggest a note title, a compact summary, and a tag set that would fit the Knowledge Vault. Do not invent facts that were not present in the conversation or local notes.",
    trigger_hint: "Use when the operator wants to extract facts, consolidate a discussion, or turn output into a reusable knowledge note.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Reminder Radar",
    description: "Keep due items, follow-ups, and reminder-worthy actions visible during planning.",
    instructions: "Surface overdue or due-soon items before proposing brand new work. Turn loose asks into actionable reminder candidates with owner, deadline, and expected outcome when possible. Do not claim a reminder was saved unless the operator explicitly asks for that step.",
    trigger_hint: "Use when the task mentions deadlines, follow-ups, to-dos, scheduling, or asks to remember something later.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Weather Brief",
    description: "Summarize visible weather context and keep weather-related advice grounded in actual data.",
    instructions: "If concrete weather data is present in the session context or the operator provides it, summarize it clearly and connect it to the request. If live weather data is missing, ask the operator to open the Weather workspace or paste the visible city snapshot. Never invent current conditions.",
    trigger_hint: "Use when the operator asks about the weather board, compares cities, or wants packing and travel advice tied to current conditions.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Music Companion",
    description: "Turn mood, reply rhythm, and track context into playlist or playback suggestions.",
    instructions: "Use only the track names, artists, lyrics, or playback state that appear in the conversation or visible runtime context. Suggest ordering, transitions, mood fit, and playback notes. Do not claim you can hear audio or read lyrics unless that content was provided.",
    trigger_hint: "Use when the operator asks for playlist ideas, mood matching, track ordering, or reply-synced music suggestions.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Gallery Curator",
    description: "Organize gallery items into themes, captions, tags, and memory-friendly collections.",
    instructions: "Use the filenames, descriptions, and user-provided context to suggest albums, favorite candidates, captions, and retrieval-friendly tags. Do not claim to inspect image pixels unless the images themselves are provided to the agent.",
    trigger_hint: "Use when the operator wants to group photos, write captions, build collections, or clean up a gallery.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Settings Steward",
    description: "Keep provider, cache, and runtime settings changes deliberate, explicit, and reversible.",
    instructions: "Restate the intended settings change, call out impact and reversibility, and prefer the smallest safe update. Warn before cache-clearing or state-reset actions, and never pretend a provider setting works until the required fields are present.",
    trigger_hint: "Use when the task touches provider config, cache clearing, system prompts, runtime toggles, or other settings work.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Release Guard",
    description: "Slow the agent down around risky edits, migrations, deletions, and production-impacting changes.",
    instructions: "Treat risky changes as a review gate. Surface rollback impact, migration risks, and testing gaps before modifying code or config. Favor reversible edits and explicit verification steps.",
    trigger_hint: "Use when the task touches deployment, migrations, auth, billing, or destructive file changes.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "UI Polish",
    description: "Push the agent toward sharper layout, stronger hierarchy, and less generic frontend output.",
    instructions: "Aim for deliberate interface structure, clear hierarchy, and stronger visual rhythm. Avoid generic dashboard filler. Keep motion purposeful, spacing consistent, and mobile behavior explicit.",
    trigger_hint: "Use when the task changes user-facing layout, interaction design, or visual presentation.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Research Mode",
    description: "Optimize for source-backed answers, validation, and clear uncertainty handling.",
    instructions: "Prioritize primary sources, note what is verified versus inferred, and summarize unresolved gaps before concluding. Avoid confident claims when evidence is thin or time-sensitive.",
    trigger_hint: "Use when the task needs documentation checks, verification, citations, or comparison across sources.",
    legacy_names: &[],
  },
  StarterSkillSeed {
    name: "Task Router",
    description: "Improve decomposition, next-step planning, and execution ordering for bigger tasks.",
    instructions: "Break the task into a minimal critical path, keep side work clearly separated, and sequence execution so blockers are resolved before polish work. State assumptions when they affect downstream steps.",
    trigger_hint: "Use when the request is broad, multi-step, or likely to branch into implementation plus verification.",
    legacy_names: &[],
  },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSettings {
  pub provider_name: String,
  pub base_url: String,
  pub api_key: String,
  pub model: String,
  pub system_prompt: String,
}

impl AgentSettings {
  pub fn is_ready(&self) -> bool {
    !self.base_url.trim().is_empty()
      && !self.model.trim().is_empty()
      && !self.api_key.trim().is_empty()
  }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
  pub id: i64,
  pub title: String,
  pub status: String,
  pub updated_at: i64,
  pub message_count: i64,
  pub last_message_preview: String,
  pub mounted_skill_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
  pub id: i64,
  pub role: String,
  pub content: String,
  pub created_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityItem {
  pub id: i64,
  pub kind: String,
  pub title: String,
  pub detail: String,
  pub status: String,
  pub created_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Capability {
  pub id: String,
  pub title: String,
  pub description: String,
  pub status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDetail {
  pub session: SessionSummary,
  pub messages: Vec<ChatMessage>,
  pub activity: Vec<ActivityItem>,
  pub mounted_skill_ids: Vec<i64>,
  pub mounted_skills: Vec<SkillSummary>,
  pub recommended_skills: Vec<SkillSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeNoteSummary {
  pub id: i64,
  pub icon: String,
  pub title: String,
  pub summary: String,
  pub tags: Vec<String>,
  pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeNoteDetail {
  pub id: i64,
  pub icon: String,
  pub title: String,
  pub summary: String,
  pub body: String,
  pub tags: Vec<String>,
  pub created_at: i64,
  pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderItem {
  pub id: i64,
  pub title: String,
  pub detail: String,
  pub preview: String,
  pub due_at: Option<i64>,
  pub severity: String,
  pub status: String,
  pub linked_note_id: Option<i64>,
  pub created_at: i64,
  pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSummary {
  pub id: i64,
  pub name: String,
  pub summary: String,
  pub trigger_hint: String,
  pub recommendation_reason: Option<String>,
  pub enabled: bool,
  pub permission_level: String,
  pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDetail {
  pub id: i64,
  pub name: String,
  pub description: String,
  pub summary: String,
  pub instructions: String,
  pub trigger_hint: String,
  pub enabled: bool,
  pub permission_level: String,
  pub created_at: i64,
  pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
  pub settings: AgentSettings,
  pub sessions: Vec<SessionSummary>,
  pub active_session_id: i64,
  pub active_session: SessionDetail,
  pub notes: Vec<KnowledgeNoteSummary>,
  pub active_note_id: i64,
  pub active_note: KnowledgeNoteDetail,
  pub reminders: Vec<ReminderItem>,
  pub skills: Vec<SkillSummary>,
  pub active_skill_id: i64,
  pub active_skill: SkillDetail,
  pub capabilities: Vec<Capability>,
}

pub fn bootstrap() -> Result<WorkspaceSnapshot> {
  workspace_snapshot(None)
}

pub fn open_session(session_id: i64) -> Result<WorkspaceSnapshot> {
  workspace_snapshot(Some(session_id))
}

pub fn create_session(title: Option<String>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let session_id = create_session_in(conn, title)?;
    build_workspace_snapshot_in(conn, Some(session_id), None, None)
  })
}

pub fn delete_session(session_id: i64) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    conn.execute("DELETE FROM activity WHERE session_id = ?1", params![session_id])?;
    conn.execute("DELETE FROM messages WHERE session_id = ?1", params![session_id])?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
    ensure_seed_session_in(conn)?;
    build_workspace_snapshot_in(conn, None, None, None)
  })
}

pub fn save_settings(
  input: AgentSettingsInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let settings = normalize_settings(input);
    store_settings_in(conn, &settings)?;
    build_workspace_snapshot_in(conn, active_session_id, None, None)
  })
}

pub fn open_note(note_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| build_workspace_snapshot_in(conn, active_session_id, Some(note_id), None))
}

pub fn create_note(
  title: Option<String>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let note_id = create_note_in(conn, title)?;
    build_workspace_snapshot_in(conn, active_session_id, Some(note_id), None)
  })
}

pub fn save_note(
  input: KnowledgeNoteInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    save_note_in(conn, input.clone())?;
    build_workspace_snapshot_in(conn, active_session_id, Some(input.id), None)
  })
}

pub fn delete_note(note_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    conn.execute("DELETE FROM notes WHERE id = ?1", params![note_id])?;
    ensure_seed_note_in(conn)?;
    build_workspace_snapshot_in(conn, active_session_id, None, None)
  })
}

pub fn create_reminder(
  title: Option<String>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    create_reminder_in(conn, title)?;
    build_workspace_snapshot_in(conn, active_session_id, None, None)
  })
}

pub fn save_reminder(
  input: ReminderInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    save_reminder_in(conn, input)?;
    build_workspace_snapshot_in(conn, active_session_id, None, None)
  })
}

pub fn delete_reminder(
  reminder_id: i64,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    conn.execute("DELETE FROM reminders WHERE id = ?1", params![reminder_id])?;
    build_workspace_snapshot_in(conn, active_session_id, None, None)
  })
}

pub fn open_skill(skill_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| build_workspace_snapshot_in(conn, active_session_id, None, Some(skill_id)))
}

pub fn create_skill(
  name: Option<String>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let skill_id = create_skill_in(conn, name)?;
    if let Some(session_id) = active_session_id {
      let mut skill_ids = list_session_skill_ids_in(conn, session_id)?;
      skill_ids.push(skill_id);
      save_session_skills_in(conn, session_id, skill_ids)?;
    }
    build_workspace_snapshot_in(conn, active_session_id, None, Some(skill_id))
  })
}

pub fn save_skill(
  input: SkillInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    save_skill_in(conn, input.clone())?;
    build_workspace_snapshot_in(conn, active_session_id, None, Some(input.id))
  })
}

pub fn delete_skill(skill_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    conn.execute("DELETE FROM skills WHERE id = ?1", params![skill_id])?;
    ensure_seed_skill_in(conn)?;
    build_workspace_snapshot_in(conn, active_session_id, None, None)
  })
}

pub fn save_session_skills(
  session_id: i64,
  skill_ids: Vec<i64>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    save_session_skills_in(conn, session_id, skill_ids)?;
    build_workspace_snapshot_in(conn, active_session_id.or(Some(session_id)), None, None)
  })
}

pub fn session_enabled_skills(session_id: i64) -> Result<Vec<SkillDetail>> {
  with_connection(|conn| list_session_enabled_skills_in(conn, session_id))
}

pub fn load_settings() -> Result<AgentSettings> {
  with_connection(load_settings_in)
}

pub fn resolve_settings_override(input: Option<AgentSettingsInput>) -> Result<AgentSettings> {
  match input {
    Some(value) => Ok(normalize_settings(value)),
    None => load_settings(),
  }
}

pub fn recent_note_details(limit: usize) -> Result<Vec<KnowledgeNoteDetail>> {
  with_connection(|conn| list_note_details_in(conn, limit))
}

pub fn workspace_snapshot(preferred_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| build_workspace_snapshot_in(conn, preferred_session_id, None, None))
}

pub fn append_message(session_id: i64, role: &str, content: &str) -> Result<()> {
  with_connection(|conn| {
    append_message_in(conn, session_id, role, content)?;
    Ok(())
  })
}

pub fn append_activity(
  session_id: i64,
  kind: &str,
  title: &str,
  detail: &str,
  status: &str,
) -> Result<()> {
  with_connection(|conn| {
    append_activity_in(conn, session_id, kind, title, detail, status)?;
    Ok(())
  })
}

pub fn update_session_status(session_id: i64, status: &str) -> Result<()> {
  with_connection(|conn| {
    touch_session_in(conn, session_id, status)?;
    Ok(())
  })
}

pub fn ensure_session_title(session_id: i64, prompt: &str) -> Result<()> {
  with_connection(|conn| {
    let existing: Option<String> = conn
      .query_row(
        "SELECT title FROM sessions WHERE id = ?1",
        params![session_id],
        |row| row.get(0),
      )
      .optional()?;

    if let Some(title) = existing {
      if title.trim() == "New Mission" {
        let next_title = infer_title(prompt);
        conn.execute(
          "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
          params![next_title, now_millis(), session_id],
        )?;
      }
    }

    Ok(())
  })
}

pub fn recent_messages(session_id: i64, limit: usize) -> Result<Vec<ChatMessage>> {
  with_connection(|conn| {
    let mut stmt = conn.prepare(
      "SELECT id, role, content, created_at
       FROM messages
       WHERE session_id = ?1
       ORDER BY id DESC
       LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![session_id, limit as i64], |row| {
      Ok(ChatMessage {
        id: row.get(0)?,
        role: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
      })
    })?;

    let mut messages = Vec::new();
    for row in rows {
      messages.push(row?);
    }
    messages.reverse();
    Ok(messages)
  })
}

fn with_connection<T, F>(action: F) -> Result<T>
where
  F: FnOnce(&Connection) -> Result<T>,
{
  let mut guard = DB_CONN
    .lock()
    .map_err(|_| anyhow!("database mutex poisoned"))?;

  if guard.is_none() {
    let path = db_path()?;
    let conn = Connection::open(path)?;
    conn.execute_batch(include_str!("../sql/schema.sql"))?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    run_post_init_migrations_in(&conn)?;
    *guard = Some(conn);
  }

  let conn = guard.as_ref().context("database connection not initialized")?;
  action(conn)
}

fn app_data_dir() -> Option<PathBuf> {
  let app_name = env!("CARGO_PKG_NAME");
  tauri::api::path::local_data_dir()
    .or_else(tauri::api::path::data_dir)
    .map(|mut dir| {
      dir.push(app_name);
      dir
    })
}

fn db_path() -> Result<PathBuf> {
  let base_dir = app_data_dir().unwrap_or_else(|| {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
  });
  let mut dir = base_dir;
  dir.push("data");
  fs::create_dir_all(&dir)?;
  dir.push("mmgh-agent.sqlite");
  Ok(dir)
}

fn now_millis() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as i64
}

fn default_settings() -> AgentSettings {
  AgentSettings {
    provider_name: "OpenAI Compatible".to_string(),
    base_url: std::env::var("OPENAI_API_BASE")
      .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
    api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
    model: std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4.1-mini".to_string()),
    system_prompt: "You are a desktop agent. Clarify the goal, propose an executable plan, and state the next action.".to_string(),
  }
}

fn normalize_settings(input: AgentSettingsInput) -> AgentSettings {
  let defaults = default_settings();
  AgentSettings {
    provider_name: if input.provider_name.trim().is_empty() {
      defaults.provider_name
    } else {
      input.provider_name.trim().to_string()
    },
    base_url: if input.base_url.trim().is_empty() {
      defaults.base_url
    } else {
      input.base_url.trim().trim_end_matches('/').to_string()
    },
    api_key: input.api_key.trim().to_string(),
    model: if input.model.trim().is_empty() {
      defaults.model
    } else {
      input.model.trim().to_string()
    },
    system_prompt: if input.system_prompt.trim().is_empty() {
      defaults.system_prompt
    } else {
      input.system_prompt.trim().to_string()
    },
  }
}

fn load_settings_in(conn: &Connection) -> Result<AgentSettings> {
  let raw: Option<String> = conn
    .query_row(
      "SELECT value FROM settings WHERE key = ?1",
      params![SETTINGS_KEY],
      |row| row.get(0),
    )
    .optional()?;

  match raw {
    Some(value) => serde_json::from_str(&value).or_else(|_| Ok(default_settings())),
    None => Ok(default_settings()),
  }
}

fn store_settings_in(conn: &Connection, settings: &AgentSettings) -> Result<()> {
  let payload = serde_json::to_string(settings)?;
  conn.execute(
    "INSERT INTO settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    params![SETTINGS_KEY, payload],
  )?;
  Ok(())
}

fn run_post_init_migrations_in(conn: &Connection) -> Result<()> {
  let migration_done: Option<String> = conn
    .query_row(
      "SELECT value FROM settings WHERE key = ?1",
      params![SESSION_SKILL_MIGRATION_KEY],
      |row| row.get(0),
    )
    .optional()?;

  if migration_done.is_none() {
    let mut enabled_skill_ids = Vec::new();
    let mut skills_stmt = conn.prepare("SELECT id FROM skills WHERE enabled = 1 ORDER BY id ASC")?;
    let skill_rows = skills_stmt.query_map([], |row| row.get::<_, i64>(0))?;
    for row in skill_rows {
      enabled_skill_ids.push(row?);
    }

    let has_session_skills: bool = conn
      .query_row(
        "SELECT EXISTS(SELECT 1 FROM session_skills LIMIT 1)",
        [],
        |row| row.get::<_, i64>(0),
      )
      .map(|value| value != 0)?;

    if !has_session_skills && !enabled_skill_ids.is_empty() {
      let mut session_ids = Vec::new();
      let mut session_stmt = conn.prepare("SELECT id FROM sessions ORDER BY id ASC")?;
      let session_rows = session_stmt.query_map([], |row| row.get::<_, i64>(0))?;
      for row in session_rows {
        session_ids.push(row?);
      }

      for session_id in session_ids {
        save_session_skills_in(conn, session_id, enabled_skill_ids.clone())?;
      }
    }

    conn.execute(
      "INSERT INTO settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![SESSION_SKILL_MIGRATION_KEY, "done"],
    )?;
  }

  seed_starter_skill_catalog_in(conn)?;

  Ok(())
}

fn seed_starter_skill_catalog_in(conn: &Connection) -> Result<()> {
  let migration_done: Option<String> = conn
    .query_row(
      "SELECT value FROM settings WHERE key = ?1",
      params![STARTER_SKILL_SEED_MIGRATION_KEY],
      |row| row.get(0),
    )
    .optional()?;

  if migration_done.is_none() {
    ensure_starter_skills_in(conn)?;
    conn.execute(
      "INSERT INTO settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![STARTER_SKILL_SEED_MIGRATION_KEY, "done"],
    )?;
  }

  Ok(())
}

fn ensure_starter_skills_in(conn: &Connection) -> Result<()> {
  for seed in STARTER_SKILL_SEEDS {
    if find_skill_id_by_names(conn, seed).is_some() {
      continue;
    }
    insert_starter_skill_in(conn, seed)?;
  }
  Ok(())
}

fn find_skill_id_by_names(conn: &Connection, seed: &StarterSkillSeed) -> Option<i64> {
  std::iter::once(seed.name)
    .chain(seed.legacy_names.iter().copied())
    .find_map(|name| {
      conn
        .query_row(
          "SELECT id FROM skills WHERE name = ?1 ORDER BY id ASC LIMIT 1",
          params![name],
          |row| row.get::<_, i64>(0),
        )
        .optional()
        .ok()
        .flatten()
    })
}

fn insert_starter_skill_in(conn: &Connection, seed: &StarterSkillSeed) -> Result<i64> {
  let now = now_millis();
  conn.execute(
    "INSERT INTO skills (name, description, instructions, trigger_hint, enabled, permission_level, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, 1, 'low', ?5, ?6)",
    params![
      seed.name,
      seed.description,
      seed.instructions,
      seed.trigger_hint,
      now,
      now
    ],
  )?;

  Ok(conn.last_insert_rowid())
}

fn ensure_seed_session_in(conn: &Connection) -> Result<i64> {
  let existing: Option<i64> = conn
    .query_row(
      "SELECT id FROM sessions ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  match existing {
    Some(id) => Ok(id),
    None => create_session_in(conn, Some("New Mission".to_string())),
  }
}

fn ensure_seed_note_in(conn: &Connection) -> Result<i64> {
  let existing: Option<i64> = conn
    .query_row(
      "SELECT id FROM notes ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  match existing {
    Some(id) => Ok(id),
    None => create_note_in(conn, Some("Welcome note".to_string())),
  }
}

fn ensure_seed_skill_in(conn: &Connection) -> Result<i64> {
  let existing: Option<i64> = conn
    .query_row(
      "SELECT id FROM skills ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  match existing {
    Some(id) => Ok(id),
    None => {
      ensure_starter_skills_in(conn)?;
      find_skill_id_by_names(conn, &STARTER_SKILL_SEEDS[0])
        .context("failed to seed starter skills")
    }
  }
}

fn create_session_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  let now = now_millis();
  let session_title = title
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(|value| value.to_string())
    .unwrap_or_else(|| "New Mission".to_string());

  conn.execute(
    "INSERT INTO sessions (title, status, created_at, updated_at)
     VALUES (?1, 'idle', ?2, ?3)",
    params![session_title, now, now],
  )?;
  let session_id = conn.last_insert_rowid();

  append_message_in(
    conn,
    session_id,
    "assistant",
    "Workspace ready. Configure an OpenAI-compatible endpoint to use the real Rust model path. Until then the runtime will return local preview responses.",
  )?;
  append_activity_in(
    conn,
    session_id,
    "system",
    "Workspace ready",
    "A new agent session has been created.",
    "completed",
  )?;

  Ok(session_id)
}

fn create_note_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  let now = now_millis();
  let note_title = title
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(|value| value.to_string())
    .unwrap_or_else(|| "Untitled note".to_string());
  let body = if note_title == "Welcome note" {
    "# Knowledge Vault\n\nUse this space for local notes, reusable prompts, product facts, and runbooks.\n\n- Keep durable context here.\n- Use short titles.\n- Tag notes so they are easy to filter later.".to_string()
  } else {
    format!("# {}\n\nStart writing here.", note_title)
  };

  conn.execute(
    "INSERT INTO notes (icon, title, body, tags, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params!["*", note_title, body, "[]", now, now],
  )?;

  Ok(conn.last_insert_rowid())
}

fn create_reminder_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  let now = now_millis();
  let reminder_title = title
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(|value| value.to_string())
    .unwrap_or_else(|| "New reminder".to_string());
  let linked_note_id: Option<i64> = conn
    .query_row(
      "SELECT id FROM notes ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  conn.execute(
    "INSERT INTO reminders (title, detail, due_at, severity, status, linked_note_id, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    params![
      reminder_title,
      "Capture the next action, attach a note, and set when it should surface again.",
      now + 60 * 60 * 1000,
      "medium",
      "scheduled",
      linked_note_id,
      now,
      now
    ],
  )?;

  Ok(conn.last_insert_rowid())
}

fn create_skill_in(conn: &Connection, name: Option<String>) -> Result<i64> {
  let now = now_millis();
  let skill_name = name
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(|value| value.to_string())
    .unwrap_or_else(|| "New skill".to_string());

  let (description, instructions, trigger_hint) = if skill_name == "Local note recall" {
    (
      "Guide the assistant to search and reuse local knowledge notes before answering."
        .to_string(),
      "Before answering, inspect the operator's local notes and prefer stable facts from the Knowledge Vault. If a note is relevant, mention that the answer should align with it. Keep the skill low-permission: no destructive actions, no external side effects, and no elevated access."
        .to_string(),
      "When the operator asks to use notes, prior context, documentation, or local knowledge.".to_string(),
    )
  } else {
    (
      "Describe what this custom skill should bias the agent toward.".to_string(),
      "Write the reusable instruction set for this skill. All custom skills run in low-permission mode only."
        .to_string(),
      "Describe when the agent should apply this skill.".to_string(),
    )
  };

  conn.execute(
    "INSERT INTO skills (name, description, instructions, trigger_hint, enabled, permission_level, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, 1, 'low', ?5, ?6)",
    params![skill_name, description, instructions, trigger_hint, now, now],
  )?;

  Ok(conn.last_insert_rowid())
}

fn save_note_in(conn: &Connection, input: KnowledgeNoteInput) -> Result<()> {
  let icon = if input.icon.trim().is_empty() {
    "*".to_string()
  } else {
    input.icon.trim().chars().take(2).collect::<String>()
  };
  let title = if input.title.trim().is_empty() {
    "Untitled note".to_string()
  } else {
    input.title.trim().to_string()
  };
  let body = input.body.trim().to_string();
  let tags = encode_tags(input.tags);

  conn.execute(
    "UPDATE notes
     SET icon = ?1, title = ?2, body = ?3, tags = ?4, updated_at = ?5
     WHERE id = ?6",
    params![icon, title, body, tags, now_millis(), input.id],
  )?;

  Ok(())
}

fn save_reminder_in(conn: &Connection, input: ReminderInput) -> Result<()> {
  let title = if input.title.trim().is_empty() {
    "New reminder".to_string()
  } else {
    input.title.trim().to_string()
  };
  let detail = input.detail.trim().to_string();
  let severity = match input.severity.trim() {
    "low" => "low",
    "high" => "high",
    "critical" => "critical",
    _ => "medium",
  };
  let status = if input.status.trim() == "done" {
    "done"
  } else {
    "scheduled"
  };
  let linked_note_id = input.linked_note_id.filter(|value| *value > 0);

  conn.execute(
    "UPDATE reminders
     SET title = ?1,
         detail = ?2,
         due_at = ?3,
         severity = ?4,
         status = ?5,
         linked_note_id = ?6,
         updated_at = ?7
     WHERE id = ?8",
    params![
      title,
      detail,
      input.due_at,
      severity,
      status,
      linked_note_id,
      now_millis(),
      input.id
    ],
  )?;

  Ok(())
}

fn save_skill_in(conn: &Connection, input: SkillInput) -> Result<()> {
  let name = if input.name.trim().is_empty() {
    "New skill".to_string()
  } else {
    input.name.trim().to_string()
  };
  let description = input.description.trim().to_string();
  let instructions = input.instructions.trim().to_string();
  let trigger_hint = input.trigger_hint.trim().to_string();

  conn.execute(
    "UPDATE skills
     SET name = ?1,
         description = ?2,
         instructions = ?3,
         trigger_hint = ?4,
         enabled = ?5,
         permission_level = 'low',
         updated_at = ?6
     WHERE id = ?7",
    params![
      name,
      description,
      instructions,
      trigger_hint,
      if input.enabled { 1 } else { 0 },
      now_millis(),
      input.id
    ],
  )?;

  Ok(())
}

fn save_session_skills_in(conn: &Connection, session_id: i64, skill_ids: Vec<i64>) -> Result<()> {
  conn.execute(
    "DELETE FROM session_skills WHERE session_id = ?1",
    params![session_id],
  )?;

  let mut unique_ids = skill_ids
    .into_iter()
    .filter(|value| *value > 0)
    .collect::<Vec<_>>();
  unique_ids.sort_unstable();
  unique_ids.dedup();

  for skill_id in unique_ids {
    let exists = conn
      .query_row(
        "SELECT EXISTS(SELECT 1 FROM skills WHERE id = ?1 AND enabled = 1)",
        params![skill_id],
        |row| row.get::<_, i64>(0),
      )
      .map(|value| value != 0)?;

    if exists {
      conn.execute(
        "INSERT OR IGNORE INTO session_skills (session_id, skill_id, created_at)
         VALUES (?1, ?2, ?3)",
        params![session_id, skill_id, now_millis()],
      )?;
    }
  }

  conn.execute(
    "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
    params![now_millis(), session_id],
  )?;

  Ok(())
}

fn build_workspace_snapshot_in(
  conn: &Connection,
  preferred_session_id: Option<i64>,
  preferred_note_id: Option<i64>,
  preferred_skill_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  let seed_session_id = ensure_seed_session_in(conn)?;
  let seed_note_id = ensure_seed_note_in(conn)?;
  let seed_skill_id = ensure_seed_skill_in(conn)?;
  let sessions = list_sessions_in(conn)?;
  let notes = list_notes_in(conn)?;
  let reminders = list_reminders_in(conn)?;
  let skills = list_skills_in(conn)?;

  let active_session_id = preferred_session_id
    .filter(|candidate| sessions.iter().any(|session| session.id == *candidate))
    .unwrap_or_else(|| sessions.first().map(|session| session.id).unwrap_or(seed_session_id));
  let active_note_id = preferred_note_id
    .filter(|candidate| notes.iter().any(|note| note.id == *candidate))
    .unwrap_or_else(|| notes.first().map(|note| note.id).unwrap_or(seed_note_id));
  let active_skill_id = preferred_skill_id
    .filter(|candidate| skills.iter().any(|skill| skill.id == *candidate))
    .unwrap_or_else(|| skills.first().map(|skill| skill.id).unwrap_or(seed_skill_id));

  let active_session = build_session_detail_in(conn, active_session_id)?;
  let active_note = build_note_detail_in(conn, active_note_id)?;
  let active_skill = build_skill_detail_in(conn, active_skill_id)?;

  Ok(WorkspaceSnapshot {
    settings: load_settings_in(conn)?,
    sessions,
    active_session_id,
    active_session,
    notes,
    active_note_id,
    active_note,
    reminders,
    skills,
    active_skill_id,
    active_skill,
    capabilities: capability_catalog(),
  })
}

fn list_sessions_in(conn: &Connection) -> Result<Vec<SessionSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, status, updated_at
     FROM sessions
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    Ok((
      row.get::<_, i64>(0)?,
      row.get::<_, String>(1)?,
      row.get::<_, String>(2)?,
      row.get::<_, i64>(3)?,
    ))
  })?;

  let mut sessions = Vec::new();
  for row in rows {
    let (id, title, status, updated_at) = row?;
    sessions.push(build_session_summary_in(conn, id, title, status, updated_at)?);
  }

  Ok(sessions)
}

fn list_notes_in(conn: &Connection) -> Result<Vec<KnowledgeNoteSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, icon, title, body, tags, updated_at
     FROM notes
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    Ok(KnowledgeNoteSummary {
      id: row.get(0)?,
      icon: row.get(1)?,
      title: row.get(2)?,
      summary: preview_text(&row.get::<_, String>(3)?, 120),
      tags: decode_tags(row.get(4)?),
      updated_at: row.get(5)?,
    })
  })?;

  let mut notes = Vec::new();
  for row in rows {
    notes.push(row?);
  }

  Ok(notes)
}

fn list_note_details_in(conn: &Connection, limit: usize) -> Result<Vec<KnowledgeNoteDetail>> {
  let mut stmt = conn.prepare(
    "SELECT id, icon, title, body, tags, created_at, updated_at
     FROM notes
     ORDER BY updated_at DESC, id DESC
     LIMIT ?1",
  )?;
  let rows = stmt.query_map(params![limit as i64], |row| {
    let body: String = row.get(3)?;
    let tags_json: String = row.get(4)?;
    Ok(KnowledgeNoteDetail {
      id: row.get(0)?,
      icon: row.get(1)?,
      title: row.get(2)?,
      summary: preview_text(&body, 120),
      body,
      tags: decode_tags(tags_json),
      created_at: row.get(5)?,
      updated_at: row.get(6)?,
    })
  })?;

  let mut notes = Vec::new();
  for row in rows {
    notes.push(row?);
  }

  Ok(notes)
}

fn list_reminders_in(conn: &Connection) -> Result<Vec<ReminderItem>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, detail, due_at, severity, status, linked_note_id, created_at, updated_at
     FROM reminders
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    let detail: String = row.get(2)?;
    Ok(ReminderItem {
      id: row.get(0)?,
      title: row.get(1)?,
      detail: detail.clone(),
      preview: preview_text(&detail, 120),
      due_at: row.get(3)?,
      severity: row.get(4)?,
      status: row.get(5)?,
      linked_note_id: row.get(6)?,
      created_at: row.get(7)?,
      updated_at: row.get(8)?,
    })
  })?;

  let mut reminders = Vec::new();
  for row in rows {
    reminders.push(row?);
  }

  Ok(reminders)
}

fn list_skills_in(conn: &Connection) -> Result<Vec<SkillSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, name, description, trigger_hint, enabled, permission_level, updated_at
     FROM skills
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    let description: String = row.get(2)?;
    Ok(SkillSummary {
      id: row.get(0)?,
      name: row.get(1)?,
      summary: preview_text(&description, 120),
      trigger_hint: row.get(3)?,
      recommendation_reason: None,
      enabled: row.get::<_, i64>(4)? != 0,
      permission_level: row.get(5)?,
      updated_at: row.get(6)?,
    })
  })?;

  let mut skills = Vec::new();
  for row in rows {
    skills.push(row?);
  }

  Ok(skills)
}

fn list_session_enabled_skills_in(conn: &Connection, session_id: i64) -> Result<Vec<SkillDetail>> {
  let mut stmt = conn.prepare(
    "SELECT id, name, description, instructions, trigger_hint, enabled, permission_level, created_at, updated_at
     FROM skills
     WHERE enabled = 1
       AND id IN (
         SELECT skill_id
         FROM session_skills
         WHERE session_id = ?1
       )
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| {
    let description: String = row.get(2)?;
    Ok(SkillDetail {
      id: row.get(0)?,
      name: row.get(1)?,
      description: description.clone(),
      summary: preview_text(&description, 120),
      instructions: row.get(3)?,
      trigger_hint: row.get(4)?,
      enabled: row.get::<_, i64>(5)? != 0,
      permission_level: row.get(6)?,
      created_at: row.get(7)?,
      updated_at: row.get(8)?,
    })
  })?;

  let mut skills = Vec::new();
  for row in rows {
    skills.push(row?);
  }

  Ok(skills)
}

fn list_session_skill_ids_in(conn: &Connection, session_id: i64) -> Result<Vec<i64>> {
  let mut stmt = conn.prepare(
    "SELECT ss.skill_id
     FROM session_skills ss
     INNER JOIN skills s ON s.id = ss.skill_id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, ss.skill_id ASC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| row.get::<_, i64>(0))?;

  let mut skill_ids = Vec::new();
  for row in rows {
    skill_ids.push(row?);
  }

  Ok(skill_ids)
}

fn list_session_skills_in(conn: &Connection, session_id: i64) -> Result<Vec<SkillSummary>> {
  let mut stmt = conn.prepare(
    "SELECT s.id, s.name, s.description, s.trigger_hint, s.enabled, s.permission_level, s.updated_at
     FROM skills s
     INNER JOIN session_skills ss ON ss.skill_id = s.id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, s.id ASC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| {
    let description: String = row.get(2)?;
    Ok(SkillSummary {
      id: row.get(0)?,
      name: row.get(1)?,
      summary: preview_text(&description, 120),
      trigger_hint: row.get(3)?,
      recommendation_reason: None,
      enabled: row.get::<_, i64>(4)? != 0,
      permission_level: row.get(5)?,
      updated_at: row.get(6)?,
    })
  })?;

  let mut skills = Vec::new();
  for row in rows {
    skills.push(row?);
  }

  Ok(skills)
}

fn build_session_summary_in(
  conn: &Connection,
  id: i64,
  title: String,
  status: String,
  updated_at: i64,
) -> Result<SessionSummary> {
  let message_count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM messages WHERE session_id = ?1",
    params![id],
    |row| row.get(0),
  )?;

  let last_message_preview = conn
    .query_row(
      "SELECT content FROM messages WHERE session_id = ?1 ORDER BY id DESC LIMIT 1",
      params![id],
      |row| row.get::<_, String>(0),
    )
    .optional()?
    .unwrap_or_default();
  let mounted_skill_count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM session_skills WHERE session_id = ?1",
    params![id],
    |row| row.get(0),
  )?;

  Ok(SessionSummary {
    id,
    title,
    status,
    updated_at,
    message_count,
    last_message_preview: preview_text(&last_message_preview, 92),
    mounted_skill_count,
  })
}

fn build_session_detail_in(conn: &Connection, session_id: i64) -> Result<SessionDetail> {
  let base = conn
    .query_row(
      "SELECT id, title, status, updated_at FROM sessions WHERE id = ?1",
      params![session_id],
      |row| {
        Ok((
          row.get::<_, i64>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, String>(2)?,
          row.get::<_, i64>(3)?,
        ))
      },
    )
    .optional()?
    .context("session not found")?;

  let session = build_session_summary_in(conn, base.0, base.1, base.2, base.3)?;

  let mut messages_stmt = conn.prepare(
    "SELECT id, role, content, created_at
     FROM messages
     WHERE session_id = ?1
     ORDER BY created_at ASC, id ASC",
  )?;
  let message_rows = messages_stmt.query_map(params![session_id], |row| {
    Ok(ChatMessage {
      id: row.get(0)?,
      role: row.get(1)?,
      content: row.get(2)?,
      created_at: row.get(3)?,
    })
  })?;
  let mut messages = Vec::new();
  for row in message_rows {
    messages.push(row?);
  }

  let mut activity_stmt = conn.prepare(
    "SELECT id, kind, title, detail, status, created_at
     FROM activity
     WHERE session_id = ?1
     ORDER BY created_at DESC, id DESC
     LIMIT 24",
  )?;
  let activity_rows = activity_stmt.query_map(params![session_id], |row| {
    Ok(ActivityItem {
      id: row.get(0)?,
      kind: row.get(1)?,
      title: row.get(2)?,
      detail: row.get(3)?,
      status: row.get(4)?,
      created_at: row.get(5)?,
    })
  })?;
  let mut activity = Vec::new();
  for row in activity_rows {
    activity.push(row?);
  }
  let mounted_skill_ids = list_session_skill_ids_in(conn, session_id)?;
  let mounted_skills = list_session_skills_in(conn, session_id)?;
  let recommended_skills = recommend_session_skills_in(conn, session_id, &mounted_skill_ids, 4)?;

  Ok(SessionDetail {
    session,
    messages,
    activity,
    mounted_skill_ids,
    mounted_skills,
    recommended_skills,
  })
}

fn recommend_session_skills_in(
  conn: &Connection,
  session_id: i64,
  mounted_skill_ids: &[i64],
  limit: usize,
) -> Result<Vec<SkillSummary>> {
  let session_summary = conn
    .query_row(
      "SELECT title FROM sessions WHERE id = ?1",
      params![session_id],
      |row| row.get::<_, String>(0),
    )
    .optional()?
    .unwrap_or_default();

  let mut stmt = conn.prepare(
    "SELECT content
     FROM messages
     WHERE session_id = ?1
     ORDER BY created_at DESC, id DESC
     LIMIT 10",
  )?;
  let rows = stmt.query_map(params![session_id], |row| row.get::<_, String>(0))?;
  let mut message_fragments = Vec::new();
  for row in rows {
    message_fragments.push(row?);
  }
  message_fragments.reverse();

  let session_text = format!("{} {}", session_summary, message_fragments.join(" "));
  let session_haystack = session_text.to_lowercase();
  let keywords = extract_recommendation_keywords(&session_haystack);
  let skills = list_skills_in(conn)?;

  let mut ranked = skills
    .into_iter()
    .filter(|skill| skill.enabled && !mounted_skill_ids.contains(&skill.id))
    .map(|mut skill| {
      let (score, reason) = score_skill_recommendation(&skill, &session_haystack, &keywords);
      skill.recommendation_reason = reason;
      (score, skill)
    })
    .filter(|(score, _)| *score > 0)
    .collect::<Vec<_>>();

  ranked.sort_by(|left, right| {
    right
      .0
      .cmp(&left.0)
      .then_with(|| right.1.enabled.cmp(&left.1.enabled))
      .then_with(|| right.1.updated_at.cmp(&left.1.updated_at))
  });

  Ok(ranked.into_iter().take(limit).map(|(_, skill)| skill).collect())
}

fn extract_recommendation_keywords(text: &str) -> Vec<String> {
  let mut keywords = text
    .split(|ch: char| !ch.is_alphanumeric() && !is_cjk_character(ch))
    .map(str::trim)
    .filter(|part| part.chars().count() >= 2)
    .map(str::to_string)
    .collect::<Vec<_>>();

  keywords.sort();
  keywords.dedup();
  keywords
}

fn score_skill_recommendation(
  skill: &SkillSummary,
  session_haystack: &str,
  keywords: &[String],
) -> (i64, Option<String>) {
  let searchable = format!(
    "{} {} {}",
    skill.name.to_lowercase(),
    skill.summary.to_lowercase(),
    skill.trigger_hint.to_lowercase()
  );

  let mut score = if skill.enabled { 2 } else { 0 };
  let mut matched_terms = Vec::new();

  for keyword in keywords {
    if searchable.contains(keyword) {
      score += 2;
      matched_terms.push(keyword.clone());
    }
    if skill.name.to_lowercase().contains(keyword) {
      score += 3;
      matched_terms.push(keyword.clone());
    }
  }

  score += score_skill_recommendation_from_intent(skill, session_haystack, &mut matched_terms);
  matched_terms.sort();
  matched_terms.dedup();

  (
    score,
    build_skill_recommendation_reason(session_haystack, &matched_terms),
  )
}

fn score_skill_recommendation_from_intent(
  skill: &SkillSummary,
  session_haystack: &str,
  matched_terms: &mut Vec<String>,
) -> i64 {
  let skill_name = skill.name.to_lowercase();
  let mut capture_match = |patterns: &[&str]| {
    let found = patterns
      .iter()
      .filter(|pattern| session_haystack.contains(**pattern))
      .map(|pattern| pattern.to_string())
      .collect::<Vec<_>>();
    if !found.is_empty() {
      matched_terms.extend(found);
      true
    } else {
      false
    }
  };

  if skill_name.contains("note recall")
    || skill_name.contains("local note recall")
    || skill_name.contains("笔记召回")
  {
    return if capture_match(&["note", "notes", "knowledge", "context", "文档", "笔记", "知识"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("knowledge librarian") || skill_name.contains("知识整理员") {
    return if capture_match(&["summary", "summarize", "整理", "归档", "note", "沉淀", "知识库"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("reminder radar") || skill_name.contains("提醒雷达") {
    return if capture_match(&["todo", "deadline", "follow-up", "follow up", "remind", "待办", "截止", "提醒"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("weather brief") || skill_name.contains("天气简报") {
    return if capture_match(&["weather", "forecast", "temperature", "rain", "travel", "天气", "降雨", "温度", "出行"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("music companion") || skill_name.contains("音乐伴听") {
    return if capture_match(&["music", "playlist", "song", "track", "mood", "音乐", "歌单", "曲目", "氛围"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("gallery curator") || skill_name.contains("画廊策展") {
    return if capture_match(&["gallery", "album", "photo", "image", "caption", "图库", "相册", "照片", "图片"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("settings steward") || skill_name.contains("设置管家") {
    return if capture_match(&["setting", "provider", "api key", "cache", "配置", "设置", "缓存", "网关"]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("release guard") || skill_name.contains("发布守卫") {
    return if capture_match(&["deploy", "migration", "auth", "billing", "delete", "发布", "迁移", "鉴权", "删除"]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("ui polish") || skill_name.contains("界面打磨") {
    return if capture_match(&["ui", "layout", "css", "frontend", "design", "界面", "布局", "前端", "样式"]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("research mode") || skill_name.contains("研究模式") {
    return if capture_match(&["research", "source", "docs", "verify", "citation", "文档", "核验", "出处", "来源"]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("task router") || skill_name.contains("任务路由") {
    return if capture_match(&["plan", "steps", "multi-step", "complex", "规划", "步骤", "复杂", "拆解"]) {
      6
    } else {
      0
    };
  }

  0
}

fn build_skill_recommendation_reason(
  session_haystack: &str,
  matched_terms: &[String],
) -> Option<String> {
  if matched_terms.is_empty() {
    return None;
  }

  let reason_terms = matched_terms
    .iter()
    .take(3)
    .map(|term| term.trim())
    .filter(|term| !term.is_empty())
    .collect::<Vec<_>>();

  if reason_terms.is_empty() {
    return None;
  }

  let is_zh = session_haystack.chars().any(is_cjk_character);
  Some(if is_zh {
    format!("匹配到当前会话里的关键词：{}。", reason_terms.join(" / "))
  } else {
    format!("Matched session topics: {}.", reason_terms.join(" / "))
  })
}

fn is_cjk_character(ch: char) -> bool {
  matches!(
    ch as u32,
    0x4E00..=0x9FFF | 0x3400..=0x4DBF | 0xF900..=0xFAFF
  )
}

fn build_note_detail_in(conn: &Connection, note_id: i64) -> Result<KnowledgeNoteDetail> {
  let note = conn
    .query_row(
      "SELECT id, icon, title, body, tags, created_at, updated_at
       FROM notes
       WHERE id = ?1",
      params![note_id],
      |row| {
        let body: String = row.get(3)?;
        let tags_json: String = row.get(4)?;
        Ok(KnowledgeNoteDetail {
          id: row.get(0)?,
          icon: row.get(1)?,
          title: row.get(2)?,
          summary: preview_text(&body, 120),
          body,
          tags: decode_tags(tags_json),
          created_at: row.get(5)?,
          updated_at: row.get(6)?,
        })
      },
    )
    .optional()?
    .context("note not found")?;

  Ok(note)
}

fn build_skill_detail_in(conn: &Connection, skill_id: i64) -> Result<SkillDetail> {
  let skill = conn
    .query_row(
      "SELECT id, name, description, instructions, trigger_hint, enabled, permission_level, created_at, updated_at
       FROM skills
       WHERE id = ?1",
      params![skill_id],
      |row| {
        let description: String = row.get(2)?;
        Ok(SkillDetail {
          id: row.get(0)?,
          name: row.get(1)?,
          description: description.clone(),
          summary: preview_text(&description, 120),
          instructions: row.get(3)?,
          trigger_hint: row.get(4)?,
          enabled: row.get::<_, i64>(5)? != 0,
          permission_level: row.get(6)?,
          created_at: row.get(7)?,
          updated_at: row.get(8)?,
        })
      },
    )
    .optional()?
    .context("skill not found")?;

  Ok(skill)
}

fn append_message_in(conn: &Connection, session_id: i64, role: &str, content: &str) -> Result<()> {
  let now = now_millis();
  conn.execute(
    "INSERT INTO messages (session_id, role, content, created_at)
     VALUES (?1, ?2, ?3, ?4)",
    params![session_id, role, content.trim(), now],
  )?;
  conn.execute(
    "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
    params![now, session_id],
  )?;
  Ok(())
}

fn append_activity_in(
  conn: &Connection,
  session_id: i64,
  kind: &str,
  title: &str,
  detail: &str,
  status: &str,
) -> Result<()> {
  let now = now_millis();
  conn.execute(
    "INSERT INTO activity (session_id, kind, title, detail, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![session_id, kind, title, detail, status, now],
  )?;
  conn.execute(
    "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
    params![now, session_id],
  )?;
  Ok(())
}

fn touch_session_in(conn: &Connection, session_id: i64, status: &str) -> Result<()> {
  conn.execute(
    "UPDATE sessions SET status = ?1, updated_at = ?2 WHERE id = ?3",
    params![status, now_millis(), session_id],
  )?;
  Ok(())
}

fn decode_tags(raw: String) -> Vec<String> {
  serde_json::from_str::<Vec<String>>(&raw).unwrap_or_default()
}

fn encode_tags(tags: Vec<String>) -> String {
  let cleaned = tags
    .into_iter()
    .map(|tag| tag.trim().to_string())
    .filter(|tag| !tag.is_empty())
    .collect::<Vec<_>>();
  serde_json::to_string(&cleaned).unwrap_or_else(|_| "[]".to_string())
}

fn preview_text(content: &str, limit: usize) -> String {
  let normalized = content.split_whitespace().collect::<Vec<_>>().join(" ");
  if normalized.chars().count() <= limit {
    return normalized;
  }

  normalized.chars().take(limit).collect::<String>() + "..."
}

fn infer_title(prompt: &str) -> String {
  let compact = prompt.split_whitespace().collect::<Vec<_>>().join(" ");
  let shortened = compact.chars().take(28).collect::<String>();
  if shortened.is_empty() {
    "New Mission".to_string()
  } else {
    shortened
  }
}

fn capability_catalog() -> Vec<Capability> {
  vec![
    Capability {
      id: "runtime".to_string(),
      title: "Rust Runtime".to_string(),
      description: "Rust owns persistence, orchestration and the model entrypoint.".to_string(),
      status: "ready".to_string(),
    },
    Capability {
      id: "gateway".to_string(),
      title: "LLM Gateway".to_string(),
      description: "OpenAI chat completions compatible model path.".to_string(),
      status: "ready".to_string(),
    },
    Capability {
      id: "trace".to_string(),
      title: "Execution Trace".to_string(),
      description: "Each mission stores input, plan, model result and persistence state.".to_string(),
      status: "ready".to_string(),
    },
    Capability {
      id: "knowledge".to_string(),
      title: "Knowledge Vault".to_string(),
      description: "Local notes can be used as a durable knowledge base.".to_string(),
      status: "ready".to_string(),
    },
    Capability {
      id: "reminders".to_string(),
      title: "Reminder Center".to_string(),
      description: "Time-based note follow-ups stay local and schedulable.".to_string(),
      status: "ready".to_string(),
    },
    Capability {
      id: "skills".to_string(),
      title: "Custom Skills".to_string(),
      description: "Reusable prompt skills with low-permission execution only.".to_string(),
      status: "ready".to_string(),
    },
    Capability {
      id: "desktop".to_string(),
      title: "Tauri Shell".to_string(),
      description: "Desktop packaging path for multi-platform distribution.".to_string(),
      status: "ready".to_string(),
    },
  ]
}
