use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::thread;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[path = "../contracts.rs"]
mod contracts;

#[path = "../db.rs"]
mod db;

#[derive(Debug)]
struct HttpRequest {
  method: String,
  path: String,
  body: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TitlePayload {
  title: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NotePayload {
  title: Option<String>,
  body: Option<String>,
  tags: Option<Vec<String>>,
  active_session_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReminderPayload {
  title: Option<String>,
  detail: Option<String>,
  status: Option<String>,
  severity: Option<String>,
  due_at: Option<i64>,
  active_session_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentRunPayload {
  session_id: Option<i64>,
  prompt: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Counts {
  sessions: usize,
  notes: usize,
  reminders: usize,
  skills: usize,
  active_session_id: i64,
}

fn main() -> Result<()> {
  let data_dir = env::var("MMGH_K6_DATA_DIR")
    .map(PathBuf::from)
    .unwrap_or_else(|_| env::temp_dir().join("mmgh-k6-backend"));

  if env::var("MMGH_K6_RESET").ok().as_deref() == Some("1") && data_dir.exists() {
    fs::remove_dir_all(&data_dir)
      .with_context(|| format!("failed to reset {}", data_dir.display()))?;
  }

  fs::create_dir_all(&data_dir)
    .with_context(|| format!("failed to create {}", data_dir.display()))?;
  db::set_app_data_dir(data_dir.clone())?;
  db::bootstrap().context("failed to bootstrap harness database")?;

  let bind_addr = env::var("MMGH_K6_BIND").unwrap_or_else(|_| "127.0.0.1:4781".to_string());
  let listener = TcpListener::bind(&bind_addr)
    .with_context(|| format!("failed to bind k6 backend harness at {bind_addr}"))?;

  println!("MMGH k6 backend harness listening on http://{bind_addr}");
  println!("MMGH_K6_DATA_DIR={}", data_dir.display());

  for stream in listener.incoming() {
    match stream {
      Ok(stream) => {
        thread::spawn(move || {
          if let Err(error) = handle_stream(stream) {
            eprintln!("harness request failed: {error:#}");
          }
        });
      }
      Err(error) => eprintln!("harness accept failed: {error:#}"),
    }
  }

  Ok(())
}

fn handle_stream(mut stream: TcpStream) -> Result<()> {
  stream.set_read_timeout(Some(Duration::from_secs(10)))?;
  stream.set_write_timeout(Some(Duration::from_secs(10)))?;
  let request = read_http_request(&mut stream)?;
  let started = Instant::now();
  let response = route_request(&request);
  let elapsed_ms = started.elapsed().as_secs_f64() * 1000.0;

  match response {
    Ok(body) => write_json(&mut stream, 200, elapsed_ms, body),
    Err(error) => write_json(
      &mut stream,
      500,
      elapsed_ms,
      json!({
        "ok": false,
        "error": format!("{error:#}"),
      }),
    ),
  }
}

fn route_request(request: &HttpRequest) -> Result<Value> {
  match (request.method.as_str(), request.path.as_str()) {
    ("GET", "/health") => Ok(json!({ "ok": true })),
    ("POST", "/bootstrap") => {
      let snapshot = db::bootstrap()?;
      Ok(json!({ "ok": true, "counts": counts(&snapshot), "snapshot": snapshot }))
    }
    ("POST", "/sessions") => {
      let payload: TitlePayload = read_json_body(request)?;
      let snapshot = db::create_session(payload.title)?;
      Ok(json!({ "ok": true, "counts": counts(&snapshot), "snapshot": snapshot }))
    }
    ("POST", "/notes") => {
      let payload: NotePayload = read_json_body(request)?;
      let created = db::create_note(payload.title.clone(), payload.active_session_id)?;
      let input = contracts::KnowledgeNoteInput {
        id: created.active_note_id,
        icon: "*".to_string(),
        title: payload
          .title
          .unwrap_or_else(|| format!("k6 note {}", created.active_note_id)),
        body: payload
          .body
          .unwrap_or_else(|| "k6 generated note body".repeat(12)),
        tags: payload
          .tags
          .unwrap_or_else(|| vec!["k6".to_string(), "backend".to_string()]),
      };
      let snapshot = db::save_note(input, Some(created.active_session_id))?;
      Ok(json!({ "ok": true, "counts": counts(&snapshot), "snapshot": snapshot }))
    }
    ("POST", "/reminders") => {
      let payload: ReminderPayload = read_json_body(request)?;
      let created = db::create_reminder(payload.title.clone(), payload.active_session_id)?;
      let input = contracts::ReminderInput {
        id: created.active_reminder_id,
        title: payload
          .title
          .unwrap_or_else(|| format!("k6 reminder {}", created.active_reminder_id)),
        detail: payload
          .detail
          .unwrap_or_else(|| "k6 generated reminder detail".repeat(8)),
        due_at: payload.due_at,
        severity: payload.severity.unwrap_or_else(|| "normal".to_string()),
        status: payload.status.unwrap_or_else(|| "open".to_string()),
        linked_note_id: None,
      };
      let snapshot = db::save_reminder(input, Some(created.active_session_id))?;
      Ok(json!({ "ok": true, "counts": counts(&snapshot), "snapshot": snapshot }))
    }
    ("POST", "/skills/mount") => {
      let snapshot = db::bootstrap()?;
      let skill_ids = snapshot
        .skills
        .iter()
        .filter(|skill| skill.enabled)
        .take(4)
        .map(|skill| skill.id)
        .collect::<Vec<_>>();
      let snapshot = db::save_session_skills(
        snapshot.active_session_id,
        skill_ids,
        Some(snapshot.active_session_id),
      )?;
      Ok(json!({ "ok": true, "counts": counts(&snapshot), "snapshot": snapshot }))
    }
    ("POST", "/agent-runs") => {
      let payload: AgentRunPayload = read_json_body(request)?;
      let base = db::bootstrap()?;
      let session_id = payload.session_id.unwrap_or(base.active_session_id);
      let prompt = payload
        .prompt
        .unwrap_or_else(|| "k6 local agent persistence run".to_string());
      let snapshot = db::persist_agent_run(db::AgentRunPersistence {
        session_id,
        prompt: &prompt,
        runtime_context_detail: "k6 runtime context staged",
        plan: "Persist a deterministic local response for load testing.",
        model_title: "k6 local model",
        model_detail: "No remote provider call is made by this harness.",
        model_status: "completed",
        reply: "k6 local response persisted successfully.",
      })?;
      Ok(json!({ "ok": true, "counts": counts(&snapshot), "snapshot": snapshot }))
    }
    _ => Err(anyhow!(
      "unsupported route {} {}",
      request.method,
      request.path
    )),
  }
}

fn counts(snapshot: &db::WorkspaceSnapshot) -> Counts {
  Counts {
    sessions: snapshot.sessions.len(),
    notes: snapshot.notes.len(),
    reminders: snapshot.reminders.len(),
    skills: snapshot.skills.len(),
    active_session_id: snapshot.active_session_id,
  }
}

fn read_json_body<T>(request: &HttpRequest) -> Result<T>
where
  T: for<'de> Deserialize<'de>,
{
  if request.body.is_empty() {
    return serde_json::from_str("{}").context("failed to parse empty JSON body");
  }
  serde_json::from_slice(&request.body).context("failed to parse JSON body")
}

fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest> {
  let mut data = Vec::with_capacity(8192);
  let mut buffer = [0_u8; 4096];

  loop {
    let read = stream.read(&mut buffer)?;
    if read == 0 {
      break;
    }
    data.extend_from_slice(&buffer[..read]);
    if let Some(header_end) = find_header_end(&data) {
      let headers = parse_headers(&data[..header_end])?;
      let content_length = headers
        .get("content-length")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);
      let expected = header_end + 4 + content_length;
      while data.len() < expected {
        let read = stream.read(&mut buffer)?;
        if read == 0 {
          break;
        }
        data.extend_from_slice(&buffer[..read]);
      }
      break;
    }
    if data.len() > 1_048_576 {
      return Err(anyhow!("request headers are too large"));
    }
  }

  let header_end = find_header_end(&data).context("invalid HTTP request: missing header end")?;
  let request_line_end = data[..header_end]
    .windows(2)
    .position(|pair| pair == b"\r\n")
    .context("invalid HTTP request: missing request line")?;
  let request_line = std::str::from_utf8(&data[..request_line_end])?;
  let mut request_parts = request_line.split_whitespace();
  let method = request_parts
    .next()
    .context("invalid HTTP request: missing method")?
    .to_string();
  let raw_path = request_parts
    .next()
    .context("invalid HTTP request: missing path")?;
  let path = raw_path.split('?').next().unwrap_or(raw_path).to_string();
  let headers = parse_headers(&data[..header_end])?;
  let content_length = headers
    .get("content-length")
    .and_then(|value| value.parse::<usize>().ok())
    .unwrap_or(0);
  let body_start = header_end + 4;
  let body_end = body_start.saturating_add(content_length).min(data.len());

  Ok(HttpRequest {
    method,
    path,
    body: data[body_start..body_end].to_vec(),
  })
}

fn find_header_end(data: &[u8]) -> Option<usize> {
  data.windows(4).position(|window| window == b"\r\n\r\n")
}

fn parse_headers(header_bytes: &[u8]) -> Result<HashMap<String, String>> {
  let text = std::str::from_utf8(header_bytes)?;
  let mut headers = HashMap::new();
  for line in text.lines().skip(1) {
    if let Some((name, value)) = line.split_once(':') {
      headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
    }
  }
  Ok(headers)
}

fn write_json(stream: &mut TcpStream, status: u16, elapsed_ms: f64, body: Value) -> Result<()> {
  let status_text = match status {
    200 => "OK",
    500 => "Internal Server Error",
    _ => "OK",
  };
  let body = serde_json::to_vec(&body)?;
  let headers = format!(
    "HTTP/1.1 {status} {status_text}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\nX-Backend-Duration-Ms: {:.3}\r\n\r\n",
    body.len(),
    elapsed_ms,
  );
  stream.write_all(headers.as_bytes())?;
  stream.write_all(&body)?;
  stream.flush()?;
  Ok(())
}
