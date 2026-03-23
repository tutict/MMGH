use anyhow::{anyhow, Context, Result};
use reqwest::blocking::Client;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::db;

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
  model: String,
  messages: Vec<CompletionMessage>,
  temperature: f32,
}

#[derive(Debug, Serialize)]
struct CompletionMessage {
  role: String,
  content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
  choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
  message: ChatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponseMessage {
  content: Value,
}

pub fn run_agent(session_id: i64, prompt: String) -> Result<db::WorkspaceSnapshot> {
  let trimmed_prompt = prompt.trim().to_string();
  if trimmed_prompt.is_empty() {
    return Err(anyhow!("prompt cannot be empty"));
  }

  db::update_session_status(session_id, "running")?;
  db::append_message(session_id, "user", &trimmed_prompt)?;
  db::ensure_session_title(session_id, &trimmed_prompt)?;
  db::append_activity(
    session_id,
    "input",
    "Mission received",
    &format!("New mission captured: {}", shorten(&trimmed_prompt, 120)),
    "completed",
  )?;

  let plan = draft_plan(&trimmed_prompt);
  db::append_activity(
    session_id,
    "plan",
    "Execution plan drafted",
    &plan,
    "completed",
  )?;

  let settings = db::load_settings()?;
  let reply = if settings.is_ready() {
    match request_completion(&settings, session_id) {
      Ok(content) => {
        db::append_activity(
          session_id,
          "model",
          "Provider call finished",
          &format!(
            "{} / {} returned {} chars.",
            settings.provider_name,
            settings.model,
            content.chars().count()
          ),
          "completed",
        )?;
        content
      }
      Err(error) => {
        db::append_activity(
          session_id,
          "model",
          "Provider call failed",
          &shorten(&format!("{:#}", error), 200),
          "failed",
        )?;
        local_fallback_reply(&trimmed_prompt, Some(&error.to_string()), &settings)
      }
    }
  } else {
    db::append_activity(
      session_id,
      "model",
      "Provider not configured",
      "Missing baseUrl, model or apiKey. Falling back to local preview mode.",
      "warning",
    )?;
    local_fallback_reply(&trimmed_prompt, None, &settings)
  };

  db::append_message(session_id, "assistant", &reply)?;
  db::append_activity(
    session_id,
    "output",
    "Reply persisted",
    "Assistant output has been stored in the session log.",
    "completed",
  )?;
  db::update_session_status(session_id, "ready")?;

  db::workspace_snapshot(Some(session_id))
}

fn request_completion(settings: &db::AgentSettings, session_id: i64) -> Result<String> {
  let history = db::recent_messages(session_id, 18)?;
  let enabled_skills = db::session_enabled_skills(session_id)?;
  let mut messages = Vec::new();

  let skill_block = render_skill_block(&enabled_skills);
  let system_prompt = if settings.system_prompt.trim().is_empty() {
    skill_block
  } else if skill_block.is_empty() {
    settings.system_prompt.clone()
  } else {
    format!("{}\n\n{}", settings.system_prompt.trim(), skill_block)
  };

  if !system_prompt.trim().is_empty() {
    messages.push(CompletionMessage {
      role: "system".to_string(),
      content: system_prompt,
    });
  }

  for item in history {
    messages.push(CompletionMessage {
      role: item.role,
      content: item.content,
    });
  }

  let request = ChatCompletionRequest {
    model: settings.model.clone(),
    messages,
    temperature: 0.4,
  };

  let endpoint = completion_endpoint(&settings.base_url);
  let client = Client::builder()
    .timeout(std::time::Duration::from_secs(90))
    .build()
    .context("failed to build HTTP client")?;

  let response = client
    .post(endpoint)
    .header(CONTENT_TYPE, "application/json")
    .header(AUTHORIZATION, format!("Bearer {}", settings.api_key))
    .json(&request)
    .send()
    .context("failed to send completion request")?;

  let status = response.status();
  let body = response.text().context("failed to read completion response")?;
  if !status.is_success() {
    return Err(anyhow!("provider returned {}: {}", status, shorten(&body, 240)));
  }

  let parsed: ChatCompletionResponse =
    serde_json::from_str(&body).context("failed to parse completion response")?;
  let content = parsed
    .choices
    .into_iter()
    .next()
    .and_then(|choice| extract_text(choice.message.content))
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .context("provider returned an empty assistant message")?;

  Ok(content)
}

fn render_skill_block(skills: &[db::SkillDetail]) -> String {
  if skills.is_empty() {
    return String::new();
  }

  let mut lines = vec![
    "Enabled custom skills:".to_string(),
    "All custom skills are low-permission only. They may shape reasoning and output style, but they must not assume elevated access, destructive authority, or unrestricted external side effects.".to_string(),
  ];

  for skill in skills {
    lines.push(format!(
      "- {} [{}]: Trigger when {}. Instructions: {}",
      skill.name,
      skill.permission_level,
      shorten(&skill.trigger_hint, 120),
      shorten(&skill.instructions, 260)
    ));
  }

  lines.join("\n")
}

fn completion_endpoint(base_url: &str) -> String {
  let trimmed = base_url.trim().trim_end_matches('/');
  if trimmed.ends_with("/chat/completions") {
    trimmed.to_string()
  } else {
    format!("{}/chat/completions", trimmed)
  }
}

fn extract_text(content: Value) -> Option<String> {
  match content {
    Value::String(text) => Some(text),
    Value::Array(items) => {
      let joined = items
        .into_iter()
        .filter_map(|item| item.get("text").and_then(Value::as_str).map(str::to_string))
        .collect::<Vec<_>>()
        .join("\n");
      if joined.trim().is_empty() {
        None
      } else {
        Some(joined)
      }
    }
    _ => None,
  }
}

fn draft_plan(prompt: &str) -> String {
  format!(
    "1. Clarify the operator objective: {}.\n2. Load session history, system prompt and model settings.\n3. Produce the next actionable answer and persist the trace.",
    shorten(prompt, 88)
  )
}

fn local_fallback_reply(
  prompt: &str,
  failure_reason: Option<&str>,
  settings: &db::AgentSettings,
) -> String {
  let provider_state = match failure_reason {
    Some(reason) => format!(
      "Remote model call failed and the runtime switched to local preview mode. Reason: {}.",
      shorten(reason, 120)
    ),
    None if settings.is_ready() => "The runtime is in local preview mode.".to_string(),
    None => "No provider is configured yet, so the runtime is using local preview mode.".to_string(),
  };

  format!(
    "Mission accepted: {}\n\nSuggested next steps:\n1. Break the request into the smallest verifiable outcome.\n2. Decide which context must survive into the next run.\n3. Convert the output into a concrete instruction or code change.\n\n{}\nOnce baseUrl, apiKey and model are configured, the next run will use the real model path.",
    shorten(prompt, 180),
    provider_state
  )
}

fn shorten(value: &str, limit: usize) -> String {
  let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
  if compact.chars().count() <= limit {
    compact
  } else {
    compact.chars().take(limit).collect::<String>() + "..."
  }
}
