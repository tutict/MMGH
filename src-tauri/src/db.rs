use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use reqwest::Url;
use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};
use serde::{Deserialize, Serialize};

use crate::cmd::{AgentSettingsInput, KnowledgeNoteInput, ReminderInput, SkillInput};

static SNAPSHOT_CACHE: Lazy<Mutex<Option<WorkspaceSnapshot>>> = Lazy::new(|| Mutex::new(None));
static SETTINGS_CACHE: Lazy<Mutex<Option<AgentSettings>>> = Lazy::new(|| Mutex::new(None));
static RUNTIME_API_KEY: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
static APP_DATA_DIR: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));
static DB_INIT_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));
static DB_INIT_PATH: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));
static CAPABILITY_CATALOG: Lazy<Vec<Capability>> = Lazy::new(build_capability_catalog);
const SETTINGS_KEY: &str = "agent_settings_v1";
#[cfg_attr(test, allow(dead_code))]
const API_KEYRING_SERVICE: &str = "mmgh-agent-desktop";
#[cfg_attr(test, allow(dead_code))]
const API_KEYRING_ACCOUNT: &str = "provider-api-key";
const SESSION_SKILL_MIGRATION_KEY: &str = "session_skill_mount_migration_v1";
const STARTER_SKILL_SEED_MIGRATION_KEY: &str = "starter_skill_seed_migration_v1";
const STARTER_SKILL_CATALOG_VERSION_KEY: &str = "starter_skill_catalog_version";
const STARTER_SKILL_DELETED_TOMBSTONES_KEY: &str = "starter_skill_deleted_tombstones_v1";
const LEGACY_STARTER_SKILL_CATALOG_VERSION: u32 = 1;
const STARTER_SKILL_CATALOG_VERSION: u32 = 2;
const DEFAULT_SESSION_TITLE: &str = "New Mission";

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
  #[serde(default)]
  pub has_api_key: bool,
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

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
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

#[derive(Debug, Clone)]
pub struct AgentSessionContext {
  pub title: String,
  pub status: String,
  pub message_count: usize,
  pub mounted_skill_names: Vec<String>,
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

#[derive(Debug, Clone)]
pub struct KnowledgeNoteContext {
  pub title: String,
  pub summary: String,
  pub body_excerpt: String,
  pub tags: Vec<String>,
  pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderSummary {
  pub id: i64,
  pub title: String,
  pub preview: String,
  pub due_at: Option<i64>,
  pub severity: String,
  pub status: String,
  pub linked_note_id: Option<i64>,
  pub updated_at: i64,
}

#[derive(Debug, Clone)]
pub struct ReminderContextItem {
  pub title: String,
  pub severity: String,
  pub due_at: Option<i64>,
  pub linked_note_title: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderDetail {
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

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
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
  pub reminders: Vec<ReminderSummary>,
  pub active_reminder_id: i64,
  pub active_reminder: ReminderDetail,
  pub skills: Vec<SkillSummary>,
  pub active_skill_id: i64,
  pub active_skill: SkillDetail,
  pub capabilities: Vec<Capability>,
}

#[derive(Debug, Clone, Copy, Default)]
struct SnapshotReusePolicy {
  reuse_session_list: bool,
  reuse_active_session_timeline: bool,
  reuse_note_list: bool,
  reuse_active_note_detail: bool,
  reuse_reminder_list: bool,
  reuse_active_reminder_detail: bool,
  reuse_skill_list: bool,
  reuse_active_skill_detail: bool,
}

impl SnapshotReusePolicy {
  fn read_only() -> Self {
    Self {
      reuse_session_list: true,
      reuse_active_session_timeline: true,
      reuse_note_list: true,
      reuse_active_note_detail: true,
      reuse_reminder_list: true,
      reuse_active_reminder_detail: true,
      reuse_skill_list: true,
      reuse_active_skill_detail: true,
    }
  }

  fn uses_cached_snapshot(self) -> bool {
    self.reuse_session_list
      || self.reuse_active_session_timeline
      || self.reuse_note_list
      || self.reuse_active_note_detail
      || self.reuse_reminder_list
      || self.reuse_active_reminder_detail
      || self.reuse_skill_list
      || self.reuse_active_skill_detail
  }
}

pub fn bootstrap() -> Result<WorkspaceSnapshot> {
  workspace_snapshot(None)
}

pub fn open_session(session_id: i64) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    ensure_session_exists_in(conn, session_id)?;
    build_workspace_snapshot_with_policy_in(
      conn,
      Some(session_id),
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )
  })
}

pub fn create_session(title: Option<String>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let session = create_session_detail_in(conn, title)?;
    let seeded_snapshot = seed_snapshot_for_session_create(cached_snapshot, session.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      Some(session.session.id),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn delete_session(session_id: i64) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    delete_session_in(conn, session_id)?;
    ensure_seed_session_in(conn)?;
    let seeded_snapshot = seed_snapshot_for_session_delete(cached_snapshot, session_id);
    let can_reuse_session_list = seeded_snapshot
      .as_ref()
      .map(|snapshot| !snapshot.sessions.is_empty())
      .unwrap_or(false);
    let can_reuse_active_session_timeline = seeded_snapshot
      .as_ref()
      .map(|snapshot| {
        can_reuse_session_list
          && snapshot.active_session_id > 0
          && snapshot.active_session.session.id == snapshot.active_session_id
      })
      .unwrap_or(false);
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: can_reuse_session_list,
        reuse_active_session_timeline: can_reuse_active_session_timeline,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn save_settings(
  input: AgentSettingsInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let settings = merge_settings_input(load_settings_in(conn)?, input);
    validate_provider_base_url(&settings.base_url)?;
    store_settings_in(conn, &settings)?;
    build_workspace_snapshot_with_policy_in(
      conn,
      active_session_id,
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )
  })
}

pub fn open_note(note_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    ensure_note_exists_in(conn, note_id)?;
    build_workspace_snapshot_with_policy_in(
      conn,
      active_session_id,
      Some(note_id),
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )
  })
}

