use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
  Client::builder()
    .timeout(std::time::Duration::from_secs(90))
    .build()
    .expect("failed to build shared HTTP client")
});

pub(super) struct ProviderConfig<'a> {
  pub(super) base_url: &'a str,
  pub(super) api_key: &'a str,
  pub(super) model: &'a str,
}

#[derive(Debug, Serialize)]
pub(super) struct CompletionMessage {
  pub(super) role: String,
  pub(super) content: String,
}

#[derive(Debug, Clone, Copy)]
pub(super) enum CompletionPurpose {
  AgentReply,
  SkillDraft,
}

impl CompletionPurpose {
  fn send_context(self) -> &'static str {
    match self {
      Self::AgentReply => "failed to send completion request",
      Self::SkillDraft => "failed to send skill generation request",
    }
  }

  fn read_context(self) -> &'static str {
    match self {
      Self::AgentReply => "failed to read completion response",
      Self::SkillDraft => "failed to read skill generation response",
    }
  }

  fn parse_context(self) -> &'static str {
    match self {
      Self::AgentReply => "failed to parse completion response",
      Self::SkillDraft => "failed to parse skill generation response",
    }
  }

  fn status_suffix(self) -> &'static str {
    match self {
      Self::AgentReply => "",
      Self::SkillDraft => " while generating skill",
    }
  }
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest<'a> {
  model: &'a str,
  messages: Vec<CompletionMessage>,
  temperature: f32,
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

pub(super) async fn complete(
  config: ProviderConfig<'_>,
  messages: Vec<CompletionMessage>,
  temperature: f32,
  purpose: CompletionPurpose,
) -> Result<String> {
  let request = ChatCompletionRequest {
    model: config.model,
    messages,
    temperature,
  };
  let response = HTTP_CLIENT
    .post(completion_endpoint(config.base_url))
    .header(CONTENT_TYPE, "application/json")
    .header(AUTHORIZATION, format!("Bearer {}", config.api_key))
    .json(&request)
    .send()
    .await
    .context(purpose.send_context())?;

  let status = response.status();
  let body = response.text().await.context(purpose.read_context())?;
  if !status.is_success() {
    return Err(anyhow!(
      "provider returned {}{}: {}",
      status,
      purpose.status_suffix(),
      shorten_error_body(&body, 240)
    ));
  }

  let parsed: ChatCompletionResponse =
    serde_json::from_str(&body).context(purpose.parse_context())?;
  Ok(
    parsed
      .choices
      .into_iter()
      .next()
      .and_then(|choice| extract_text(choice.message.content))
      .unwrap_or_default(),
  )
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

fn shorten_error_body(value: &str, limit: usize) -> String {
  let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
  if compact.chars().count() <= limit {
    compact
  } else {
    compact.chars().take(limit).collect::<String>() + "..."
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn completion_endpoint_accepts_root_or_full_endpoint() {
    assert_eq!(
      completion_endpoint("https://example.com/v1/"),
      "https://example.com/v1/chat/completions"
    );
    assert_eq!(
      completion_endpoint("https://example.com/v1/chat/completions"),
      "https://example.com/v1/chat/completions"
    );
  }

  #[test]
  fn extract_text_supports_string_and_content_parts() {
    assert_eq!(
      extract_text(Value::String("plain".to_string())),
      Some("plain".to_string())
    );
    assert_eq!(
      extract_text(json!([
        { "type": "text", "text": "first" },
        { "type": "text", "text": "second" }
      ])),
      Some("first\nsecond".to_string())
    );
  }

  #[test]
  fn extract_text_rejects_empty_or_unknown_content() {
    assert_eq!(extract_text(json!([])), None);
    assert_eq!(extract_text(json!({ "text": "unsupported" })), None);
  }
}
