use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
  Bootstrap {
    callback: String,
    error: String,
  },
  OpenSession {
    session_id: i64,
    callback: String,
    error: String,
  },
  CreateSession {
    title: Option<String>,
    callback: String,
    error: String,
  },
  DeleteSession {
    session_id: i64,
    callback: String,
    error: String,
  },
  SaveSettings {
    settings: AgentSettingsInput,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  OpenKnowledgeNote {
    note_id: i64,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  CreateKnowledgeNote {
    title: Option<String>,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  SaveKnowledgeNote {
    note: KnowledgeNoteInput,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  DeleteKnowledgeNote {
    note_id: i64,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  CreateReminder {
    title: Option<String>,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  SaveReminder {
    reminder: ReminderInput,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  DeleteReminder {
    reminder_id: i64,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  OpenSkill {
    skill_id: i64,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  CreateSkill {
    name: Option<String>,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  SaveSkill {
    skill: SkillInput,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  DeleteSkill {
    skill_id: i64,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  SaveSessionSkills {
    session_id: i64,
    skill_ids: Vec<i64>,
    active_session_id: Option<i64>,
    callback: String,
    error: String,
  },
  ForgeSkill {
    prompt: String,
    lang: Option<String>,
    existing_skill: Option<SkillInput>,
    settings: Option<AgentSettingsInput>,
    callback: String,
    error: String,
  },
  RunAgent {
    session_id: i64,
    prompt: String,
    callback: String,
    error: String,
  },
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
