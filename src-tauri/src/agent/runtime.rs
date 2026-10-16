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
  use std::io::{Read, Write};
  use std::net::{TcpListener, TcpStream};

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

  /// Serves a single canned HTTP response on a loopback port and returns the
  /// OpenAI-compatible base URL plus the server thread handle.
  fn spawn_stub_provider(
    status_line: &'static str,
    body: &'static str,
  ) -> (String, std::thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind stub provider");
    let port = listener.local_addr().expect("stub provider addr").port();
    let handle = std::thread::spawn(move || {
      let (mut stream, _) = listener.accept().expect("accept stub connection");
      drain_request(&mut stream);
      let response = format!(
        "{status_line}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
      );
      let _ = stream.write_all(response.as_bytes());
      let _ = stream.flush();
    });
    (format!("http://127.0.0.1:{port}/v1"), handle)
  }

  fn drain_request(stream: &mut TcpStream) {
    let mut buffer = Vec::new();
    let mut chunk = [0u8; 1024];
    let mut header_end = None;
    while header_end.is_none() {
      match stream.read(&mut chunk) {
        Ok(0) => return,
        Ok(read) => {
          buffer.extend_from_slice(&chunk[..read]);
          header_end = buffer
            .windows(4)
            .position(|window| window == b"\r\n\r\n")
            .map(|index| index + 4);
        }
        Err(_) => return,
      }
    }

    let header_end = header_end.expect("header terminator");
    let content_length = String::from_utf8_lossy(&buffer[..header_end])
      .lines()
      .find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.trim().eq_ignore_ascii_case("content-length") {
          value.trim().parse::<usize>().ok()
        } else {
          None
        }
      })
      .unwrap_or(0);
    while buffer.len() < header_end + content_length {
      match stream.read(&mut chunk) {
        Ok(0) => break,
        Ok(read) => buffer.extend_from_slice(&chunk[..read]),
        Err(_) => break,
      }
    }
  }

  fn settings_for(base_url: String) -> db::AgentSettings {
    db::AgentSettings {
      provider_name: "Stub Provider".to_string(),
      base_url,
      has_api_key: true,
      api_key: "test-key".to_string(),
      model: "stub-model".to_string(),
      system_prompt: String::new(),
    }
  }

  fn bundle_for(prompt: &str) -> AgentPromptBundle {
    AgentPromptBundle {
      preamble: "You are a test agent.".to_string(),
      history: Vec::new(),
      prompt: prompt.to_string(),
    }
  }

  #[tokio::test]
  async fn complete_reply_returns_assistant_content() {
    let body = r#"{"id":"chatcmpl-1","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":"Hello from stub"},"finish_reason":"stop"}]}"#;
    let (base_url, server) = spawn_stub_provider("HTTP/1.1 200 OK", body);
    let reply = RigRuntime::complete_reply(&settings_for(base_url), bundle_for("hi"))
      .await
      .expect("stub provider should return a reply");
    assert_eq!(reply, "Hello from stub");
    server.join().expect("stub server thread");
  }

  #[tokio::test]
  async fn complete_reply_surfaces_provider_error() {
    let body = r#"{"error":{"message":"invalid api key","type":"invalid_request_error"}}"#;
    let (base_url, server) = spawn_stub_provider("HTTP/1.1 401 Unauthorized", body);
    let error = RigRuntime::complete_reply(&settings_for(base_url), bundle_for("hi"))
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
  async fn complete_skill_draft_returns_content() {
    let body = r#"{"id":"chatcmpl-2","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":"{\"name\":\"Draft\"}"},"finish_reason":"stop"}]}"#;
    let (base_url, server) = spawn_stub_provider("HTTP/1.1 200 OK", body);
    let reply = RigRuntime::complete_skill_draft(&settings_for(base_url), "sys", "make a skill")
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
    let (base_url, server) = spawn_stub_provider("HTTP/1.1 200 OK", body);
    let reply = RigRuntime::complete_reply(&settings_for(base_url), bundle_for("hi"))
      .await
      .expect("Rig should parse multi-part content");
    assert_eq!(reply, "firstsecond");
    server.join().expect("stub server thread");
  }
}
