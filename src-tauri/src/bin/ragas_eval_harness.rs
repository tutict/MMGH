//! Offline capability harness for the MMGH agent runtime.
//!
//! It drives the real prompt-assembly path over a small evaluation dataset and
//! writes a Ragas-shaped dataset that `eval/ragas/evaluate.py` scores. The
//! harness never reads the system keyring: the provider configuration comes
//! from an explicit `db::AgentSettings` value, so an evaluation run cannot
//! touch the operator's stored credentials.
//!
//! Usage:
//!   ragas_eval_harness --dataset <path> [--out <path>] [--provider stub|live]
//!                      [--data-dir <dir>]

use std::collections::VecDeque;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use serde_json::json;

#[allow(dead_code)]
#[path = "../contracts.rs"]
mod contracts;

#[allow(dead_code)]
#[path = "../db.rs"]
mod db;

// The harness reuses the production agent module, whose skill-forging half is
// not part of an evaluation run.
#[allow(dead_code)]
#[path = "../agent/mod.rs"]
mod agent;

const DEFAULT_SYSTEM_PROMPT: &str = "You are a desktop agent. Clarify the goal, propose an executable plan, and state the next action.";

const DEFAULT_STUB_REPLY: &str = "I read the staged runtime context. The next recommended action is to confirm the staged notes and reminders before acting on this request.";

#[derive(Debug, Deserialize)]
struct HarnessDataset {
  #[serde(default)]
  version: u32,
  #[serde(default)]
  provider_system_prompt: Option<String>,
  #[serde(default)]
  cases: Vec<HarnessCase>,
}

