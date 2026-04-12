use serde::{Deserialize, Serialize};

use crate::{agent, db};

type CommandResult<T> = Result<T, String>;

fn into_command_error(error: anyhow::Error) -> String {
  format!("{error:#}")
}

#[tauri::command]
pub fn bootstrap() -> CommandResult<db::WorkspaceSnapshot> {
  db::bootstrap().map_err(into_command_error)
}

#[tauri::command]
pub fn open_session(session_id: i64) -> CommandResult<db::WorkspaceSnapshot> {
  db::open_session(session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn create_session(title: Option<String>) -> CommandResult<db::WorkspaceSnapshot> {
  db::create_session(title).map_err(into_command_error)
}

#[tauri::command]
pub fn delete_session(session_id: i64) -> CommandResult<db::WorkspaceSnapshot> {
  db::delete_session(session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn save_settings(
  settings: AgentSettingsInput,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::save_settings(settings, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn open_knowledge_note(
  note_id: i64,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::open_note(note_id, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn create_knowledge_note(
  title: Option<String>,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::create_note(title, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn save_knowledge_note(
  note: KnowledgeNoteInput,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::save_note(note, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn delete_knowledge_note(
  note_id: i64,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::delete_note(note_id, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn open_reminder(
  reminder_id: i64,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::open_reminder(reminder_id, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn create_reminder(
  title: Option<String>,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::create_reminder(title, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn save_reminder(
  reminder: ReminderInput,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::save_reminder(reminder, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn delete_reminder(
  reminder_id: i64,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::delete_reminder(reminder_id, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn open_skill(
  skill_id: i64,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::open_skill(skill_id, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn create_skill(
  name: Option<String>,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::create_skill(name, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn save_skill(
  skill: SkillInput,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::save_skill(skill, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn delete_skill(
  skill_id: i64,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::delete_skill(skill_id, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn save_session_skills(
  session_id: i64,
  skill_ids: Vec<i64>,
  active_session_id: Option<i64>,
) -> CommandResult<db::WorkspaceSnapshot> {
  db::save_session_skills(session_id, skill_ids, active_session_id).map_err(into_command_error)
}

#[tauri::command]
pub fn forge_skill(
  prompt: String,
  lang: Option<String>,
  existing_skill: Option<SkillInput>,
  settings: Option<AgentSettingsInput>,
) -> CommandResult<agent::GeneratedSkillDraft> {
  agent::forge_skill(prompt, lang, existing_skill, settings).map_err(into_command_error)
}

#[tauri::command]
pub fn run_agent(session_id: i64, prompt: String) -> CommandResult<db::WorkspaceSnapshot> {
  agent::run_agent(session_id, prompt).map_err(into_command_error)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSettingsInput {
  pub provider_name: String,
  pub base_url: String,
  #[serde(default)]
  pub clear_api_key: bool,
  pub api_key: String,
  pub model: String,
  pub system_prompt: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeNoteInput {
  pub id: i64,
  pub icon: String,
  pub title: String,
  pub body: String,
  pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderInput {
  pub id: i64,
  pub title: String,
  pub detail: String,
  pub due_at: Option<i64>,
  pub severity: String,
  pub status: String,
  pub linked_note_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillInput {
  pub id: i64,
  pub name: String,
  pub description: String,
  pub instructions: String,
  pub trigger_hint: String,
  pub enabled: bool,
}