pub fn create_note(
  title: Option<String>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let note = create_note_detail_in(conn, title)?;
    let seeded_snapshot = seed_snapshot_for_note_upsert(cached_snapshot, note.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      Some(note.id),
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn save_note(
  input: KnowledgeNoteInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let note = save_note_detail_in(conn, input)?;
    let seeded_snapshot = seed_snapshot_for_note_upsert(cached_snapshot, note.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      Some(note.id),
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn delete_note(note_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    delete_note_in(conn, note_id)?;
    ensure_seed_note_in(conn)?;
    let seeded_snapshot = seed_snapshot_for_note_delete(cached_snapshot, note_id);
    let can_reuse_note_list = seeded_snapshot
      .as_ref()
      .map(|snapshot| !snapshot.notes.is_empty())
      .unwrap_or(false);
    let can_reuse_active_note_detail = seeded_snapshot
      .as_ref()
      .map(|snapshot| can_reuse_note_list && snapshot.active_note.id == snapshot.active_note_id)
      .unwrap_or(false);
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: can_reuse_note_list,
        reuse_active_note_detail: can_reuse_active_note_detail,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn open_reminder(
  reminder_id: i64,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    ensure_reminder_exists_in(conn, reminder_id)?;
    build_workspace_snapshot_with_policy_in(
      conn,
      active_session_id,
      None,
      Some(reminder_id),
      None,
      SnapshotReusePolicy::read_only(),
    )
  })
}

pub fn create_reminder(
  title: Option<String>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let reminder = create_reminder_detail_in(conn, title)?;
    let seeded_snapshot = seed_snapshot_for_reminder_upsert(cached_snapshot, reminder.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      Some(reminder.id),
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn save_reminder(
  input: ReminderInput,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let reminder = save_reminder_detail_in(conn, input)?;
    let seeded_snapshot = seed_snapshot_for_reminder_upsert(cached_snapshot, reminder.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      Some(reminder.id),
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn delete_reminder(
  reminder_id: i64,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    delete_reminder_in(conn, reminder_id)?;
    let seeded_snapshot = seed_snapshot_for_reminder_delete(cached_snapshot, reminder_id);
    let can_reuse_active_reminder_detail = seeded_snapshot
      .as_ref()
      .map(|snapshot| snapshot.active_reminder.id == snapshot.active_reminder_id)
      .unwrap_or(false);
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: can_reuse_active_reminder_detail,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn open_skill(skill_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    ensure_skill_exists_in(conn, skill_id)?;
    build_workspace_snapshot_with_policy_in(
      conn,
      active_session_id,
      None,
      None,
      Some(skill_id),
      SnapshotReusePolicy::read_only(),
    )
  })
}

pub fn create_skill(
  name: Option<String>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let skill = create_skill_detail_for_active_session_in(conn, name, active_session_id)?;
    let seeded_snapshot = seed_snapshot_for_skill_upsert(cached_snapshot, skill.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      None,
      Some(skill.id),
      SnapshotReusePolicy {
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn save_skill(input: SkillInput, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let skill = save_skill_detail_in(conn, input)?;
    let seeded_snapshot = seed_snapshot_for_skill_upsert(cached_snapshot, skill.clone());
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      None,
      Some(skill.id),
      SnapshotReusePolicy {
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn delete_skill(skill_id: i64, active_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    delete_skill_in(conn, skill_id)?;
    ensure_seed_skill_in(conn)?;
    let seeded_snapshot = seed_snapshot_for_skill_delete(cached_snapshot, skill_id);
    let can_reuse_skill_list = seeded_snapshot
      .as_ref()
      .map(|snapshot| !snapshot.skills.is_empty())
      .unwrap_or(false);
    let can_reuse_active_skill_detail = seeded_snapshot
      .as_ref()
      .map(|snapshot| can_reuse_skill_list && snapshot.active_skill.id == snapshot.active_skill_id)
      .unwrap_or(false);
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id,
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: can_reuse_skill_list,
        reuse_active_skill_detail: can_reuse_active_skill_detail,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn save_session_skills(
  session_id: i64,
  skill_ids: Vec<i64>,
  active_session_id: Option<i64>,
) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    let cached_snapshot = read_snapshot_cache()?;
    let active_session_id = resolve_active_session_id_in(conn, active_session_id)?;
    let mounted_skill_ids = save_session_skills_in(conn, session_id, skill_ids)?;
    let session = load_session_summary_in(conn, session_id)?;
    let seeded_snapshot =
      seed_snapshot_for_session_skills_save(cached_snapshot, session.clone(), mounted_skill_ids);
    build_workspace_snapshot_with_seed_snapshot_in(
      conn,
      active_session_id.or(Some(session_id)),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
  })
}

pub fn persist_agent_run(
  session_id: i64,
  prompt: &str,
  runtime_context_detail: &str,
  plan: &str,
  model_title: &str,
  model_detail: &str,
  model_status: &str,
  reply: &str,
) -> Result<WorkspaceSnapshot> {
  with_transaction(|tx| {
    let cached_snapshot = read_snapshot_cache()?;
    ensure_session_exists_in(tx, session_id)?;
    touch_session_in(tx, session_id, "running")?;
    let user_message = append_message_in(tx, session_id, "user", prompt)?;
    ensure_session_title_in(tx, session_id, prompt)?;
    let input_activity = append_activity_in(
      tx,
      session_id,
      "input",
      "Mission received",
      &format!("New mission captured: {}", preview_text(prompt, 120)),
      "completed",
    )?;
    let runtime_activity = append_activity_in(
      tx,
      session_id,
      "system",
      "Runtime context staged",
      runtime_context_detail,
      "completed",
    )?;
    let plan_activity = append_activity_in(
      tx,
      session_id,
      "plan",
      "Execution plan drafted",
      plan,
      "completed",
    )?;
    let model_activity = append_activity_in(
      tx,
      session_id,
      "model",
      model_title,
      model_detail,
      model_status,
    )?;
    let assistant_message = append_message_in(tx, session_id, "assistant", reply)?;
    let output_activity = append_activity_in(
      tx,
      session_id,
      "output",
      "Reply persisted",
      "Assistant output has been stored in the session log.",
      "completed",
    )?;
    touch_session_in(tx, session_id, "ready")?;
    let updated_session = load_session_summary_in(tx, session_id)?;
    let seeded_snapshot = seed_snapshot_for_persisted_run(
      cached_snapshot,
      session_id,
      updated_session,
      &[user_message, assistant_message],
      &[
        input_activity,
        runtime_activity,
        plan_activity,
        model_activity,
        output_activity,
      ],
    );
    build_workspace_snapshot_with_seed_snapshot_in(
      tx,
      Some(session_id),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )
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
    Some(value) => {
      let merged = merge_settings_input(load_settings()?, value);
      validate_provider_base_url(&merged.base_url)?;
      Ok(merged)
    }
    None => load_settings(),
  }
}

#[cfg_attr(test, allow(dead_code))]
pub fn recent_note_details(limit: usize) -> Result<Vec<KnowledgeNoteDetail>> {
  with_connection(|conn| list_note_details_in(conn, limit))
}

pub fn recent_note_context(
  limit: usize,
  body_char_limit: usize,
) -> Result<Vec<KnowledgeNoteContext>> {
  with_connection(|conn| list_note_context_in(conn, limit, body_char_limit))
}

pub fn agent_session_context(session_id: i64) -> Result<AgentSessionContext> {
  with_connection(|conn| load_agent_session_context_in(conn, session_id))
}

pub fn open_reminder_context(limit: usize) -> Result<Vec<ReminderContextItem>> {
  with_connection(|conn| list_open_reminder_context_in(conn, limit))
}

pub fn capability_titles() -> Vec<String> {
  capability_catalog()
    .into_iter()
    .map(|capability| capability.title)
    .collect()
}

pub fn workspace_snapshot(preferred_session_id: Option<i64>) -> Result<WorkspaceSnapshot> {
  with_connection(|conn| {
    build_workspace_snapshot_with_policy_in(
      conn,
      preferred_session_id,
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )
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
  let conn = open_database_connection()?;
  action(&conn)
}

fn read_snapshot_cache() -> Result<Option<WorkspaceSnapshot>> {
  let guard = SNAPSHOT_CACHE
    .lock()
    .map_err(|_| anyhow!("snapshot cache mutex poisoned"))?;
  Ok(guard.clone())
}

fn read_settings_cache() -> Result<Option<AgentSettings>> {
  let guard = SETTINGS_CACHE
    .lock()
    .map_err(|_| anyhow!("settings cache mutex poisoned"))?;
  Ok(guard.clone())
}

fn store_snapshot_cache(snapshot: &WorkspaceSnapshot) -> Result<()> {
  let mut guard = SNAPSHOT_CACHE
    .lock()
    .map_err(|_| anyhow!("snapshot cache mutex poisoned"))?;
  *guard = Some(snapshot.clone());
  Ok(())
}

fn store_settings_cache(settings: &AgentSettings) -> Result<()> {
  let mut guard = SETTINGS_CACHE
    .lock()
    .map_err(|_| anyhow!("settings cache mutex poisoned"))?;
  *guard = Some(settings.clone());
  Ok(())
}

fn clear_snapshot_cache() -> Result<()> {
  let mut guard = SNAPSHOT_CACHE
    .lock()
    .map_err(|_| anyhow!("snapshot cache mutex poisoned"))?;
  *guard = None;
  Ok(())
}

fn clear_settings_cache() -> Result<()> {
  let mut guard = SETTINGS_CACHE
    .lock()
    .map_err(|_| anyhow!("settings cache mutex poisoned"))?;
  *guard = None;
  Ok(())
}

fn clear_db_init_path() -> Result<()> {
  let mut guard = DB_INIT_PATH
    .lock()
    .map_err(|_| anyhow!("database init path mutex poisoned"))?;
  *guard = None;
  Ok(())
}

fn open_database_connection() -> Result<Connection> {
  let path = db_path()?;
  let conn = Connection::open(&path)?;
  conn.busy_timeout(std::time::Duration::from_secs(5))?;
  conn.execute_batch("PRAGMA foreign_keys = ON;")?;
  ensure_database_initialized(&conn, &path)?;
  Ok(conn)
}

fn ensure_database_initialized(conn: &Connection, path: &PathBuf) -> Result<()> {
  let initialized = {
    let guard = DB_INIT_PATH
      .lock()
      .map_err(|_| anyhow!("database init path mutex poisoned"))?;
    guard.as_ref().is_some_and(|current| current == path)
  };
  if initialized {
    return Ok(());
  }

  let _init_guard = DB_INIT_LOCK
    .lock()
    .map_err(|_| anyhow!("database init mutex poisoned"))?;

  let already_initialized = {
    let guard = DB_INIT_PATH
      .lock()
      .map_err(|_| anyhow!("database init path mutex poisoned"))?;
    guard.as_ref().is_some_and(|current| current == path)
  };
  if already_initialized {
    return Ok(());
  }

  conn.execute_batch(include_str!("../sql/schema.sql"))?;
  run_post_init_migrations_in(conn)?;

  let mut guard = DB_INIT_PATH
    .lock()
    .map_err(|_| anyhow!("database init path mutex poisoned"))?;
  *guard = Some(path.clone());
  Ok(())
}

fn with_transaction<T, F>(action: F) -> Result<T>
where
  F: FnOnce(&Transaction<'_>) -> Result<T>,
{
  let mut conn = open_database_connection()?;
  let tx = conn.transaction()?;
  let result = action(&tx)?;
  tx.commit()?;
  Ok(result)
}

pub fn set_app_data_dir(path: PathBuf) -> Result<()> {
  let mut guard = APP_DATA_DIR
    .lock()
    .map_err(|_| anyhow!("app data dir mutex poisoned"))?;
  *guard = Some(path);
  clear_snapshot_cache()?;
  clear_settings_cache()?;
  clear_db_init_path()?;
  Ok(())
}

fn app_data_dir() -> Option<PathBuf> {
  APP_DATA_DIR.lock().ok().and_then(|guard| guard.clone())
}

fn db_path() -> Result<PathBuf> {
  let base_dir = app_data_dir()
    .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
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
  let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
  AgentSettings {
    provider_name: "OpenAI Compatible".to_string(),
    base_url: std::env::var("OPENAI_API_BASE")
      .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
    has_api_key: !api_key.trim().is_empty(),
    api_key,
    model: std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4.1-mini".to_string()),
    system_prompt: "You are a desktop agent. Clarify the goal, propose an executable plan, and state the next action.".to_string(),
  }
}

fn read_runtime_api_key() -> Result<Option<String>> {
  let guard = RUNTIME_API_KEY
    .lock()
    .map_err(|_| anyhow!("runtime api key mutex poisoned"))?;
  Ok(guard.clone())
}

fn store_runtime_api_key(value: String) -> Result<()> {
  let mut guard = RUNTIME_API_KEY
    .lock()
    .map_err(|_| anyhow!("runtime api key mutex poisoned"))?;
  *guard = if value.trim().is_empty() {
    None
  } else {
    Some(value)
  };
  Ok(())
}

#[cfg(not(test))]
fn load_api_key_from_keyring() -> Result<Option<String>> {
  let entry = keyring::Entry::new(API_KEYRING_SERVICE, API_KEYRING_ACCOUNT);
  match entry.get_password() {
    Ok(api_key) if api_key.trim().is_empty() => Ok(None),
    Ok(api_key) => Ok(Some(api_key)),
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(error) => Err(error).context("failed to load api key from system keyring"),
  }
}

#[cfg(test)]
static TEST_KEYRING_API_KEY: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

#[cfg(test)]
fn load_api_key_from_keyring() -> Result<Option<String>> {
  let guard = TEST_KEYRING_API_KEY
    .lock()
    .map_err(|_| anyhow!("test keyring mutex poisoned"))?;
  Ok(guard.clone())
}

#[cfg(not(test))]
fn store_api_key_in_keyring(value: &str) -> Result<()> {
  let api_key = value.trim();
  if api_key.is_empty() {
    return Ok(());
  }

  let entry = keyring::Entry::new(API_KEYRING_SERVICE, API_KEYRING_ACCOUNT);
  entry
    .set_password(api_key)
    .context("failed to store api key in system keyring")
}

#[cfg(test)]
fn store_api_key_in_keyring(value: &str) -> Result<()> {
  let api_key = value.trim();
  if api_key.is_empty() {
    return Ok(());
  }

  let mut guard = TEST_KEYRING_API_KEY
    .lock()
    .map_err(|_| anyhow!("test keyring mutex poisoned"))?;
  *guard = Some(api_key.to_string());
  Ok(())
}

#[cfg(not(test))]
fn delete_api_key_from_keyring() -> Result<()> {
  let entry = keyring::Entry::new(API_KEYRING_SERVICE, API_KEYRING_ACCOUNT);
  match entry.delete_password() {
    Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
    Err(error) => Err(error).context("failed to delete api key from system keyring"),
  }
}

#[cfg(test)]
fn delete_api_key_from_keyring() -> Result<()> {
  let mut guard = TEST_KEYRING_API_KEY
    .lock()
    .map_err(|_| anyhow!("test keyring mutex poisoned"))?;
  *guard = None;
  Ok(())
}

fn resolve_effective_api_key(stored_api_key: Option<&str>) -> Result<String> {
  if let Some(runtime_api_key) = read_runtime_api_key()? {
    return Ok(runtime_api_key);
  }

  if let Some(api_key) = load_api_key_from_keyring()? {
    store_runtime_api_key(api_key.clone())?;
    return Ok(api_key.trim().to_string());
  }

  if let Some(api_key) = stored_api_key {
    let api_key = api_key.trim().to_string();
    if !api_key.is_empty() {
      store_api_key_in_keyring(&api_key)?;
      store_runtime_api_key(api_key.clone())?;
      return Ok(api_key);
    }
  }

  Ok(std::env::var("OPENAI_API_KEY").unwrap_or_default())
}

fn sanitize_settings_for_persistence(settings: &AgentSettings) -> AgentSettings {
  let mut sanitized = settings.clone();
  sanitized.has_api_key = false;
  sanitized.api_key.clear();
  sanitized
}

fn configured_trusted_provider_hosts() -> Vec<String> {
  std::env::var("MMGH_TRUSTED_PROVIDER_HOSTS")
    .unwrap_or_default()
    .split(',')
    .map(normalize_provider_host)
    .filter(|host| !host.is_empty())
    .collect()
}

fn enforce_trusted_provider_hosts() -> bool {
  matches!(
    std::env::var("MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS")
      .unwrap_or_default()
      .trim()
      .to_ascii_lowercase()
      .as_str(),
    "1" | "true" | "yes" | "on"
  )
}

fn normalize_provider_host(host: &str) -> String {
  host.trim().trim_end_matches('.').to_ascii_lowercase()
}

fn is_ipv4_host(host: &str) -> bool {
  let parts = host.split('.').collect::<Vec<_>>();
  if parts.len() != 4 {
    return false;
  }

  parts.iter().all(|part| part.parse::<u8>().is_ok())
}

fn is_private_ipv4_host(host: &str) -> bool {
  if !is_ipv4_host(host) {
    return false;
  }

  let octets = host
    .split('.')
    .filter_map(|part| part.parse::<u8>().ok())
    .collect::<Vec<_>>();

  if matches!(
    octets.as_slice(),
    [10, ..] | [127, ..] | [192, 168, ..] | [169, 254, ..]
  ) {
    return true;
  }

  matches!(octets.as_slice(), [172, second, ..] if (16..=31).contains(second))
}

fn is_local_provider_host(host: &str) -> bool {
  let normalized = normalize_provider_host(host);
  normalized == "localhost"
    || normalized == "::1"
    || normalized == "[::1]"
    || normalized.ends_with(".local")
    || is_private_ipv4_host(&normalized)
}

fn provider_host_matches_allowlist(host: &str, allowlist: &[String]) -> bool {
  let normalized_host = normalize_provider_host(host);
  allowlist
    .iter()
    .any(|allowed| normalized_host == *allowed || normalized_host.ends_with(&format!(".{allowed}")))
}

fn validate_provider_base_url(base_url: &str) -> Result<()> {
  let trimmed = base_url.trim();
  if trimmed.is_empty() {
    return Ok(());
  }

  let parsed = Url::parse(trimmed).context("provider base url must be a valid absolute URL")?;
  let scheme = parsed.scheme();
  if !matches!(scheme, "http" | "https") {
    return Err(anyhow!("provider base url must use http or https"));
  }

  if !parsed.username().is_empty() || parsed.password().is_some() {
    return Err(anyhow!(
      "provider base url must not contain embedded credentials"
    ));
  }

  if parsed.query().is_some() || parsed.fragment().is_some() {
    return Err(anyhow!(
      "provider base url must not contain query params or fragments"
    ));
  }

  let host = parsed
    .host_str()
    .map(normalize_provider_host)
    .filter(|host| !host.is_empty())
    .context("provider base url must include a host")?;
  let is_local_host = is_local_provider_host(&host);

  if scheme == "http" && !is_local_host {
    return Err(anyhow!(
      "provider base url must use https unless it points to localhost or a private network"
    ));
  }

  let allowlist = configured_trusted_provider_hosts();
  if enforce_trusted_provider_hosts()
    && !is_local_host
    && !provider_host_matches_allowlist(&host, &allowlist)
  {
    return Err(anyhow!(
      "provider host '{}' is not on MMGH_TRUSTED_PROVIDER_HOSTS",
      host
    ));
  }

  Ok(())
}

fn sanitize_settings_for_client(settings: &AgentSettings) -> AgentSettings {
  let mut sanitized = settings.clone();
  sanitized.has_api_key = !settings.api_key.trim().is_empty();
  sanitized.api_key.clear();
  sanitized
}

fn is_default_session_title(title: &str) -> bool {
  matches!(title.trim(), DEFAULT_SESSION_TITLE | "新任务")
}

fn merge_settings_input(current: AgentSettings, input: AgentSettingsInput) -> AgentSettings {
  let next_api_key = input.api_key.trim().to_string();
  let clear_api_key = input.clear_api_key && next_api_key.is_empty();

  AgentSettings {
    provider_name: if input.provider_name.trim().is_empty() {
      current.provider_name
    } else {
      input.provider_name.trim().to_string()
    },
    base_url: if input.base_url.trim().is_empty() {
      current.base_url
    } else {
      input.base_url.trim().trim_end_matches('/').to_string()
    },
    has_api_key: if clear_api_key {
      false
    } else {
      current.has_api_key || !next_api_key.is_empty()
    },
    api_key: if clear_api_key {
      String::new()
    } else if next_api_key.is_empty() {
      current.api_key
    } else {
      next_api_key
    },
    model: if input.model.trim().is_empty() {
      current.model
    } else {
      input.model.trim().to_string()
    },
    system_prompt: if input.system_prompt.trim().is_empty() {
      current.system_prompt
    } else {
      input.system_prompt.trim().to_string()
    },
  }
}

fn load_settings_in(conn: &Connection) -> Result<AgentSettings> {
  if let Some(mut cached) = read_settings_cache()? {
    cached.api_key = resolve_effective_api_key(None)?;
    cached.has_api_key = !cached.api_key.trim().is_empty();
    return Ok(cached);
  }

  let raw = load_setting_value_in(conn, SETTINGS_KEY)?;

  match raw {
    Some(value) => {
      let mut settings =
        serde_json::from_str::<AgentSettings>(&value).unwrap_or_else(|_| default_settings());
      let legacy_api_key = settings.api_key.trim().to_string();
      let sanitized_settings = sanitize_settings_for_persistence(&settings);

      if !legacy_api_key.is_empty() {
        let sanitized_payload = serde_json::to_string(&sanitized_settings)?;
        upsert_setting_value_in(conn, SETTINGS_KEY, &sanitized_payload)?;
      }

      store_settings_cache(&sanitized_settings)?;
      settings.api_key = resolve_effective_api_key(Some(&legacy_api_key))?;
      settings.has_api_key = !settings.api_key.trim().is_empty();
      Ok(settings)
    }
    None => {
      let mut settings = default_settings();
      store_settings_cache(&sanitize_settings_for_persistence(&settings))?;
      settings.api_key = resolve_effective_api_key(None)?;
      settings.has_api_key = !settings.api_key.trim().is_empty();
      Ok(settings)
    }
  }
}

fn store_settings_in(conn: &Connection, settings: &AgentSettings) -> Result<()> {
  if settings.api_key.trim().is_empty() {
    delete_api_key_from_keyring()?;
  } else {
    store_api_key_in_keyring(&settings.api_key)?;
  }
  store_runtime_api_key(settings.api_key.clone())?;
  let sanitized = sanitize_settings_for_persistence(settings);
  let payload = serde_json::to_string(&sanitized)?;
  upsert_setting_value_in(conn, SETTINGS_KEY, &payload)?;
  store_settings_cache(&sanitized)
}

fn load_setting_value_in(conn: &Connection, key: &str) -> Result<Option<String>> {
  conn
    .query_row(
      "SELECT value FROM settings WHERE key = ?1",
      params![key],
      |row| row.get(0),
    )
    .optional()
    .map_err(Into::into)
}

fn upsert_setting_value_in(conn: &Connection, key: &str, value: &str) -> Result<()> {
  conn.execute(
    "INSERT INTO settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    params![key, value],
  )?;
  Ok(())
}

fn canonical_starter_skill_name(name: &str) -> Option<&'static str> {
  let normalized_name = name.trim().to_ascii_lowercase();
  if normalized_name.is_empty() {
    return None;
  }

  STARTER_SKILL_SEEDS.iter().find_map(|seed| {
    std::iter::once(seed.name)
      .chain(seed.legacy_names.iter().copied())
      .find(|candidate| candidate.trim().eq_ignore_ascii_case(&normalized_name))
      .map(|_| seed.name)
  })
}

fn normalize_starter_skill_tombstones(names: impl IntoIterator<Item = String>) -> BTreeSet<String> {
  names
    .into_iter()
    .filter_map(|name| canonical_starter_skill_name(&name).map(str::to_string))
    .collect()
}

fn infer_starter_skill_tombstones_in(conn: &Connection) -> Result<BTreeSet<String>> {
  let mut existing_starter_names = BTreeSet::new();
  let mut stmt = conn.prepare("SELECT name FROM skills")?;
  let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;

  for row in rows {
    if let Some(name) = canonical_starter_skill_name(&row?) {
      existing_starter_names.insert(name.to_string());
    }
  }

  Ok(
    STARTER_SKILL_SEEDS
      .iter()
      .filter(|seed| !existing_starter_names.contains(seed.name))
      .map(|seed| seed.name.to_string())
      .collect(),
  )
}

fn load_starter_skill_catalog_version_in(conn: &Connection) -> Result<u32> {
  if let Some(value) = load_setting_value_in(conn, STARTER_SKILL_CATALOG_VERSION_KEY)? {
    return Ok(value.parse::<u32>().unwrap_or(0));
  }

  if load_setting_value_in(conn, STARTER_SKILL_SEED_MIGRATION_KEY)?.is_some() {
    return Ok(LEGACY_STARTER_SKILL_CATALOG_VERSION);
  }

  Ok(0)
}

fn load_starter_skill_tombstones_in(conn: &Connection) -> Result<BTreeSet<String>> {
  if let Some(value) = load_setting_value_in(conn, STARTER_SKILL_DELETED_TOMBSTONES_KEY)? {
    let names = serde_json::from_str::<Vec<String>>(&value).unwrap_or_default();
    return Ok(normalize_starter_skill_tombstones(names));
  }

  if load_setting_value_in(conn, STARTER_SKILL_SEED_MIGRATION_KEY)?.is_some() {
    return infer_starter_skill_tombstones_in(conn);
  }

  Ok(BTreeSet::new())
}

fn store_starter_skill_tombstones_in(
  conn: &Connection,
  tombstones: &BTreeSet<String>,
) -> Result<()> {
  let payload = serde_json::to_string(tombstones)?;
  upsert_setting_value_in(conn, STARTER_SKILL_DELETED_TOMBSTONES_KEY, &payload)
}

fn append_starter_skill_tombstone_in(conn: &Connection, name: &str) -> Result<()> {
  let mut tombstones = load_starter_skill_tombstones_in(conn)?;
  if tombstones.insert(name.to_string()) {
    store_starter_skill_tombstones_in(conn, &tombstones)?;
  }
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
    let mut skills_stmt =
      conn.prepare("SELECT id FROM skills WHERE enabled = 1 ORDER BY id ASC")?;
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
  prune_disabled_session_skill_mounts_in(conn)?;

  Ok(())
}

fn seed_starter_skill_catalog_in(conn: &Connection) -> Result<()> {
  let catalog_version = load_starter_skill_catalog_version_in(conn)?;
  let tombstones = load_starter_skill_tombstones_in(conn)?;

  if catalog_version < STARTER_SKILL_CATALOG_VERSION {
    ensure_starter_skills_in(conn, &tombstones)?;
  }

  store_starter_skill_tombstones_in(conn, &tombstones)?;
  upsert_setting_value_in(
    conn,
    STARTER_SKILL_CATALOG_VERSION_KEY,
    &STARTER_SKILL_CATALOG_VERSION.to_string(),
  )?;

  Ok(())
}

fn prune_disabled_session_skill_mounts_in(conn: &Connection) -> Result<()> {
  let mut stmt = conn.prepare(
    "SELECT DISTINCT ss.session_id
     FROM session_skills ss
     INNER JOIN skills s ON s.id = ss.skill_id
     WHERE s.enabled = 0",
  )?;
  let rows = stmt.query_map([], |row| row.get::<_, i64>(0))?;

  let mut session_ids = Vec::new();
  for row in rows {
    session_ids.push(row?);
  }

  if session_ids.is_empty() {
    return Ok(());
  }

  conn.execute(
    "DELETE FROM session_skills
     WHERE skill_id IN (
       SELECT id FROM skills WHERE enabled = 0
     )",
    [],
  )?;

  let updated_at = now_millis();
  for session_id in session_ids {
    conn.execute(
      "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
      params![updated_at, session_id],
    )?;
  }

  Ok(())
}

fn ensure_starter_skills_in(conn: &Connection, tombstones: &BTreeSet<String>) -> Result<()> {
  for seed in STARTER_SKILL_SEEDS {
    if tombstones.contains(seed.name) {
      continue;
    }
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
    None => create_session_in(conn, Some(DEFAULT_SESSION_TITLE.to_string())),
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
    None => create_skill_in(conn, None),
  }
}

fn create_session_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  Ok(create_session_detail_in(conn, title)?.session.id)
}

fn create_session_detail_in(conn: &Connection, title: Option<String>) -> Result<SessionDetail> {
  let now = now_millis();
  let session_title = title
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(|value| value.to_string())
    .unwrap_or_else(|| DEFAULT_SESSION_TITLE.to_string());

  conn.execute(
    "INSERT INTO sessions (title, status, created_at, updated_at)
     VALUES (?1, 'idle', ?2, ?3)",
    params![session_title, now, now],
  )?;
  let session_id = conn.last_insert_rowid();

  let message = append_message_in(
    conn,
    session_id,
    "assistant",
    "Workspace ready. Configure an OpenAI-compatible endpoint to use the real Rust model path. Until then the runtime will return local preview responses.",
  )?;
  let activity = append_activity_in(
    conn,
    session_id,
    "system",
    "Workspace ready",
    "A new agent session has been created.",
    "completed",
  )?;
  let session = load_session_summary_in(conn, session_id)?;

  Ok(SessionDetail {
    session,
    messages: vec![message],
    activity: vec![activity],
    mounted_skill_ids: Vec::new(),
    mounted_skills: Vec::new(),
    recommended_skills: Vec::new(),
  })
}

fn create_note_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  Ok(create_note_detail_in(conn, title)?.id)
}

fn create_note_detail_in(conn: &Connection, title: Option<String>) -> Result<KnowledgeNoteDetail> {
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
    params!["*", &note_title, &body, "[]", now, now],
  )?;

  Ok(build_note_detail(
    conn.last_insert_rowid(),
    "*".to_string(),
    note_title,
    body,
    Vec::new(),
    now,
    now,
  ))
}

fn create_reminder_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  Ok(create_reminder_detail_in(conn, title)?.id)
}

fn create_reminder_detail_in(conn: &Connection, title: Option<String>) -> Result<ReminderDetail> {
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

  Ok(build_reminder_detail(
    conn.last_insert_rowid(),
    reminder_title,
    "Capture the next action, attach a note, and set when it should surface again.".to_string(),
    Some(now + 60 * 60 * 1000),
    "medium".to_string(),
    "scheduled".to_string(),
    linked_note_id,
    now,
    now,
  ))
}

fn create_skill_in(conn: &Connection, name: Option<String>) -> Result<i64> {
  Ok(create_skill_detail_in(conn, name)?.id)
}

fn create_skill_detail_in(conn: &Connection, name: Option<String>) -> Result<SkillDetail> {
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
    params![&skill_name, &description, &instructions, &trigger_hint, now, now],
  )?;

  Ok(build_skill_detail(
    conn.last_insert_rowid(),
    skill_name,
    description,
    instructions,
    trigger_hint,
    true,
    "low".to_string(),
    now,
    now,
  ))
}

fn save_note_in(conn: &Connection, input: KnowledgeNoteInput) -> Result<()> {
  save_note_detail_in(conn, input).map(|_| ())
}

fn save_note_detail_in(
  conn: &Connection,
  input: KnowledgeNoteInput,
) -> Result<KnowledgeNoteDetail> {
  let icon = normalize_note_icon(&input.icon);
  let title = normalize_note_title(&input.title);
  let body = input.body.trim().to_string();
  let tags = normalize_tags(input.tags);
  let updated_at = now_millis();
  let created_at = load_note_created_at_in(conn, input.id)?;

  let changed = conn.execute(
    "UPDATE notes
     SET icon = ?1, title = ?2, body = ?3, tags = ?4, updated_at = ?5
     WHERE id = ?6",
    params![
      &icon,
      &title,
      &body,
      serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string()),
      updated_at,
      input.id
    ],
  )?;

  if changed == 0 {
    return Err(anyhow!("note not found"));
  }

  Ok(build_note_detail(
    input.id, icon, title, body, tags, created_at, updated_at,
  ))
}

fn delete_session_in(conn: &Connection, session_id: i64) -> Result<()> {
  conn.execute(
    "DELETE FROM activity WHERE session_id = ?1",
    params![session_id],
  )?;
  conn.execute(
    "DELETE FROM messages WHERE session_id = ?1",
    params![session_id],
  )?;
  let changed = conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
  if changed == 0 {
    return Err(anyhow!("session not found"));
  }
  Ok(())
}

fn delete_note_in(conn: &Connection, note_id: i64) -> Result<()> {
  let changed = conn.execute("DELETE FROM notes WHERE id = ?1", params![note_id])?;
  if changed == 0 {
    return Err(anyhow!("note not found"));
  }
  Ok(())
}

fn save_reminder_in(conn: &Connection, input: ReminderInput) -> Result<()> {
  save_reminder_detail_in(conn, input).map(|_| ())
}

fn save_reminder_detail_in(conn: &Connection, input: ReminderInput) -> Result<ReminderDetail> {
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
  let linked_note_id = match input.linked_note_id.filter(|value| *value > 0) {
    Some(note_id) if note_exists_in(conn, note_id)? => Some(note_id),
    _ => None,
  };
  let updated_at = now_millis();
  let created_at = load_reminder_created_at_in(conn, input.id)?;

  let changed = conn.execute(
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
      &title,
      &detail,
      input.due_at,
      severity,
      status,
      linked_note_id,
      updated_at,
      input.id
    ],
  )?;

  if changed == 0 {
    return Err(anyhow!("reminder not found"));
  }

  Ok(build_reminder_detail(
    input.id,
    title,
    detail,
    input.due_at,
    severity.to_string(),
    status.to_string(),
    linked_note_id,
    created_at,
    updated_at,
  ))
}

fn delete_reminder_in(conn: &Connection, reminder_id: i64) -> Result<()> {
  let changed = conn.execute("DELETE FROM reminders WHERE id = ?1", params![reminder_id])?;
  if changed == 0 {
    return Err(anyhow!("reminder not found"));
  }
  Ok(())
}

fn session_exists_in(conn: &Connection, session_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM sessions WHERE id = ?1)",
      params![session_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

fn note_exists_in(conn: &Connection, note_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM notes WHERE id = ?1)",
      params![note_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

fn reminder_exists_in(conn: &Connection, reminder_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM reminders WHERE id = ?1)",
      params![reminder_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

fn skill_exists_in(conn: &Connection, skill_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM skills WHERE id = ?1)",
      params![skill_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

fn ensure_session_exists_in(conn: &Connection, session_id: i64) -> Result<()> {
  if !session_exists_in(conn, session_id)? {
    return Err(anyhow!("session not found"));
  }
  Ok(())
}

fn resolve_active_session_id_in(
  conn: &Connection,
  active_session_id: Option<i64>,
) -> Result<Option<i64>> {
  if let Some(session_id) = active_session_id {
    ensure_session_exists_in(conn, session_id)?;
    return Ok(Some(session_id));
  }
  Ok(None)
}

fn ensure_note_exists_in(conn: &Connection, note_id: i64) -> Result<()> {
  if !note_exists_in(conn, note_id)? {
    return Err(anyhow!("note not found"));
  }
  Ok(())
}

fn ensure_reminder_exists_in(conn: &Connection, reminder_id: i64) -> Result<()> {
  if !reminder_exists_in(conn, reminder_id)? {
    return Err(anyhow!("reminder not found"));
  }
  Ok(())
}

fn ensure_skill_exists_in(conn: &Connection, skill_id: i64) -> Result<()> {
  if !skill_exists_in(conn, skill_id)? {
    return Err(anyhow!("skill not found"));
  }
  Ok(())
}

fn get_skill_name_in(conn: &Connection, skill_id: i64) -> Result<Option<String>> {
  conn
    .query_row(
      "SELECT name FROM skills WHERE id = ?1",
      params![skill_id],
      |row| row.get(0),
    )
    .optional()
    .map_err(Into::into)
}

fn create_skill_for_active_session_in(
  conn: &Connection,
  name: Option<String>,
  active_session_id: Option<i64>,
) -> Result<i64> {
  Ok(create_skill_detail_for_active_session_in(conn, name, active_session_id)?.id)
}

fn create_skill_detail_for_active_session_in(
  conn: &Connection,
  name: Option<String>,
  active_session_id: Option<i64>,
) -> Result<SkillDetail> {
  if let Some(session_id) = active_session_id {
    ensure_session_exists_in(conn, session_id)?;
  }

  let skill = create_skill_detail_in(conn, name)?;
  if let Some(session_id) = active_session_id {
    let mut skill_ids = list_session_skill_ids_in(conn, session_id)?;
    skill_ids.push(skill.id);
    save_session_skills_in(conn, session_id, skill_ids)?;
  }
  Ok(skill)
}

fn ensure_session_title_in(conn: &Connection, session_id: i64, prompt: &str) -> Result<()> {
  let existing: Option<String> = conn
    .query_row(
      "SELECT title FROM sessions WHERE id = ?1",
      params![session_id],
      |row| row.get(0),
    )
    .optional()?;

  if let Some(title) = existing {
    if is_default_session_title(&title) {
      let next_title = infer_title(prompt);
      conn.execute(
        "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![next_title, now_millis(), session_id],
      )?;
    }
  }

  Ok(())
}

fn delete_skill_in(conn: &Connection, skill_id: i64) -> Result<()> {
  let deleted_skill_name = get_skill_name_in(conn, skill_id)?.context("skill not found")?;
  let mut stmt = conn.prepare(
    "SELECT DISTINCT session_id
     FROM session_skills
     WHERE skill_id = ?1",
  )?;
  let rows = stmt.query_map(params![skill_id], |row| row.get::<_, i64>(0))?;
  let mut session_ids = Vec::new();
  for row in rows {
    session_ids.push(row?);
  }

  let changed = conn.execute("DELETE FROM skills WHERE id = ?1", params![skill_id])?;
  if changed == 0 {
    return Err(anyhow!("skill not found"));
  }

  if let Some(starter_name) = canonical_starter_skill_name(&deleted_skill_name) {
    append_starter_skill_tombstone_in(conn, starter_name)?;
  }

  if !session_ids.is_empty() {
    let updated_at = now_millis();
    for session_id in session_ids {
      conn.execute(
        "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
        params![updated_at, session_id],
      )?;
    }
  }

  Ok(())
}

fn save_skill_in(conn: &Connection, input: SkillInput) -> Result<()> {
  save_skill_detail_in(conn, input).map(|_| ())
}

fn save_skill_detail_in(conn: &Connection, input: SkillInput) -> Result<SkillDetail> {
  let name = if input.name.trim().is_empty() {
    "New skill".to_string()
  } else {
    input.name.trim().to_string()
  };
  let description = input.description.trim().to_string();
  let instructions = input.instructions.trim().to_string();
  let trigger_hint = input.trigger_hint.trim().to_string();
  let updated_at = now_millis();
  let created_at = load_skill_created_at_in(conn, input.id)?;

  let changed = conn.execute(
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
      &name,
      &description,
      &instructions,
      &trigger_hint,
      if input.enabled { 1 } else { 0 },
      updated_at,
      input.id
    ],
  )?;

  if changed == 0 {
    return Err(anyhow!("skill not found"));
  }

  if !input.enabled {
    let mut stmt = conn.prepare(
      "SELECT DISTINCT session_id
       FROM session_skills
       WHERE skill_id = ?1",
    )?;
    let rows = stmt.query_map(params![input.id], |row| row.get::<_, i64>(0))?;
    let mut session_ids = Vec::new();
    for row in rows {
      session_ids.push(row?);
    }

    conn.execute(
      "DELETE FROM session_skills WHERE skill_id = ?1",
      params![input.id],
    )?;

    for session_id in session_ids {
      conn.execute(
        "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
        params![updated_at, session_id],
      )?;
    }
  }

  Ok(build_skill_detail(
    input.id,
    name,
    description,
    instructions,
    trigger_hint,
    input.enabled,
    "low".to_string(),
    created_at,
    updated_at,
  ))
}

fn save_session_skills_in(
  conn: &Connection,
  session_id: i64,
  skill_ids: Vec<i64>,
) -> Result<Vec<i64>> {
  let session_exists = conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM sessions WHERE id = ?1)",
      params![session_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)?;
  if !session_exists {
    return Err(anyhow!("session not found"));
  }

  let mut unique_ids = Vec::new();
  for skill_id in skill_ids.into_iter().filter(|value| *value > 0) {
    if !unique_ids.contains(&skill_id) {
      unique_ids.push(skill_id);
    }
  }

  let mut next_skill_ids = Vec::new();
  for skill_id in unique_ids {
    let exists = conn
      .query_row(
        "SELECT EXISTS(SELECT 1 FROM skills WHERE id = ?1 AND enabled = 1)",
        params![skill_id],
        |row| row.get::<_, i64>(0),
      )
      .map(|value| value != 0)?;

    if exists {
      next_skill_ids.push(skill_id);
    }
  }

  let current_skill_ids = list_session_skill_ids_in(conn, session_id)?;
  if current_skill_ids == next_skill_ids {
    return Ok(next_skill_ids);
  }

  conn.execute(
    "DELETE FROM session_skills WHERE session_id = ?1",
    params![session_id],
  )?;

  let base_timestamp = now_millis();

  for (index, skill_id) in next_skill_ids.iter().copied().enumerate() {
    conn.execute(
      "INSERT OR IGNORE INTO session_skills (session_id, skill_id, created_at)
       VALUES (?1, ?2, ?3)",
      params![session_id, skill_id, base_timestamp + index as i64],
    )?;
  }

  conn.execute(
    "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
    params![base_timestamp + next_skill_ids.len() as i64, session_id],
  )?;

  Ok(next_skill_ids)
}

fn build_workspace_snapshot_with_policy_in(
  conn: &Connection,
  preferred_session_id: Option<i64>,
  preferred_note_id: Option<i64>,
  preferred_reminder_id: Option<i64>,
  preferred_skill_id: Option<i64>,
  reuse_policy: SnapshotReusePolicy,
) -> Result<WorkspaceSnapshot> {
  build_workspace_snapshot_with_seed_snapshot_in(
    conn,
    preferred_session_id,
    preferred_note_id,
    preferred_reminder_id,
    preferred_skill_id,
    reuse_policy,
    None,
  )
}

fn build_workspace_snapshot_with_seed_snapshot_in(
  conn: &Connection,
  preferred_session_id: Option<i64>,
  preferred_note_id: Option<i64>,
  preferred_reminder_id: Option<i64>,
  preferred_skill_id: Option<i64>,
  reuse_policy: SnapshotReusePolicy,
  cached_snapshot_override: Option<WorkspaceSnapshot>,
) -> Result<WorkspaceSnapshot> {
  let cached_snapshot = if let Some(snapshot) = cached_snapshot_override {
    Some(snapshot)
  } else if reuse_policy.uses_cached_snapshot() {
    read_snapshot_cache()?
  } else {
    None
  };
  let seed_session_id = ensure_seed_session_in(conn)?;
  let seed_note_id = ensure_seed_note_in(conn)?;
  let seed_skill_id = ensure_seed_skill_in(conn)?;
  let sessions = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_session_list)
    .map(|snapshot| snapshot.sessions.clone())
    .unwrap_or(list_sessions_in(conn)?);
  let notes = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_note_list)
    .map(|snapshot| snapshot.notes.clone())
    .unwrap_or(list_notes_in(conn)?);
  let reminders = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_reminder_list)
    .map(|snapshot| snapshot.reminders.clone())
    .unwrap_or(list_reminders_in(conn)?);
  let skills = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_skill_list)
    .map(|snapshot| snapshot.skills.clone())
    .unwrap_or(list_skills_in(conn)?);

  let active_session_id = preferred_session_id
    .filter(|candidate| sessions.iter().any(|session| session.id == *candidate))
    .unwrap_or_else(|| {
      sessions
        .first()
        .map(|session| session.id)
        .unwrap_or(seed_session_id)
    });
  let active_note_id = preferred_note_id
    .filter(|candidate| notes.iter().any(|note| note.id == *candidate))
    .unwrap_or_else(|| notes.first().map(|note| note.id).unwrap_or(seed_note_id));
  let active_reminder_id = preferred_reminder_id
    .filter(|candidate| reminders.iter().any(|reminder| reminder.id == *candidate))
    .or_else(|| {
      cached_snapshot.as_ref().and_then(|snapshot| {
        let candidate = snapshot.active_reminder_id;
        if candidate > 0 && reminders.iter().any(|reminder| reminder.id == candidate) {
          Some(candidate)
        } else {
          None
        }
      })
    })
    .unwrap_or_else(|| reminders.first().map(|reminder| reminder.id).unwrap_or(0));
  let active_skill_id = preferred_skill_id
    .filter(|candidate| skills.iter().any(|skill| skill.id == *candidate))
    .unwrap_or_else(|| {
      skills
        .first()
        .map(|skill| skill.id)
        .unwrap_or(seed_skill_id)
    });

  let active_session_summary = sessions
    .iter()
    .find(|session| session.id == active_session_id)
    .cloned()
    .context("active session not found")?;

  let preserved_session_timeline = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_session_timeline && snapshot.active_session_id == active_session_id
    })
    .map(|snapshot| &snapshot.active_session);
  let preserved_skill_catalog = cached_snapshot
    .as_ref()
    .filter(|snapshot| snapshot.skills == skills)
    .map(|snapshot| snapshot.skills.as_slice());

  let active_session = build_session_detail_with_summary_in(
    conn,
    active_session_summary,
    preserved_session_timeline,
    &skills,
    preserved_skill_catalog,
  )?;
  let active_note = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_note_detail && snapshot.active_note_id == active_note_id
    })
    .map(|snapshot| snapshot.active_note.clone())
    .unwrap_or(build_note_detail_in(conn, active_note_id)?);
  let active_reminder = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_reminder_detail && snapshot.active_reminder_id == active_reminder_id
    })
    .map(|snapshot| snapshot.active_reminder.clone())
    .or_else(|| {
      if active_reminder_id > 0 {
        build_reminder_detail_in(conn, active_reminder_id).ok()
      } else {
        None
      }
    })
    .unwrap_or_else(empty_reminder_detail);
  let active_skill = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_skill_detail && snapshot.active_skill_id == active_skill_id
    })
    .map(|snapshot| snapshot.active_skill.clone())
    .unwrap_or(build_skill_detail_in(conn, active_skill_id)?);

  let snapshot = WorkspaceSnapshot {
    settings: sanitize_settings_for_client(&load_settings_in(conn)?),
    sessions,
    active_session_id,
    active_session,
    notes,
    active_note_id,
    active_note,
    reminders,
    active_reminder_id,
    active_reminder,
    skills,
    active_skill_id,
    active_skill,
    capabilities: capability_catalog(),
  };
  store_snapshot_cache(&snapshot)?;
  Ok(snapshot)
}

