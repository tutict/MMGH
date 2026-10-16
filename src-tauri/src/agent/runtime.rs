use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use rig::client::AgentClientExt;
use rig::completion::{Chat, Message};
use rig::providers::openai;

use crate::db;

use super::contract::{AgentHistoryMessage, AgentPromptBundle};

const PROVIDER_REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(90);

static HTTP_CLIENT: Lazy<Result<reqwest::Client, String>> = Lazy::new(|| {
  reqwest::Client::builder()
    .timeout(PROVIDER_REQUEST_TIMEOUT)
    .build()
    .map_err(|error| format!("failed to build Rig HTTP client: {error}"))
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
  let http_client = HTTP_CLIENT
    .as_ref()
    .map_err(|error| anyhow!(error.clone()))?
    .clone();

  let client = openai::Client::builder()
    .api_key(settings.api_key.clone())
    .base_url(normalize_compatible_base_url(&settings.base_url))
    .http_client(http_client)
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
  use crate::agent::test_support;

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

  #[tokio::test]
  async fn complete_reply_returns_assistant_content() {
    let body = r#"{"id":"chatcmpl-1","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":"Hello from stub"},"finish_reason":"stop"}]}"#;
    let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 200 OK", body);
    let reply = RigRuntime::complete_reply(
      &test_support::settings_for(base_url, "test-key"),
      test_support::bundle_for("hi"),
    )
    .await
    .expect("stub provider should return a reply");
    assert_eq!(reply, "Hello from stub");
    server.join().expect("stub server thread");
  }

  #[tokio::test]
  async fn complete_reply_surfaces_provider_error() {
    let body = r#"{"error":{"message":"invalid api key","type":"invalid_request_error"}}"#;
    let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 401 Unauthorized", body);
    let error = RigRuntime::complete_reply(
      &test_support::settings_for(base_url, "test-key"),
      test_support::bundle_for("hi"),
    )
    .await
    .expect_err("a 401 response should fail the completion");
    let message = format!("{error:#}");
    assert!(
      message.contains("Rig agent completion failed"),
      "unexpected error message: {message}"
    );
    server.join().expect("stub server thread");
  }

  #[tokio::test]
  async fn complete_reply_never_echoes_the_api_key_in_errors() {
    let secret = "sk-test-secret-0123456789abcdef";
    let body = r#"{"error":{"message":"invalid api key","type":"invalid_request_error"}}"#;
    let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 401 Unauthorized", body);
    let error = RigRuntime::complete_reply(
      &test_support::settings_for(base_url, secret),
      test_support::bundle_for("hi"),
    )
    .await
    .expect_err("a 401 response should fail the completion");
    let message = format!("{error:#}");
    assert!(
      !message.contains(secret),
      "the api key must not appear in a provider error: {message}"
    );
    server.join().expect("stub server thread");
  }

  #[tokio::test]
  async fn complete_skill_draft_returns_content() {
    let body = r#"{"id":"chatcmpl-2","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":"{\"name\":\"Draft\"}"},"finish_reason":"stop"}]}"#;
    let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 200 OK", body);
    let reply = RigRuntime::complete_skill_draft(
      &test_support::settings_for(base_url, "test-key"),
      "sys",
      "make a skill",
    )
    .await
    .expect("stub provider should return a draft");
    assert_eq!(reply, r#"{"name":"Draft"}"#);
    server.join().expect("stub server thread");
  }

  #[tokio::test]
  async fn complete_reply_concatenates_multi_part_content() {
    // Rig concatenates array-of-parts text without a separator, whereas the
    // removed homemade client joined parts with "\n". This test pins the Rig
    // behavior so the parity difference stays visible (review finding C2).
    let body = r#"{"id":"chatcmpl-3","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":[{"type":"text","text":"first"},{"type":"text","text":"second"}]},"finish_reason":"stop"}]}"#;
    let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 200 OK", body);
    let reply = RigRuntime::complete_reply(
      &test_support::settings_for(base_url, "test-key"),
      test_support::bundle_for("hi"),
    )
    .await
    .expect("Rig should parse multi-part content");
    assert_eq!(reply, "firstsecond");
    server.join().expect("stub server thread");
  }
}