#[derive(Debug, Deserialize)]
struct HarnessCase {
  id: String,
  #[serde(default)]
  suite: String,
  #[serde(default)]
  mode: String,
  #[serde(default)]
  session_title: Option<String>,
  prompt: String,
  #[serde(default)]
  reference_answer: Option<String>,
  #[serde(default)]
  expected_context_titles: Vec<String>,
  #[serde(default)]
  expected_reminder_titles: Vec<String>,
  #[serde(default)]
  notes: Vec<HarnessNote>,
  #[serde(default)]
  reminders: Vec<HarnessReminder>,
  #[serde(default)]
  skills: Vec<HarnessSkill>,
  #[serde(default)]
  stub_reply: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HarnessNote {
  title: String,
  #[serde(default)]
  body: String,
  #[serde(default)]
  tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct HarnessReminder {
  title: String,
  #[serde(default)]
  detail: String,
  #[serde(default)]
  due_in_minutes: Option<i64>,
  #[serde(default)]
  severity: String,
}

#[derive(Debug, Deserialize)]
struct HarnessSkill {
  name: String,
  #[serde(default)]
  description: String,
  #[serde(default)]
  instructions: String,
  #[serde(default)]
  trigger_hint: String,
}

#[derive(Debug)]
enum ProviderMode {
  Stub,
  Live,
}

impl ProviderMode {
  fn parse(value: &str) -> Result<Self> {
    match value {
      "stub" => Ok(Self::Stub),
      "live" => Ok(Self::Live),
      other => Err(anyhow!(
        "unknown provider mode '{other}'; expected 'stub' or 'live'"
      )),
    }
  }

  fn label(&self) -> &'static str {
    match self {
      Self::Stub => "stub",
      Self::Live => "live",
    }
  }
}

fn main() -> Result<()> {
  let args = collect_args()?;
  let dataset_path = args
    .get("--dataset")
    .ok_or_else(|| anyhow!("--dataset <path> is required"))?;
  let out_path = args.get("--out").cloned();
  let provider_mode =
    ProviderMode::parse(args.get("--provider").map(String::as_str).unwrap_or("stub"))?;
  let data_root = args
    .get("--data-dir")
    .map(PathBuf::from)
    .unwrap_or_else(|| std::env::temp_dir().join("mmgh-ragas-eval"));

  let dataset: HarnessDataset =
    serde_json::from_str(&fs::read_to_string(dataset_path).context("failed to read dataset")?)
      .context("failed to parse dataset")?;
  if dataset.cases.is_empty() {
    return Err(anyhow!("dataset contains no cases"));
  }

  let selected = dataset
    .cases
    .iter()
    .filter(|case| case_runs_in(case, &provider_mode))
    .collect::<Vec<_>>();
  if selected.is_empty() {
    return Err(anyhow!(
      "dataset contains no cases for the '{}' provider mode",
      provider_mode.label()
    ));
  }

  let system_prompt = dataset
    .provider_system_prompt
    .clone()
    .unwrap_or_else(|| DEFAULT_SYSTEM_PROMPT.to_string());

  let stub = match provider_mode {
    ProviderMode::Stub => Some(StubProvider::start(selected.iter().map(|case| {
      case
        .stub_reply
        .clone()
        .unwrap_or_else(|| DEFAULT_STUB_REPLY.to_string())
    }))?),
    ProviderMode::Live => None,
  };

  let settings = match provider_mode {
    ProviderMode::Stub => db::AgentSettings {
      provider_name: "Evaluation Stub".to_string(),
      base_url: stub
        .as_ref()
        .map(|stub| stub.base_url.clone())
        .unwrap_or_default(),
      has_api_key: true,
      api_key: "evaluation-stub-key".to_string(),
      model: "evaluation-stub-model".to_string(),
      system_prompt: system_prompt.clone(),
    },
    ProviderMode::Live => db::AgentSettings {
      provider_name: "Evaluation Provider".to_string(),
      base_url: required_env("MMGH_EVAL_BASE_URL")?,
      has_api_key: true,
      api_key: required_env("MMGH_EVAL_API_KEY")?,
      model: required_env("MMGH_EVAL_MODEL")?,
      system_prompt: system_prompt.clone(),
    },
  };

  let mut samples = Vec::new();
  for (index, case) in selected.iter().enumerate() {
    eprintln!("[{}] preparing case {}", index + 1, case.id);
    let case_dir = data_root.join(format!("case-{}", case.id));
    let _ = fs::remove_dir_all(&case_dir);
    fs::create_dir_all(&case_dir)
      .with_context(|| format!("failed to create {}", case_dir.display()))?;
    db::set_app_data_dir(case_dir)?;

    let session_id = prepare_session(case)?;
    prepare_notes(case, session_id)?;
    prepare_reminders(case, session_id)?;
    prepare_skills(case, session_id)?;

    let (_snapshot, evidence) = tauri::async_runtime::block_on(agent::run_agent_for_evaluation(
      session_id,
      case.prompt.clone(),
      settings.clone(),
    ))
    .with_context(|| format!("case '{}' failed", case.id))?;

    let mut retrieved_contexts = evidence
      .contexts
      .iter()
      .map(|context| context.text.clone())
      .collect::<Vec<_>>();
    let mut context_titles = evidence
      .contexts
      .iter()
      .map(|context| context.title.clone())
      .collect::<Vec<_>>();
    let mut context_kinds = evidence
      .contexts
      .iter()
      .map(|_| "note".to_string())
      .collect::<Vec<_>>();
    for skill_context in &evidence.skill_contexts {
      retrieved_contexts.push(skill_context.clone());
      context_titles.push(skill_title_of(skill_context));
      context_kinds.push("skill".to_string());
    }

    let reference_contexts = case
      .expected_context_titles
      .iter()
      .map(|title| {
        let note = case
          .notes
          .iter()
          .find(|note| &note.title == title)
          .ok_or_else(|| {
            anyhow!(
              "case '{}' expects context '{}' but no such note is defined",
              case.id,
              title
            )
          })?;
        Ok(agent::render_reference_context(
          &note.title,
          &note.body,
          &note.tags,
        ))
      })
      .collect::<Result<Vec<_>>>()?;

    samples.push(json!({
      "id": case.id,
      "suite": if case.suite.is_empty() { "retrieval" } else { case.suite.as_str() },
      "mode": if case.mode.is_empty() { "any" } else { case.mode.as_str() },
      "user_input": evidence.prompt,
      "retrieved_contexts": retrieved_contexts,
      "reference_contexts": reference_contexts,
      "context_titles": context_titles,
      "context_kinds": context_kinds,
      "expected_context_titles": case.expected_context_titles,
      "expected_reminder_titles": case.expected_reminder_titles,
      "response": evidence.reply,
      "reference": case.reference_answer.clone().unwrap_or_default(),
      "model_status": evidence.model_status,
      "model_title": evidence.model_title,
      "mounted_skill_names": evidence.mounted_skill_names,
      "open_reminder_titles": evidence.open_reminder_titles,
    }));
  }

  let report = json!({
    "version": dataset.version,
    "provider_mode": provider_mode.label(),
    "model": settings.model,
    "system_prompt": system_prompt,
    "sample_count": samples.len(),
    "samples": samples,
  });

  let serialized = serde_json::to_string_pretty(&report)?;
  match out_path {
    Some(path) => {
      let path = PathBuf::from(path);
      fs::write(&path, format!("{serialized}\n"))
        .with_context(|| format!("failed to write {}", path.display()))?;
      eprintln!(
        "wrote {} samples to {}",
        report["sample_count"],
        path.display()
      );
    }
    None => println!("{serialized}"),
  }

  Ok(())
}

fn case_runs_in(case: &HarnessCase, provider_mode: &ProviderMode) -> bool {
  match case.mode.as_str() {
    "" | "any" => true,
    "stub" => matches!(provider_mode, ProviderMode::Stub),
    "live" => matches!(provider_mode, ProviderMode::Live),
    _ => false,
  }
}

fn prepare_session(case: &HarnessCase) -> Result<i64> {
  let snapshot = db::bootstrap()?;
  let session_id = snapshot.active_session_id;
  if let Some(title) = case.session_title.as_ref() {
    let created = db::create_session(Some(title.clone()))?;
    let created_id = created
      .sessions
      .iter()
      .find(|session| session.title == *title)
      .map(|session| session.id)
      .unwrap_or(session_id);
    db::open_session(created_id)?;
    return Ok(created_id);
  }
  Ok(session_id)
}

fn prepare_notes(case: &HarnessCase, session_id: i64) -> Result<()> {
  for note in &case.notes {
    let created = db::create_note(Some(note.title.clone()), Some(session_id))?;
    let input = contracts::KnowledgeNoteInput {
      id: created.active_note_id,
      icon: "*".to_string(),
      title: note.title.clone(),
      body: note.body.clone(),
      tags: note.tags.clone(),
    };
    db::save_note(input, Some(session_id))?;
  }
  Ok(())
}

fn prepare_reminders(case: &HarnessCase, session_id: i64) -> Result<()> {
  for reminder in &case.reminders {
    let created = db::create_reminder(Some(reminder.title.clone()), Some(session_id))?;
    let due_at = reminder
      .due_in_minutes
      .map(|minutes| now_millis() + minutes * 60 * 1000);
    let input = contracts::ReminderInput {
      id: created.active_reminder_id,
      title: reminder.title.clone(),
      detail: reminder.detail.clone(),
      due_at,
      severity: if reminder.severity.is_empty() {
        "normal".to_string()
      } else {
        reminder.severity.clone()
      },
      status: "open".to_string(),
      linked_note_id: None,
    };
    db::save_reminder(input, Some(session_id))?;
  }
  Ok(())
}

fn prepare_skills(case: &HarnessCase, session_id: i64) -> Result<Vec<i64>> {
  let mut skill_ids = Vec::new();
  for skill in &case.skills {
    let created = db::create_skill(Some(skill.name.clone()), Some(session_id))?;
    let input = contracts::SkillInput {
      id: created.active_skill_id,
      name: skill.name.clone(),
      description: skill.description.clone(),
      instructions: skill.instructions.clone(),
      trigger_hint: skill.trigger_hint.clone(),
      enabled: true,
    };
    db::save_skill(input, Some(session_id))?;
    skill_ids.push(created.active_skill_id);
  }
  if !skill_ids.is_empty() {
    db::save_session_skills(session_id, skill_ids.clone(), Some(session_id))?;
  }
  Ok(skill_ids)
}

fn required_env(name: &str) -> Result<String> {
  let value = std::env::var(name)
    .ok()
    .filter(|value| !value.trim().is_empty())
    .with_context(|| format!("{name} must be set for the live provider mode"))?;
  Ok(value)
}

/// Reads the skill name back out of a rendered skill line so the evaluation
/// report can tell a staged skill apart from a staged note.
fn skill_title_of(skill_context: &str) -> String {
  skill_context
    .trim_start_matches("- ")
    .split(" [")
    .next()
    .unwrap_or(skill_context)
    .to_string()
}

fn now_millis() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as i64)
    .unwrap_or(0)
}