fn list_sessions_in(conn: &Connection) -> Result<Vec<SessionSummary>> {
  let mut stmt = conn.prepare(
    "SELECT s.id,
            s.title,
            s.status,
            s.updated_at,
            COALESCE(message_stats.message_count, 0) AS message_count,
            COALESCE(substr(last_message.content, 1, 256), '') AS last_message_preview,
            COALESCE(skill_stats.mounted_skill_count, 0) AS mounted_skill_count
     FROM sessions s
     LEFT JOIN (
       SELECT session_id, COUNT(*) AS message_count, MAX(id) AS last_message_id
       FROM messages
       GROUP BY session_id
     ) AS message_stats ON message_stats.session_id = s.id
     LEFT JOIN messages AS last_message ON last_message.id = message_stats.last_message_id
     LEFT JOIN (
       SELECT ss.session_id, COUNT(*) AS mounted_skill_count
       FROM session_skills ss
       INNER JOIN skills s ON s.id = ss.skill_id
       WHERE s.enabled = 1
       GROUP BY ss.session_id
     ) AS skill_stats ON skill_stats.session_id = s.id
     ORDER BY s.updated_at DESC, s.id DESC",
  )?;
  let rows = stmt.query_map([], map_session_summary_row)?;

  let mut sessions = Vec::new();
  for row in rows {
    sessions.push(row?);
  }

  Ok(sessions)
}

