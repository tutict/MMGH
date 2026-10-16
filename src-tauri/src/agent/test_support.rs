#![cfg(test)]

use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::thread::JoinHandle;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Result;

use crate::contracts::AgentSettingsInput;
use crate::db;

use super::contract::AgentPromptBundle;

/// Serves exactly one canned HTTP response on a loopback port and returns the
/// OpenAI-compatible base URL plus the server thread handle.
pub(super) fn spawn_stub_provider(
  status_line: &'static str,
  body: &'static str,
) -> (String, JoinHandle<()>) {
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

pub(super) fn settings_for(base_url: String, api_key: &str) -> db::AgentSettings {
  db::AgentSettings {
    provider_name: "Stub Provider".to_string(),
    base_url,
    has_api_key: !api_key.trim().is_empty(),
    api_key: api_key.to_string(),
    model: "stub-model".to_string(),
    system_prompt: String::new(),
  }
}

pub(super) fn settings_input(base_url: &str, api_key: &str) -> AgentSettingsInput {
  AgentSettingsInput {
    provider_name: "Stub Provider".to_string(),
    base_url: base_url.to_string(),
    clear_api_key: false,
    api_key: api_key.to_string(),
    model: "stub-model".to_string(),
    system_prompt: String::new(),
  }
}

pub(super) fn bundle_for(prompt: &str) -> AgentPromptBundle {
  AgentPromptBundle {
    preamble: "You are a test agent.".to_string(),
    history: Vec::new(),
    prompt: prompt.to_string(),
  }
}

/// Removes provider-related environment variables for the duration of a test so
/// the default provider settings cannot leak in from the developer machine.
pub(super) struct TestEnvGuard {
  api_key: Option<String>,
  api_base: Option<String>,
  model: Option<String>,
}

impl TestEnvGuard {
  pub(super) fn clear() -> Self {
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

impl Drop for TestEnvGuard {
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

/// A temporary file-backed workspace on the app data dir. The caller must hold
/// `crate::db::TEST_STATE_LOCK` for the whole test because the app data dir and
/// the provider caches are process-global.
pub(super) struct TestWorkspace {
  data_dir: PathBuf,
  pub(super) session_id: i64,
}

impl TestWorkspace {
  pub(super) fn create(label: &str) -> Result<Self> {
    let data_dir = std::env::current_dir()?
      .join("target")
      .join(format!("mmgh-{label}-{}", now_millis()));
    if data_dir.exists() {
      fs::remove_dir_all(&data_dir)?;
    }
    db::set_app_data_dir(data_dir.clone())?;
    let snapshot = db::bootstrap()?;
    Ok(Self {
      data_dir,
      session_id: snapshot.active_session_id,
    })
  }
}

impl Drop for TestWorkspace {
  fn drop(&mut self) {
    if self.data_dir.exists() {
      let _ = fs::remove_dir_all(&self.data_dir);
    }
  }
}

fn now_millis() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as i64)
    .unwrap_or(0)
}