fn collect_args() -> Result<std::collections::HashMap<String, String>> {
  let mut args = std::collections::HashMap::new();
  let mut iterator = std::env::args().skip(1);
  while let Some(flag) = iterator.next() {
    if !flag.starts_with("--") {
      return Err(anyhow!("unexpected argument '{flag}'"));
    }
    let value = iterator
      .next()
      .ok_or_else(|| anyhow!("flag '{flag}' needs a value"))?;
    args.insert(flag, value);
  }
  Ok(args)
}

/// A loopback OpenAI-compatible endpoint that answers one canned reply per
/// evaluation case, in order.
struct StubProvider {
  base_url: String,
}

impl StubProvider {
  fn start(replies: impl Iterator<Item = String>) -> Result<Self> {
    let listener = TcpListener::bind("127.0.0.1:0").context("failed to bind stub provider")?;
    let port = listener.local_addr()?.port();
    let queue = Arc::new(Mutex::new(replies.collect::<VecDeque<String>>()));

    thread::spawn(move || {
      for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let reply = {
          let mut guard = match queue.lock() {
            Ok(guard) => guard,
            Err(_) => return,
          };
          guard.pop_front()
        };
        let Some(reply) = reply else { continue };
        if let Err(error) = serve_stub_request(&mut stream, &reply) {
          eprintln!("stub provider request failed: {error:#}");
        }
      }
    });