fn load_session_summary_in(conn: &Connection, session_id: i64) -> Result<SessionSummary> {
  conn
    .query_row(
      "SELECT s.id,
              s.title,
              s.status,
              s.updated_at,
              COALESCE(message_stats.message_count, 0) AS message_count,
              COALESCE(substr(last_message.content, 1, 256), '') AS last_message_preview,
              COALESCE(skill_stats.mounted_skill_count, 0) AS mounted_skill_count
       FROM sessions s
       LEFT JOIN (
         SELECT session_id, COUNT(*) AS message_count, MAX(id) AS last_message_id
         FROM messages
         GROUP BY session_id
       ) AS message_stats ON message_stats.session_id = s.id
       LEFT JOIN messages AS last_message ON last_message.id = message_stats.last_message_id
       LEFT JOIN (
         SELECT ss.session_id, COUNT(*) AS mounted_skill_count
         FROM session_skills ss
         INNER JOIN skills s ON s.id = ss.skill_id
         WHERE s.enabled = 1
         GROUP BY ss.session_id
       ) AS skill_stats ON skill_stats.session_id = s.id
       WHERE s.id = ?1",
      params![session_id],
      map_session_summary_row,
    )
    .optional()?
    .context("session not found")
}

fn list_notes_in(conn: &Connection) -> Result<Vec<KnowledgeNoteSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, icon, title, substr(body, 1, 512), tags, updated_at
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

