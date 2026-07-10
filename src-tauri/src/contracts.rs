use serde::{Deserialize, Serialize};

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