    Ok(Self {
      base_url: format!("http://127.0.0.1:{port}/v1"),
    })
  }
}

fn serve_stub_request(stream: &mut TcpStream, reply: &str) -> Result<()> {
  drain_request(stream)?;
  let body = json!({
    "id": "chatcmpl-eval",
    "object": "chat.completion",
    "created": 0,
    "model": "evaluation-stub-model",
    "choices": [{
      "index": 0,
      "message": { "role": "assistant", "content": reply },
      "finish_reason": "stop",
    }],
  })
  .to_string();
  let response = format!(
    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
    body.len()
  );
  stream.write_all(response.as_bytes())?;
  stream.flush()?;
  Ok(())
}

fn drain_request(stream: &mut TcpStream) -> Result<()> {
  let mut buffer = Vec::new();
  let mut chunk = [0_u8; 1024];
  let mut header_end = None;
  while header_end.is_none() {
    match stream.read(&mut chunk) {
      Ok(0) => return Ok(()),
      Ok(read) => {
        buffer.extend_from_slice(&chunk[..read]);
        header_end = buffer
          .windows(4)
          .position(|window| window == b"\r\n\r\n")
          .map(|index| index + 4);
      }
      Err(error) => return Err(error.into()),
    }
  }

  let header_end = header_end.unwrap_or_default();
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
  Ok(())
}