#[cfg_attr(test, allow(dead_code))]
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

fn list_note_context_in(
  conn: &Connection,
  limit: usize,
  body_char_limit: usize,
) -> Result<Vec<KnowledgeNoteContext>> {
  let mut stmt = conn.prepare(
    "SELECT title, substr(body, 1, ?2), tags, updated_at
     FROM notes
     ORDER BY updated_at DESC, id DESC
     LIMIT ?1",
  )?;
  let rows = stmt.query_map(params![limit as i64, body_char_limit as i64], |row| {
    let body_excerpt: String = row.get(1)?;
    let tags_json: String = row.get(2)?;
    Ok(KnowledgeNoteContext {
      title: row.get(0)?,
      summary: preview_text(&body_excerpt, 120),
      body_excerpt,
      tags: decode_tags(tags_json),
      updated_at: row.get(3)?,
    })
  })?;

  let mut notes = Vec::new();
  for row in rows {
    notes.push(row?);
  }

  Ok(notes)
}

fn list_reminders_in(conn: &Connection) -> Result<Vec<ReminderSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, substr(detail, 1, 512), due_at, severity, status, linked_note_id, updated_at
     FROM reminders
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    let detail: String = row.get(2)?;
    Ok(ReminderSummary {
      id: row.get(0)?,
      title: row.get(1)?,
      preview: preview_text(&detail, 120),
      due_at: row.get(3)?,
      severity: row.get(4)?,
      status: row.get(5)?,
      linked_note_id: row.get(6)?,
      updated_at: row.get(7)?,
    })
  })?;

  let mut reminders = Vec::new();
  for row in rows {
    reminders.push(row?);
  }

  Ok(reminders)
}

fn build_reminder_detail_in(conn: &Connection, reminder_id: i64) -> Result<ReminderDetail> {
  conn
    .query_row(
      "SELECT id, title, detail, due_at, severity, status, linked_note_id, created_at, updated_at
       FROM reminders
       WHERE id = ?1",
      params![reminder_id],
      |row| {
        let detail: String = row.get(2)?;
        Ok(ReminderDetail {
          id: row.get(0)?,
          title: row.get(1)?,
          preview: preview_text(&detail, 120),
          detail,
          due_at: row.get(3)?,
          severity: row.get(4)?,
          status: row.get(5)?,
          linked_note_id: row.get(6)?,
          created_at: row.get(7)?,
          updated_at: row.get(8)?,
        })
      },
    )
    .optional()?
    .context("reminder not found")
}

fn list_open_reminder_context_in(
  conn: &Connection,
  limit: usize,
) -> Result<Vec<ReminderContextItem>> {
  let mut stmt = conn.prepare(
    "SELECT r.title, r.severity, r.due_at, n.title
     FROM reminders r
     LEFT JOIN notes n ON n.id = r.linked_note_id
     WHERE r.status != 'done'
     ORDER BY CASE WHEN r.due_at IS NULL THEN 1 ELSE 0 END ASC,
              r.due_at ASC,
              r.updated_at DESC
     LIMIT ?1",
  )?;
  let rows = stmt.query_map(params![limit as i64], |row| {
    Ok(ReminderContextItem {
      title: row.get(0)?,
      severity: row.get(1)?,
      due_at: row.get(2)?,
      linked_note_title: row.get(3)?,
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
    "SELECT id, name, substr(description, 1, 512), trigger_hint, enabled, permission_level, updated_at
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
    "SELECT s.id, s.name, s.description, s.instructions, s.trigger_hint, s.enabled, s.permission_level, s.created_at, s.updated_at
     FROM skills s
     INNER JOIN session_skills ss ON ss.skill_id = s.id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, s.id ASC",
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

fn build_mounted_skills_from_catalog(
  mounted_skill_ids: &[i64],
  all_skills: &[SkillSummary],
) -> Vec<SkillSummary> {
  mounted_skill_ids
    .iter()
    .filter_map(|skill_id| all_skills.iter().find(|skill| skill.id == *skill_id))
    .cloned()
    .collect()
}

fn map_session_summary_row(row: &Row<'_>) -> rusqlite::Result<SessionSummary> {
  let last_message_preview: String = row.get(5)?;
  Ok(SessionSummary {
    id: row.get(0)?,
    title: row.get(1)?,
    status: row.get(2)?,
    updated_at: row.get(3)?,
    message_count: row.get(4)?,
    last_message_preview: preview_text(&last_message_preview, 92),
    mounted_skill_count: row.get(6)?,
  })
}

fn load_agent_session_context_in(
  conn: &Connection,
  session_id: i64,
) -> Result<AgentSessionContext> {
  let (title, status, message_count) = conn
    .query_row(
      "SELECT s.title,
              s.status,
              COALESCE((
                SELECT COUNT(*)
                FROM messages m
                WHERE m.session_id = s.id
              ), 0) AS message_count
       FROM sessions s
       WHERE s.id = ?1",
      params![session_id],
      |row| {
        Ok((
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, i64>(2)?,
        ))
      },
    )
    .optional()?
    .context("session not found")?;

  let mut stmt = conn.prepare(
    "SELECT s.name
     FROM skills s
     INNER JOIN session_skills ss ON ss.skill_id = s.id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, s.id ASC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| row.get::<_, String>(0))?;

  let mut mounted_skill_names = Vec::new();
  for row in rows {
    mounted_skill_names.push(row?);
  }

  Ok(AgentSessionContext {
    title,
    status,
    message_count: message_count.max(0) as usize,
    mounted_skill_names,
  })
}

fn build_session_detail_with_summary_in(
  conn: &Connection,
  session: SessionSummary,
  preserved_timeline: Option<&SessionDetail>,
  all_skills: &[SkillSummary],
  preserved_skill_catalog: Option<&[SkillSummary]>,
) -> Result<SessionDetail> {
  let session_id = session.id;
  let preserved_detail = preserved_timeline.filter(|detail| detail.session.id == session_id);
  let (messages, activity) = if let Some(detail) = preserved_detail {
    (detail.messages.clone(), detail.activity.clone())
  } else {
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

    (messages, activity)
  };
  let mounted_skill_ids = preserved_detail
    .filter(|detail| detail.session == session)
    .map(|detail| detail.mounted_skill_ids.clone())
    .unwrap_or(list_session_skill_ids_in(conn, session_id)?);
  let can_reuse_skill_views = preserved_detail
    .zip(preserved_skill_catalog)
    .map(|(detail, cached_skills)| {
      detail.session == session
        && detail.mounted_skill_ids == mounted_skill_ids
        && cached_skills == all_skills
    })
    .unwrap_or(false);

  let (mounted_skills, recommended_skills) = if can_reuse_skill_views {
    let detail = preserved_detail.context("missing preserved session detail")?;
    (
      detail.mounted_skills.clone(),
      detail.recommended_skills.clone(),
    )
  } else {
    let mounted_skills = build_mounted_skills_from_catalog(&mounted_skill_ids, all_skills);
    let recommended_skills = recommend_session_skills_from_messages(
      &session.title,
      &messages,
      &mounted_skill_ids,
      4,
      all_skills,
    );
    (mounted_skills, recommended_skills)
  };

  Ok(SessionDetail {
    session,
    messages,
    activity,
    mounted_skill_ids,
    mounted_skills,
    recommended_skills,
  })
}

fn recommend_session_skills_from_messages(
  session_title: &str,
  messages: &[ChatMessage],
  mounted_skill_ids: &[i64],
  limit: usize,
  all_skills: &[SkillSummary],
) -> Vec<SkillSummary> {
  let mut message_fragments = messages
    .iter()
    .rev()
    .take(10)
    .map(|message| message.content.as_str())
    .collect::<Vec<_>>();
  message_fragments.reverse();

  let session_text = format!("{} {}", session_title, message_fragments.join(" "));
  let session_haystack = session_text.to_lowercase();
  let keywords = extract_recommendation_keywords(&session_haystack);
  let mut ranked = all_skills
    .iter()
    .cloned()
    .into_iter()
    .filter(|skill| skill.enabled && !mounted_skill_ids.contains(&skill.id))
    .map(|mut skill| {
      let (score, reason) = score_skill_recommendation_stable(&skill, &session_haystack, &keywords);
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

  ranked
    .into_iter()
    .take(limit)
    .map(|(_, skill)| skill)
    .collect()
}

fn seed_snapshot_for_persisted_run(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session_id: i64,
  updated_session: SessionSummary,
  appended_messages: &[ChatMessage],
  appended_activity: &[ActivityItem],
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  if snapshot.active_session_id != session_id || snapshot.active_session.session.id != session_id {
    return None;
  }

  snapshot.active_session.session = updated_session.clone();
  snapshot
    .active_session
    .messages
    .extend(appended_messages.iter().cloned());

  let mut recent_activity = appended_activity.iter().rev().cloned().collect::<Vec<_>>();
  recent_activity.extend(snapshot.active_session.activity);
  recent_activity.truncate(24);
  snapshot.active_session.activity = recent_activity;
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &updated_session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );

  Some(snapshot)
}

fn seed_snapshot_for_session_create(
  cached_snapshot: Option<WorkspaceSnapshot>,
  mut detail: SessionDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  detail.mounted_skills =
    build_mounted_skills_from_catalog(&detail.mounted_skill_ids, &snapshot.skills);
  detail.recommended_skills = recommend_session_skills_from_messages(
    &detail.session.title,
    &detail.messages,
    &detail.mounted_skill_ids,
    4,
    &snapshot.skills,
  );
  upsert_session_summary(&mut snapshot.sessions, detail.session.clone());
  snapshot.active_session_id = detail.session.id;
  snapshot.active_session = detail;
  Some(snapshot)
}

fn seed_snapshot_for_session_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  let deleted_active_session = snapshot.active_session_id == session_id;
  snapshot.sessions.retain(|session| session.id != session_id);
  if deleted_active_session {
    snapshot.active_session_id = snapshot
      .sessions
      .first()
      .map(|session| session.id)
      .unwrap_or(0);
  }
  Some(snapshot)
}

fn seed_snapshot_for_note_upsert(
  cached_snapshot: Option<WorkspaceSnapshot>,
  detail: KnowledgeNoteDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_note_summary(&mut snapshot.notes, build_note_summary_from_detail(&detail));
  snapshot.active_note_id = detail.id;
  snapshot.active_note = detail;
  Some(snapshot)
}

fn seed_snapshot_for_reminder_upsert(
  cached_snapshot: Option<WorkspaceSnapshot>,
  detail: ReminderDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_reminder_summary(
    &mut snapshot.reminders,
    build_reminder_summary_from_detail(&detail),
  );
  snapshot.active_reminder_id = detail.id;
  snapshot.active_reminder = detail;
  Some(snapshot)
}

fn seed_snapshot_for_skill_upsert(
  cached_snapshot: Option<WorkspaceSnapshot>,
  detail: SkillDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_skill_summary(
    &mut snapshot.skills,
    build_skill_summary_from_detail(&detail),
  );
  snapshot.active_skill_id = detail.id;
  snapshot.active_skill = detail;
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &snapshot.active_session.session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );
  Some(snapshot)
}

fn seed_snapshot_for_note_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  note_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  snapshot.notes.retain(|note| note.id != note_id);
  for reminder in &mut snapshot.reminders {
    if reminder.linked_note_id == Some(note_id) {
      reminder.linked_note_id = None;
    }
  }
  if snapshot.active_reminder.linked_note_id == Some(note_id) {
    snapshot.active_reminder.linked_note_id = None;
  }

  if snapshot.active_note_id == note_id {
    snapshot.active_note_id = snapshot.notes.first().map(|note| note.id).unwrap_or(0);
  }
  Some(snapshot)
}

fn seed_snapshot_for_reminder_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  reminder_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  snapshot
    .reminders
    .retain(|reminder| reminder.id != reminder_id);
  if snapshot.active_reminder_id == reminder_id {
    if let Some(next_reminder) = snapshot.reminders.first() {
      snapshot.active_reminder_id = next_reminder.id;
    } else {
      snapshot.active_reminder_id = 0;
      snapshot.active_reminder = empty_reminder_detail();
    }
  }
  Some(snapshot)
}

fn seed_snapshot_for_skill_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  skill_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  snapshot.skills.retain(|skill| skill.id != skill_id);
  snapshot
    .active_session
    .mounted_skill_ids
    .retain(|mounted_skill_id| *mounted_skill_id != skill_id);
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &snapshot.active_session.session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );

  if snapshot.active_skill_id == skill_id {
    snapshot.active_skill_id = snapshot.skills.first().map(|skill| skill.id).unwrap_or(0);
  }
  Some(snapshot)
}

