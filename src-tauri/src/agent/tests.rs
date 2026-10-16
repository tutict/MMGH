use anyhow::{anyhow, Result};

use crate::db;

use super::test_support::{self, TestWorkspace};

const ASSISTANT_BODY: &str = r#"{"id":"chatcmpl-1","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":"Hello from stub"},"finish_reason":"stop"}]}"#;
const UNAUTHORIZED_BODY: &str =
  r#"{"error":{"message":"invalid api key","type":"invalid_request_error"}}"#;
const SKILL_BODY: &str = r#"{"id":"chatcmpl-2","object":"chat.completion","created":0,"model":"stub-model","choices":[{"index":0,"message":{"role":"assistant","content":"{\"name\":\"Remote Draft\",\"description\":\"Does a thing\",\"triggerHint\":\"when asked\",\"instructions\":\"do it\"}"},"finish_reason":"stop"}]}"#;

fn lock_state() -> Result<std::sync::MutexGuard<'static, ()>> {
  crate::db::TEST_STATE_LOCK
    .lock()
    .map_err(|_| anyhow!("test state mutex poisoned"))
}

#[tokio::test]
async fn run_agent_persists_remote_reply() -> Result<()> {
  let _serial = lock_state()?;
  let _env = test_support::TestEnvGuard::clear();
  let workspace = TestWorkspace::create("agent-run-remote")?;
  let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 200 OK", ASSISTANT_BODY);
  db::save_settings(
    test_support::settings_input(&base_url, "test-key"),
    Some(workspace.session_id),
  )?;

  let snapshot = super::run_agent(workspace.session_id, "hello".to_string()).await?;
  server
    .join()
    .map_err(|_| anyhow!("stub provider thread panicked"))?;

  assert_eq!(snapshot.active_session.session.id, workspace.session_id);
  let messages = db::recent_messages(workspace.session_id, 10)?;
  assert!(
    messages
      .iter()
      .any(|message| message.role == "assistant" && message.content == "Hello from stub"),
    "the remote reply should be persisted as an assistant message"
  );
  Ok(())
}

#[tokio::test]
async fn run_agent_falls_back_and_never_leaks_the_api_key() -> Result<()> {
  let _serial = lock_state()?;
  let _env = test_support::TestEnvGuard::clear();
  let workspace = TestWorkspace::create("agent-run-fallback")?;
  let secret = "sk-test-secret-0123456789abcdef";
  let (base_url, server) =
    test_support::spawn_stub_provider("HTTP/1.1 401 Unauthorized", UNAUTHORIZED_BODY);
  db::save_settings(
    test_support::settings_input(&base_url, secret),
    Some(workspace.session_id),
  )?;

  let snapshot = super::run_agent(workspace.session_id, "hello".to_string()).await?;
  server
    .join()
    .map_err(|_| anyhow!("stub provider thread panicked"))?;

  let messages = db::recent_messages(workspace.session_id, 10)?;
  let assistant = messages
    .iter()
    .rev()
    .find(|message| message.role == "assistant")
    .expect("a local fallback reply should still be persisted");
  assert!(
    assistant.content.contains("local preview mode"),
    "provider failure should persist the local fallback reply"
  );

  let serialized = serde_json::to_string(&snapshot)?;
  assert!(
    !serialized.contains(secret),
    "the api key must never be persisted into the workspace snapshot"
  );
  Ok(())
}

#[tokio::test]
async fn forge_skill_returns_remote_draft() -> Result<()> {
  let _serial = lock_state()?;
  let _env = test_support::TestEnvGuard::clear();
  let workspace = TestWorkspace::create("agent-forge-remote")?;
  let (base_url, server) = test_support::spawn_stub_provider("HTTP/1.1 200 OK", SKILL_BODY);
  db::save_settings(
    test_support::settings_input(&base_url, "test-key"),
    Some(workspace.session_id),
  )?;

  let draft = super::forge_skill(
    "make a skill".to_string(),
    Some("en-US".to_string()),
    None,
    None,
  )
  .await?;
  server
    .join()
    .map_err(|_| anyhow!("stub provider thread panicked"))?;

  assert_eq!(draft.name, "Remote Draft");
  assert_eq!(draft.trigger_hint, "when asked");
  assert!(draft.warning.is_none());
  Ok(())
}

#[tokio::test]
async fn forge_skill_falls_back_to_local_draft_on_provider_error() -> Result<()> {
  let _serial = lock_state()?;
  let _env = test_support::TestEnvGuard::clear();
  let workspace = TestWorkspace::create("agent-forge-fallback")?;
  let (base_url, server) =
    test_support::spawn_stub_provider("HTTP/1.1 401 Unauthorized", UNAUTHORIZED_BODY);
  db::save_settings(
    test_support::settings_input(&base_url, "test-key"),
    Some(workspace.session_id),
  )?;

  let draft = super::forge_skill(
    "make a skill".to_string(),
    Some("en-US".to_string()),
    None,
    None,
  )
  .await?;
  server
    .join()
    .map_err(|_| anyhow!("stub provider thread panicked"))?;

  assert!(
    draft.warning.is_some(),
    "a provider failure should surface the local-draft warning"
  );
  assert!(!draft.name.is_empty());
  Ok(())
}
