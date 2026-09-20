use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use rig::client::AgentClientExt;
use rig::completion::{Chat, Message};
use rig::providers::openai;

use crate::db;

use super::contract::{AgentHistoryMessage, AgentPromptBundle};

const PROVIDER_REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(90);

static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
  reqwest::Client::builder()
    .timeout(PROVIDER_REQUEST_TIMEOUT)
    .build()
    .expect("failed to build Rig HTTP client")
});

pub(super) struct RigRuntime;

impl RigRuntime {
  pub(super) async fn complete_reply(
    settings: &db::AgentSettings,
    bundle: AgentPromptBundle,
  ) -> Result<String> {
    let agent = build_agent(settings, &bundle.preamble)?;
    let mut history = to_rig_history(bundle.history);
    agent
      .chat(bundle.prompt, &mut history)
      .await
      .map_err(|error| anyhow!(error))
      .context("Rig agent completion failed")
  }

  pub(super) async fn complete_skill_draft(
    settings: &db::AgentSettings,
    preamble: &str,
    prompt: &str,
  ) -> Result<String> {
    let agent = build_agent(settings, preamble)?;
    let mut history = Vec::<Message>::new();
    agent
      .chat(prompt.to_string(), &mut history)
      .await
      .map_err(|error| anyhow!(error))
      .context("Rig skill generation failed")
  }
}

fn build_agent(settings: &db::AgentSettings, preamble: &str) -> Result<rig::Agent> {
  let client = openai::Client::builder()
    .api_key(settings.api_key.clone())
    .base_url(normalize_compatible_base_url(&settings.base_url))
    .http_client(HTTP_CLIENT.clone())
    .build()
    .map_err(|error| anyhow!(error))
    .context("failed to build OpenAI-compatible Rig client")?
    .completions_api();

  Ok(
    client
      .agent(settings.model.clone())
      .preamble(preamble)
      .temperature(0.4)
      .build(),
  )
}

pub(super) fn normalize_compatible_base_url(base_url: &str) -> String {
  let trimmed = base_url.trim().trim_end_matches('/');
  if let Some(prefix) = trimmed.strip_suffix("/chat/completions") {
    prefix.trim_end_matches('/').to_string()
  } else {
    trimmed.to_string()
  }
}

pub(super) fn to_rig_history(history: Vec<AgentHistoryMessage>) -> Vec<Message> {
  history
    .into_iter()
    .filter_map(|item| match item.role.as_str() {
      "user" => Some(Message::user(item.content)),
      "assistant" => Some(Message::assistant(item.content)),
      _ => None,
    })
    .collect()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn normalize_compatible_base_url_accepts_root_or_full_endpoint() {
    assert_eq!(
      normalize_compatible_base_url("https://example.com/v1/"),
      "https://example.com/v1"
    );
    assert_eq!(
      normalize_compatible_base_url("https://example.com/v1/chat/completions"),
      "https://example.com/v1"
    );
  }

  #[test]
  fn to_rig_history_keeps_user_and_assistant_turns() {
    let history = to_rig_history(vec![
      AgentHistoryMessage {
        role: "system".to_string(),
        content: "drop me".to_string(),
      },
      AgentHistoryMessage {
        role: "user".to_string(),
        content: "hello".to_string(),
      },
      AgentHistoryMessage {
        role: "assistant".to_string(),
        content: "hi".to_string(),
      },
    ]);
    assert_eq!(history.len(), 2);
  }
}