fn seed_snapshot_for_session_skills_save(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session: SessionSummary,
  mounted_skill_ids: Vec<i64>,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_session_summary(&mut snapshot.sessions, session.clone());
  if snapshot.active_session_id != session.id || snapshot.active_session.session.id != session.id {
    return Some(snapshot);
  }

  snapshot.active_session.session = session.clone();
  snapshot.active_session.mounted_skill_ids = mounted_skill_ids;
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );
  Some(snapshot)
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

fn is_cjk_character(ch: char) -> bool {
  matches!(
    ch as u32,
    0x4E00..=0x9FFF | 0x3400..=0x4DBF | 0xF900..=0xFAFF
  )
}

fn score_skill_recommendation_stable(
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

  score +=
    score_skill_recommendation_from_intent_stable(skill, session_haystack, &mut matched_terms);
  matched_terms.sort();
  matched_terms.dedup();

  (
    score,
    build_skill_recommendation_reason_stable(session_haystack, &matched_terms),
  )
}

fn score_skill_recommendation_from_intent_stable(
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
    return if capture_match(&[
      "note",
      "notes",
      "knowledge",
      "context",
      "文档",
      "笔记",
      "知识",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("knowledge librarian") || skill_name.contains("知识整理员") {
    return if capture_match(&[
      "summary",
      "summarize",
      "整理",
      "归档",
      "note",
      "沉淀",
      "知识库",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("reminder radar") || skill_name.contains("提醒雷达") {
    return if capture_match(&[
      "todo",
      "deadline",
      "follow-up",
      "follow up",
      "remind",
      "待办",
      "截止",
      "提醒",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("weather brief") || skill_name.contains("天气简报") {
    return if capture_match(&[
      "weather",
      "forecast",
      "temperature",
      "rain",
      "travel",
      "天气",
      "降雨",
      "温度",
      "出行",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("music companion") || skill_name.contains("音乐陪听") {
    return if capture_match(&[
      "music", "playlist", "song", "track", "mood", "音乐", "歌单", "曲目", "氛围",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("gallery curator") || skill_name.contains("画廊策展") {
    return if capture_match(&[
      "gallery", "album", "photo", "image", "caption", "图库", "相册", "照片", "图片",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("settings steward") || skill_name.contains("设置管家") {
    return if capture_match(&[
      "setting", "provider", "api key", "cache", "配置", "设置", "缓存", "网关",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("release guard") || skill_name.contains("发布守卫") {
    return if capture_match(&[
      "deploy",
      "migration",
      "auth",
      "billing",
      "delete",
      "发布",
      "迁移",
      "鉴权",
      "删除",
    ]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("ui polish") || skill_name.contains("界面打磨") {
    return if capture_match(&[
      "ui", "layout", "css", "frontend", "design", "界面", "布局", "前端", "样式",
    ]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("research mode") || skill_name.contains("研究模式") {
    return if capture_match(&[
      "research", "source", "docs", "verify", "citation", "文档", "校验", "出处", "来源",
    ]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("task router") || skill_name.contains("任务路由") {
    return if capture_match(&[
      "plan",
      "steps",
      "multi-step",
      "complex",
      "规划",
      "步骤",
      "复杂",
      "拆解",
    ]) {
      6
    } else {
      0
    };
  }

  0
}

fn build_skill_recommendation_reason_stable(
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

fn empty_reminder_detail() -> ReminderDetail {
  ReminderDetail {
    id: 0,
    title: String::new(),
    detail: String::new(),
    preview: String::new(),
    due_at: None,
    severity: "medium".to_string(),
    status: "scheduled".to_string(),
    linked_note_id: None,
    created_at: 0,
    updated_at: 0,
  }
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

fn append_message_in(
  conn: &Connection,
  session_id: i64,
  role: &str,
  content: &str,
) -> Result<ChatMessage> {
  let now = now_millis();
  let trimmed = content.trim();
  conn.execute(
    "INSERT INTO messages (session_id, role, content, created_at)
     VALUES (?1, ?2, ?3, ?4)",
    params![session_id, role, trimmed, now],
  )?;
  let message = ChatMessage {
    id: conn.last_insert_rowid(),
    role: role.to_string(),
    content: trimmed.to_string(),
    created_at: now,
  };
  conn.execute(
    "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
    params![now, session_id],
  )?;
  Ok(message)
}

fn append_activity_in(
  conn: &Connection,
  session_id: i64,
  kind: &str,
  title: &str,
  detail: &str,
  status: &str,
) -> Result<ActivityItem> {
  let now = now_millis();
  conn.execute(
    "INSERT INTO activity (session_id, kind, title, detail, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![session_id, kind, title, detail, status, now],
  )?;
  let activity = ActivityItem {
    id: conn.last_insert_rowid(),
    kind: kind.to_string(),
    title: title.to_string(),
    detail: detail.to_string(),
    status: status.to_string(),
    created_at: now,
  };
  conn.execute(
    "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
    params![now, session_id],
  )?;
  Ok(activity)
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

fn normalize_tags(tags: Vec<String>) -> Vec<String> {
  tags
    .into_iter()
    .map(|tag| tag.trim().to_string())
    .filter(|tag| !tag.is_empty())
    .collect()
}

fn normalize_note_icon(icon: &str) -> String {
  if icon.trim().is_empty() {
    "*".to_string()
  } else {
    icon.trim().chars().take(2).collect::<String>()
  }
}

fn normalize_note_title(title: &str) -> String {
  if title.trim().is_empty() {
    "Untitled note".to_string()
  } else {
    title.trim().to_string()
  }
}

fn build_note_detail(
  id: i64,
  icon: String,
  title: String,
  body: String,
  tags: Vec<String>,
  created_at: i64,
  updated_at: i64,
) -> KnowledgeNoteDetail {
  KnowledgeNoteDetail {
    id,
    icon,
    title,
    summary: preview_text(&body, 120),
    body,
    tags,
    created_at,
    updated_at,
  }
}

fn build_note_summary_from_detail(detail: &KnowledgeNoteDetail) -> KnowledgeNoteSummary {
  KnowledgeNoteSummary {
    id: detail.id,
    icon: detail.icon.clone(),
    title: detail.title.clone(),
    summary: detail.summary.clone(),
    tags: detail.tags.clone(),
    updated_at: detail.updated_at,
  }
}

fn build_reminder_detail(
  id: i64,
  title: String,
  detail: String,
  due_at: Option<i64>,
  severity: String,
  status: String,
  linked_note_id: Option<i64>,
  created_at: i64,
  updated_at: i64,
) -> ReminderDetail {
  ReminderDetail {
    id,
    title,
    preview: preview_text(&detail, 120),
    detail,
    due_at,
    severity,
    status,
    linked_note_id,
    created_at,
    updated_at,
  }
}

fn build_reminder_summary_from_detail(detail: &ReminderDetail) -> ReminderSummary {
  ReminderSummary {
    id: detail.id,
    title: detail.title.clone(),
    preview: detail.preview.clone(),
    due_at: detail.due_at,
    severity: detail.severity.clone(),
    status: detail.status.clone(),
    linked_note_id: detail.linked_note_id,
    updated_at: detail.updated_at,
  }
}

fn build_skill_detail(
  id: i64,
  name: String,
  description: String,
  instructions: String,
  trigger_hint: String,
  enabled: bool,
  permission_level: String,
  created_at: i64,
  updated_at: i64,
) -> SkillDetail {
  SkillDetail {
    id,
    name,
    description: description.clone(),
    summary: preview_text(&description, 120),
    instructions,
    trigger_hint,
    enabled,
    permission_level,
    created_at,
    updated_at,
  }
}

fn build_skill_summary_from_detail(detail: &SkillDetail) -> SkillSummary {
  SkillSummary {
    id: detail.id,
    name: detail.name.clone(),
    summary: detail.summary.clone(),
    trigger_hint: detail.trigger_hint.clone(),
    recommendation_reason: None,
    enabled: detail.enabled,
    permission_level: detail.permission_level.clone(),
    updated_at: detail.updated_at,
  }
}

fn load_note_created_at_in(conn: &Connection, note_id: i64) -> Result<i64> {
  conn
    .query_row(
      "SELECT created_at FROM notes WHERE id = ?1",
      params![note_id],
      |row| row.get(0),
    )
    .optional()?
    .context("note not found")
}

fn load_reminder_created_at_in(conn: &Connection, reminder_id: i64) -> Result<i64> {
  conn
    .query_row(
      "SELECT created_at FROM reminders WHERE id = ?1",
      params![reminder_id],
      |row| row.get(0),
    )
    .optional()?
    .context("reminder not found")
}

fn load_skill_created_at_in(conn: &Connection, skill_id: i64) -> Result<i64> {
  conn
    .query_row(
      "SELECT created_at FROM skills WHERE id = ?1",
      params![skill_id],
      |row| row.get(0),
    )
    .optional()?
    .context("skill not found")
}

fn upsert_note_summary(notes: &mut Vec<KnowledgeNoteSummary>, summary: KnowledgeNoteSummary) {
  notes.retain(|note| note.id != summary.id);
  notes.push(summary);
  notes.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}

fn upsert_session_summary(sessions: &mut Vec<SessionSummary>, summary: SessionSummary) {
  sessions.retain(|session| session.id != summary.id);
  sessions.push(summary);
  sessions.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}

fn upsert_reminder_summary(reminders: &mut Vec<ReminderSummary>, summary: ReminderSummary) {
  reminders.retain(|reminder| reminder.id != summary.id);
  reminders.push(summary);
  reminders.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}

fn upsert_skill_summary(skills: &mut Vec<SkillSummary>, summary: SkillSummary) {
  skills.retain(|skill| skill.id != summary.id);
  skills.push(summary);
  skills.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
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
    DEFAULT_SESSION_TITLE.to_string()
  } else {
    shortened
  }
}

fn build_capability_catalog() -> Vec<Capability> {
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
      description: "Each mission stores input, plan, model result and persistence state."
        .to_string(),
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

fn capability_catalog() -> Vec<Capability> {
  CAPABILITY_CATALOG.clone()
}

#[cfg(test)]
mod tests {
  use super::*;

  static TEST_STATE_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

  struct EnvGuard {
    api_key: Option<String>,
    api_base: Option<String>,
    model: Option<String>,
  }

  impl EnvGuard {
    fn clear_openai_vars() -> Self {
      let guard = Self {
        api_key: std::env::var("OPENAI_API_KEY").ok(),
        api_base: std::env::var("OPENAI_API_BASE").ok(),
        model: std::env::var("OPENAI_MODEL").ok(),
      };

      std::env::remove_var("OPENAI_API_KEY");
      std::env::remove_var("OPENAI_API_BASE");
      std::env::remove_var("OPENAI_MODEL");

      guard
    }
  }

  impl Drop for EnvGuard {
    fn drop(&mut self) {
      match &self.api_key {
        Some(value) => std::env::set_var("OPENAI_API_KEY", value),
        None => std::env::remove_var("OPENAI_API_KEY"),
      }
      match &self.api_base {
        Some(value) => std::env::set_var("OPENAI_API_BASE", value),
        None => std::env::remove_var("OPENAI_API_BASE"),
      }
      match &self.model {
        Some(value) => std::env::set_var("OPENAI_MODEL", value),
        None => std::env::remove_var("OPENAI_MODEL"),
      }
    }
  }

  fn test_connection() -> Result<Connection> {
    clear_snapshot_cache()?;
    clear_settings_cache()?;
    let conn = Connection::open_in_memory()?;
    conn.execute_batch(include_str!("../sql/schema.sql"))?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    run_post_init_migrations_in(&conn)?;
    Ok(conn)
  }

  fn reset_secret_state() -> Result<()> {
    store_runtime_api_key(String::new())?;
    delete_api_key_from_keyring()
  }

  fn sample_settings(api_key: &str) -> AgentSettings {
    AgentSettings {
      provider_name: "OpenAI Compatible".to_string(),
      base_url: "https://api.openai.com/v1".to_string(),
      has_api_key: !api_key.trim().is_empty(),
      api_key: api_key.to_string(),
      model: "gpt-4.1-mini".to_string(),
      system_prompt: "test prompt".to_string(),
    }
  }

  fn blank_input(clear_api_key: bool) -> AgentSettingsInput {
    AgentSettingsInput {
      provider_name: String::new(),
      base_url: String::new(),
      clear_api_key,
      api_key: "   ".to_string(),
      model: String::new(),
      system_prompt: String::new(),
    }
  }

  fn input_with_api_key(api_key: &str) -> AgentSettingsInput {
    AgentSettingsInput {
      provider_name: String::new(),
      base_url: String::new(),
      clear_api_key: false,
      api_key: api_key.to_string(),
      model: String::new(),
      system_prompt: String::new(),
    }
  }

  fn persisted_settings(conn: &Connection) -> Result<AgentSettings> {
    let raw = load_setting_value_in(conn, SETTINGS_KEY)?.context("missing settings payload")?;
    serde_json::from_str(&raw).map_err(Into::into)
  }

  #[test]
  fn blank_save_keeps_existing_api_key() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let _env = EnvGuard::clear_openai_vars();
    reset_secret_state()?;

    let conn = test_connection()?;
    store_settings_in(&conn, &sample_settings("key-one"))?;

    let merged = merge_settings_input(load_settings_in(&conn)?, blank_input(false));
    store_settings_in(&conn, &merged)?;

    let reloaded = load_settings_in(&conn)?;
    let persisted = persisted_settings(&conn)?;

    assert_eq!(reloaded.api_key, "key-one");
    assert!(reloaded.has_api_key);
    assert_eq!(read_runtime_api_key()?, Some("key-one".to_string()));
    assert_eq!(load_api_key_from_keyring()?, Some("key-one".to_string()));
    assert_eq!(persisted.api_key, "");
    assert!(!persisted.has_api_key);
    Ok(())
  }

  #[test]
  fn explicit_clear_removes_stored_api_key() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let _env = EnvGuard::clear_openai_vars();
    reset_secret_state()?;

    let conn = test_connection()?;
    store_settings_in(&conn, &sample_settings("key-one"))?;

    let merged = merge_settings_input(load_settings_in(&conn)?, blank_input(true));
    store_settings_in(&conn, &merged)?;

    let reloaded = load_settings_in(&conn)?;
    let persisted = persisted_settings(&conn)?;

    assert_eq!(reloaded.api_key, "");
    assert!(!reloaded.has_api_key);
    assert_eq!(read_runtime_api_key()?, None);
    assert_eq!(load_api_key_from_keyring()?, None);
    assert_eq!(persisted.api_key, "");
    assert!(!persisted.has_api_key);
    Ok(())
  }

  #[test]
  fn load_settings_migrates_legacy_plaintext_api_key_out_of_db() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let _env = EnvGuard::clear_openai_vars();
    reset_secret_state()?;

    let conn = test_connection()?;
    upsert_setting_value_in(
      &conn,
      SETTINGS_KEY,
      &serde_json::to_string(&sample_settings("legacy-key"))?,
    )?;

    let loaded = load_settings_in(&conn)?;
    let persisted = persisted_settings(&conn)?;

    assert_eq!(loaded.api_key, "legacy-key");
    assert!(loaded.has_api_key);
    assert_eq!(read_runtime_api_key()?, Some("legacy-key".to_string()));
    assert_eq!(load_api_key_from_keyring()?, Some("legacy-key".to_string()));
    assert_eq!(persisted.api_key, "");
    assert!(!persisted.has_api_key);
    Ok(())
  }

  #[test]
  fn snapshot_settings_stay_sanitized_after_saving_api_key() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let _env = EnvGuard::clear_openai_vars();
    reset_secret_state()?;

    let conn = test_connection()?;
    let settings = merge_settings_input(load_settings_in(&conn)?, input_with_api_key("key-one"));
    store_settings_in(&conn, &settings)?;

    let snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy::default(),
    )?;

    assert!(snapshot.settings.has_api_key);
    assert_eq!(snapshot.settings.api_key, "");
    assert_eq!(load_settings_in(&conn)?.api_key, "key-one");
    Ok(())
  }

  #[test]
  fn snapshot_settings_stay_sanitized_after_clearing_api_key() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let _env = EnvGuard::clear_openai_vars();
    reset_secret_state()?;

    let conn = test_connection()?;
    store_settings_in(&conn, &sample_settings("key-one"))?;

    let settings = merge_settings_input(load_settings_in(&conn)?, blank_input(true));
    store_settings_in(&conn, &settings)?;

    let snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy::default(),
    )?;

    assert!(!snapshot.settings.has_api_key);
    assert_eq!(snapshot.settings.api_key, "");
    assert_eq!(load_settings_in(&conn)?.api_key, "");
    Ok(())
  }

  #[test]
  fn saving_missing_note_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = save_note_in(
      &conn,
      KnowledgeNoteInput {
        id: 999,
        icon: "*".to_string(),
        title: "Missing".to_string(),
        body: "Missing".to_string(),
        tags: vec![],
      },
    )
    .expect_err("missing note should fail");

    assert!(error.to_string().contains("note not found"));
    Ok(())
  }

  #[test]
  fn saving_missing_reminder_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = save_reminder_in(
      &conn,
      ReminderInput {
        id: 999,
        title: "Missing".to_string(),
        detail: "Missing".to_string(),
        due_at: None,
        severity: "medium".to_string(),
        status: "scheduled".to_string(),
        linked_note_id: None,
      },
    )
    .expect_err("missing reminder should fail");

    assert!(error.to_string().contains("reminder not found"));
    Ok(())
  }

  #[test]
  fn saving_missing_skill_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = save_skill_in(
      &conn,
      SkillInput {
        id: 999,
        name: "Missing".to_string(),
        description: String::new(),
        instructions: String::new(),
        trigger_hint: String::new(),
        enabled: true,
      },
    )
    .expect_err("missing skill should fail");

    assert!(error.to_string().contains("skill not found"));
    Ok(())
  }

  #[test]
  fn saving_session_skills_requires_existing_session() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error =
      save_session_skills_in(&conn, 999, vec![1]).expect_err("missing session should fail");

    assert!(error.to_string().contains("session not found"));
    Ok(())
  }

  #[test]
  fn opening_missing_session_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = (|| {
      build_workspace_snapshot_with_policy_in(
        &conn,
        Some(999),
        None,
        None,
        None,
        SnapshotReusePolicy::default(),
      )
    })()
    .expect("snapshot fallback should still be available");
    assert_ne!(error.active_session_id, 999);

    let direct_error =
      ensure_session_exists_in(&conn, 999).expect_err("missing session should fail");
    assert!(direct_error.to_string().contains("session not found"));
    Ok(())
  }

  #[test]
  fn opening_missing_note_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = ensure_note_exists_in(&conn, 999).expect_err("missing note should fail");
    assert!(error.to_string().contains("note not found"));
    Ok(())
  }

  #[test]
  fn opening_missing_skill_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = ensure_skill_exists_in(&conn, 999).expect_err("missing skill should fail");
    assert!(error.to_string().contains("skill not found"));
    Ok(())
  }

  #[test]
  fn deleting_missing_entities_returns_not_found_error() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let session_error = delete_session_in(&conn, 999).expect_err("missing session should fail");
    assert!(session_error.to_string().contains("session not found"));

    let note_error = delete_note_in(&conn, 999).expect_err("missing note should fail");
    assert!(note_error.to_string().contains("note not found"));

    let reminder_error = delete_reminder_in(&conn, 999).expect_err("missing reminder should fail");
    assert!(reminder_error.to_string().contains("reminder not found"));

    let skill_error = delete_skill_in(&conn, 999).expect_err("missing skill should fail");
    assert!(skill_error.to_string().contains("skill not found"));
    Ok(())
  }

  #[test]
  fn saving_reminder_ignores_missing_linked_note_id() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let reminder_id = create_reminder_in(&conn, Some("Reminder".to_string()))?;
    save_reminder_in(
      &conn,
      ReminderInput {
        id: reminder_id,
        title: "Reminder".to_string(),
        detail: "Detail".to_string(),
        due_at: None,
        severity: "medium".to_string(),
        status: "scheduled".to_string(),
        linked_note_id: Some(999),
      },
    )?;

    let linked_note_id: Option<i64> = conn.query_row(
      "SELECT linked_note_id FROM reminders WHERE id = ?1",
      params![reminder_id],
      |row| row.get(0),
    )?;
    assert_eq!(linked_note_id, None);
    Ok(())
  }

  #[test]
  fn list_sessions_in_aggregates_message_and_skill_stats() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let session_id = create_session_in(&conn, Some("Perf target".to_string()))?;
    append_message_in(&conn, session_id, "user", "First mission input")?;
    append_message_in(
      &conn,
      session_id,
      "assistant",
      "This is a deliberately long assistant reply that should be trimmed in session previews.",
    )?;

    let skill_id = create_skill_in(&conn, Some("Fast path".to_string()))?;
    save_session_skills_in(&conn, session_id, vec![skill_id])?;

    let sessions = list_sessions_in(&conn)?;
    let session = sessions
      .into_iter()
      .find(|item| item.id == session_id)
      .context("expected session summary")?;

    assert_eq!(session.title, "Perf target");
    assert_eq!(session.status, "idle");
    assert_eq!(session.message_count, 3);
    assert_eq!(session.mounted_skill_count, 1);
    assert!(session
      .last_message_preview
      .contains("deliberately long assistant reply"));
    assert!(session.last_message_preview.chars().count() <= 95);
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_incremental_session_timeline() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let session_id = create_session_in(&conn, Some("Seeded run".to_string()))?;
    let base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(session_id),
      None,
      None,
      None,
      SnapshotReusePolicy::default(),
    )?;

    let user_message = append_message_in(&conn, session_id, "user", "Need a release checklist")?;
    let input_activity = append_activity_in(
      &conn,
      session_id,
      "input",
      "Mission received",
      "New mission captured: Need a release checklist",
      "completed",
    )?;
    let assistant_message = append_message_in(
      &conn,
      session_id,
      "assistant",
      "Start with migrations, smoke tests, and rollback prep.",
    )?;
    let output_activity = append_activity_in(
      &conn,
      session_id,
      "output",
      "Reply persisted",
      "Assistant output has been stored in the session log.",
      "completed",
    )?;
    let updated_session = load_session_summary_in(&conn, session_id)?;
    let seeded_snapshot = seed_snapshot_for_persisted_run(
      Some(base_snapshot),
      session_id,
      updated_session.clone(),
      &[user_message.clone(), assistant_message.clone()],
      &[input_activity.clone(), output_activity.clone()],
    )
    .context("expected seeded snapshot")?;

    let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(session_id),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_active_session_timeline: true,
        ..SnapshotReusePolicy::default()
      },
      Some(seeded_snapshot),
    )?;

    assert_eq!(snapshot.active_session.session, updated_session);
    assert_eq!(
      snapshot
        .active_session
        .messages
        .iter()
        .rev()
        .take(2)
        .map(|message| message.content.as_str())
        .collect::<Vec<_>>(),
      vec![
        assistant_message.content.as_str(),
        user_message.content.as_str(),
      ],
    );
    assert_eq!(
      snapshot.active_session.activity[0].title,
      output_activity.title
    );
    assert_eq!(
      snapshot.active_session.activity[1].title,
      input_activity.title
    );
    Ok(())
  }

  #[test]
  fn snapshot_policy_reuses_only_requested_region_lists() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )?;
    let preferred_reminder_id =
      (base_snapshot.active_reminder_id > 0).then_some(base_snapshot.active_reminder_id);
    let note_id = create_note_in(&conn, Some("Fresh cache bypass".to_string()))?;

    let reused_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(base_snapshot.active_session_id),
      Some(base_snapshot.active_note_id),
      preferred_reminder_id,
      Some(base_snapshot.active_skill_id),
      SnapshotReusePolicy::read_only(),
    )?;
    assert!(reused_snapshot.notes.iter().all(|note| note.id != note_id));

    let refreshed_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(base_snapshot.active_session_id),
      Some(base_snapshot.active_note_id),
      preferred_reminder_id,
      Some(base_snapshot.active_skill_id),
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
    )?;
    assert!(refreshed_snapshot
      .notes
      .iter()
      .any(|note| note.id == note_id));
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_note_reminder_and_skill_upserts() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )?;
    let preferred_reminder_id =
      (base_snapshot.active_reminder_id > 0).then_some(base_snapshot.active_reminder_id);

    let note = create_note_detail_in(&conn, Some("Seeded note".to_string()))?;
    let note_snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(base_snapshot.active_session_id),
      Some(note.id),
      preferred_reminder_id,
      Some(base_snapshot.active_skill_id),
      SnapshotReusePolicy::read_only(),
      seed_snapshot_for_note_upsert(Some(base_snapshot.clone()), note.clone()),
    )?;
    assert_eq!(note_snapshot.active_note.id, note.id);
    assert!(note_snapshot.notes.iter().any(|item| item.id == note.id));

    let reminder = create_reminder_detail_in(&conn, Some("Seeded reminder".to_string()))?;
    let reminder_snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(base_snapshot.active_session_id),
      Some(base_snapshot.active_note_id),
      Some(reminder.id),
      Some(base_snapshot.active_skill_id),
      SnapshotReusePolicy::read_only(),
      seed_snapshot_for_reminder_upsert(Some(base_snapshot.clone()), reminder.clone()),
    )?;
    assert_eq!(reminder_snapshot.active_reminder.id, reminder.id);
    assert!(reminder_snapshot
      .reminders
      .iter()
      .any(|item| item.id == reminder.id));

    let skill = create_skill_detail_in(&conn, Some("Seeded skill".to_string()))?;
    let skill_snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(base_snapshot.active_session_id),
      Some(base_snapshot.active_note_id),
      preferred_reminder_id,
      Some(skill.id),
      SnapshotReusePolicy::read_only(),
      seed_snapshot_for_skill_upsert(Some(base_snapshot), skill.clone()),
    )?;
    assert_eq!(skill_snapshot.active_skill.id, skill.id);
    assert!(skill_snapshot.skills.iter().any(|item| item.id == skill.id));
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_note_delete_and_linked_reminder_updates() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let active_session_id = ensure_seed_session_in(&conn)?;
    let note = create_note_detail_in(&conn, Some("Delete target note".to_string()))?;
    let reminder = create_reminder_detail_in(&conn, Some("Linked reminder".to_string()))?;
    assert_eq!(reminder.linked_note_id, Some(note.id));

    let seeded_base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(active_session_id),
      Some(note.id),
      Some(reminder.id),
      None,
      SnapshotReusePolicy::default(),
    )?;

    delete_note_in(&conn, note.id)?;
    ensure_seed_note_in(&conn)?;

    let seeded_snapshot = seed_snapshot_for_note_delete(Some(seeded_base_snapshot), note.id);
    let can_reuse_active_note_detail = seeded_snapshot
      .as_ref()
      .map(|snapshot| snapshot.active_note.id == snapshot.active_note_id)
      .unwrap_or(false);
    let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(active_session_id),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: can_reuse_active_note_detail,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )?;

    assert!(snapshot.notes.iter().all(|item| item.id != note.id));
    assert!(snapshot
      .reminders
      .iter()
      .all(|item| item.linked_note_id != Some(note.id)));
    assert_ne!(snapshot.active_note_id, note.id);
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_skill_delete_for_active_session_mounts() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let active_session_id = ensure_seed_session_in(&conn)?;
    let skill = create_skill_detail_for_active_session_in(
      &conn,
      Some("Mounted delete target".to_string()),
      Some(active_session_id),
    )?;
    let seeded_base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(active_session_id),
      None,
      None,
      Some(skill.id),
      SnapshotReusePolicy::default(),
    )?;
    assert!(seeded_base_snapshot
      .active_session
      .mounted_skill_ids
      .contains(&skill.id));

    delete_skill_in(&conn, skill.id)?;
    ensure_seed_skill_in(&conn)?;

    let seeded_snapshot = seed_snapshot_for_skill_delete(Some(seeded_base_snapshot), skill.id);
    let can_reuse_active_skill_detail = seeded_snapshot
      .as_ref()
      .map(|snapshot| snapshot.active_skill.id == snapshot.active_skill_id)
      .unwrap_or(false);
    let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(active_session_id),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: can_reuse_active_skill_detail,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )?;

    assert!(snapshot.skills.iter().all(|item| item.id != skill.id));
    assert!(!snapshot
      .active_session
      .mounted_skill_ids
      .contains(&skill.id));
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_session_create() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )?;
    let session = create_session_detail_in(&conn, Some("Seeded session".to_string()))?;
    let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(session.session.id),
      Some(base_snapshot.active_note_id),
      (base_snapshot.active_reminder_id > 0).then_some(base_snapshot.active_reminder_id),
      Some(base_snapshot.active_skill_id),
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seed_snapshot_for_session_create(Some(base_snapshot), session.clone()),
    )?;

    assert_eq!(snapshot.active_session_id, session.session.id);
    assert_eq!(snapshot.active_session.session, session.session);
    assert!(snapshot
      .sessions
      .iter()
      .any(|item| item.id == session.session.id));
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_session_delete_with_remaining_session() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let keep_session = create_session_in(&conn, Some("Keep session".to_string()))?;
    let delete_session = create_session_in(&conn, Some("Delete session".to_string()))?;
    let base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(delete_session),
      None,
      None,
      None,
      SnapshotReusePolicy::read_only(),
    )?;

    delete_session_in(&conn, delete_session)?;
    let seeded_snapshot = seed_snapshot_for_session_delete(Some(base_snapshot), delete_session);
    let can_reuse_session_list = seeded_snapshot
      .as_ref()
      .map(|snapshot| !snapshot.sessions.is_empty())
      .unwrap_or(false);
    let can_reuse_active_session_timeline = seeded_snapshot
      .as_ref()
      .map(|snapshot| {
        can_reuse_session_list
          && snapshot.active_session_id > 0
          && snapshot.active_session.session.id == snapshot.active_session_id
      })
      .unwrap_or(false);
    let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      None,
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: can_reuse_session_list,
        reuse_active_session_timeline: can_reuse_active_session_timeline,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seeded_snapshot,
    )?;

    assert!(snapshot
      .sessions
      .iter()
      .all(|item| item.id != delete_session));
    assert_eq!(snapshot.active_session_id, keep_session);
    Ok(())
  }

  #[test]
  fn seeded_snapshot_preserves_session_skill_mount_updates() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let session_id = create_session_in(&conn, Some("Mount update".to_string()))?;
    let first_skill = create_skill_detail_in(&conn, Some("Alpha mount".to_string()))?;
    let second_skill = create_skill_detail_in(&conn, Some("Beta mount".to_string()))?;
    let base_snapshot = build_workspace_snapshot_with_policy_in(
      &conn,
      Some(session_id),
      None,
      None,
      Some(first_skill.id),
      SnapshotReusePolicy::read_only(),
    )?;

    let mounted_skill_ids =
      save_session_skills_in(&conn, session_id, vec![first_skill.id, second_skill.id])?;
    let updated_session = load_session_summary_in(&conn, session_id)?;
    let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
      &conn,
      Some(session_id),
      None,
      None,
      None,
      SnapshotReusePolicy {
        reuse_session_list: true,
        reuse_active_session_timeline: true,
        reuse_note_list: true,
        reuse_active_note_detail: true,
        reuse_reminder_list: true,
        reuse_active_reminder_detail: true,
        reuse_skill_list: true,
        reuse_active_skill_detail: true,
        ..SnapshotReusePolicy::default()
      },
      seed_snapshot_for_session_skills_save(
        Some(base_snapshot),
        updated_session.clone(),
        mounted_skill_ids.clone(),
      ),
    )?;

    assert_eq!(snapshot.active_session.session, updated_session);
    assert_eq!(snapshot.active_session.mounted_skill_ids, mounted_skill_ids);
    assert_eq!(
      snapshot
        .active_session
        .mounted_skills
        .iter()
        .map(|skill| skill.id)
        .collect::<Vec<_>>(),
      mounted_skill_ids
    );
    Ok(())
  }

  #[test]
  fn lightweight_runtime_context_queries_return_scoped_results() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let session_id = create_session_in(&conn, Some("Context run".to_string()))?;
    append_message_in(&conn, session_id, "user", "Need the deployment runbook")?;

    let skill_id = create_skill_in(&conn, Some("Deploy helper".to_string()))?;
    save_session_skills_in(&conn, session_id, vec![skill_id])?;

    let note_id = create_note_in(&conn, Some("Deployment runbook".to_string()))?;
    save_note_in(
      &conn,
      KnowledgeNoteInput {
        id: note_id,
        icon: "*".to_string(),
        title: "Deployment runbook".to_string(),
        body: "Deploy checklist\nShip backend\nVerify logs\nRollback if error".to_string(),
        tags: vec!["ops".to_string(), "deploy".to_string()],
      },
    )?;

    let reminder_id = create_reminder_in(&conn, Some("Ship release".to_string()))?;
    save_reminder_in(
      &conn,
      ReminderInput {
        id: reminder_id,
        title: "Ship release".to_string(),
        detail: "Verify deployment runbook first".to_string(),
        due_at: Some(now_millis() + 30 * 60 * 1000),
        severity: "high".to_string(),
        status: "scheduled".to_string(),
        linked_note_id: Some(note_id),
      },
    )?;

    let session = load_agent_session_context_in(&conn, session_id)?;
    assert_eq!(session.title, "Context run");
    assert_eq!(session.status, "idle");
    assert_eq!(session.message_count, 2);
    assert_eq!(
      session.mounted_skill_names,
      vec!["Deploy helper".to_string()]
    );

    let notes = list_note_context_in(&conn, 8, 24)?;
    let note = notes
      .into_iter()
      .find(|item| item.title == "Deployment runbook")
      .context("expected note context")?;
    assert!(note.body_excerpt.chars().count() <= 24);
    assert_eq!(note.tags, vec!["ops".to_string(), "deploy".to_string()]);

    let reminders = list_open_reminder_context_in(&conn, 4)?;
    let reminder = reminders
      .into_iter()
      .find(|item| item.title == "Ship release")
      .context("expected reminder context")?;
    assert_eq!(reminder.severity, "high");
    assert_eq!(
      reminder.linked_note_title,
      Some("Deployment runbook".to_string())
    );
    Ok(())
  }

  #[test]
  fn invalid_active_session_id_is_rejected_in_snapshot_operations() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;

    let error = resolve_active_session_id_in(&conn, Some(999))
      .expect_err("missing active session should fail");

    assert!(error.to_string().contains("session not found"));
    Ok(())
  }

  #[test]
  fn create_skill_for_missing_active_session_does_not_insert_skill() -> Result<()> {
    let _serial = TEST_STATE_LOCK
      .lock()
      .map_err(|_| anyhow!("test state mutex poisoned"))?;
    let conn = test_connection()?;
    let initial_count = list_skills_in(&conn)?.len();

    let error = create_skill_for_active_session_in(&conn, Some("Orphan".to_string()), Some(999))
      .expect_err("missing active session should fail");

    assert!(error.to_string().contains("session not found"));
    assert_eq!(list_skills_in(&conn)?.len(), initial_count);
    Ok(())
  }

  #[test]
  fn provider_base_url_rejects_remote_http() {
    let error = validate_provider_base_url("http://example.com/v1")
      .expect_err("remote http should be rejected");

    assert!(error
      .to_string()
      .contains("https unless it points to localhost or a private network"));
  }

  #[test]
  fn provider_base_url_allows_local_http() -> Result<()> {
    validate_provider_base_url("http://127.0.0.1:11434/v1")
  }

  #[test]
  fn provider_base_url_rejects_embedded_credentials() {
    let error = validate_provider_base_url("https://user:pass@example.com/v1")
      .expect_err("embedded credentials should be rejected");

    assert!(error.to_string().contains("embedded credentials"));
  }

  #[test]
  fn provider_base_url_enforces_allowlist_when_requested() -> Result<()> {
    std::env::set_var("MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS", "true");
    std::env::set_var("MMGH_TRUSTED_PROVIDER_HOSTS", "api.openai.com");

    let error = validate_provider_base_url("https://gateway.example.com/v1")
      .expect_err("untrusted host should be rejected when allowlist enforcement is enabled");

    assert!(error.to_string().contains("MMGH_TRUSTED_PROVIDER_HOSTS"));

    std::env::remove_var("MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS");
    std::env::remove_var("MMGH_TRUSTED_PROVIDER_HOSTS");
    Ok(())
  }
}
