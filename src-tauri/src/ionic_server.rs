use std::io::Read;

use anyhow::Context;
use serde::Deserialize;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

mod db;

#[derive(Debug, Default, Deserialize)]
struct ListQuery {
  query: Option<String>,
  limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct NoteInput {
  title: Option<String>,
  content: String,
  mood: Option<String>,
  tags: Option<Vec<String>>,
}

fn main() -> Result<(), anyhow::Error> {
  let port = std::env::var("MYGH_IONIC_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(4781);
  let addr = format!("127.0.0.1:{}", port);
  let server = Server::http(&addr).context("failed to start ionic http server")?;

  println!("Ionic backend listening on http://{}", addr);
  println!("Endpoints: GET /notes, POST /notes, PUT /notes/{{id}}, DELETE /notes/{{id}}");

  for request in server.incoming_requests() {
    handle_request(request);
  }

  Ok(())
}

fn handle_request(mut request: Request) {
  let method = request.method().clone();
  let url = request.url().to_string();
  let (path, query) = match url.split_once('?') {
    Some((left, right)) => (left, Some(right)),
    None => (url.as_str(), None),
  };

  if method == Method::Options {
    respond_empty(&mut request, 204);
    return;
  }

  let response = match (method, path) {
    (Method::Get, "/health") => json_ok(serde_json::json!({ "ok": true })),
    (Method::Get, "/notes") => match list_notes(query) {
      Ok(body) => json_ok(body),
      Err(err) => json_error(500, err),
    },
    (Method::Post, "/notes") => match create_note(&mut request) {
      Ok(body) => json_ok(body),
      Err(err) => json_error(400, err),
    },
    (Method::Put, path) if path.starts_with("/notes/") => match update_note(&mut request, path) {
      Ok(body) => json_ok(body),
      Err(err) => json_error(400, err),
    },
    (Method::Delete, path) if path.starts_with("/notes/") => match delete_note(path) {
      Ok(body) => json_ok(body),
      Err(err) => json_error(400, err),
    },
    (Method::Get, _) => json_error(404, "not found"),
    _ => json_error(405, "method not allowed"),
  };

  let _ = respond_with(&mut request, response);
}

fn list_notes(query: Option<&str>) -> Result<serde_json::Value, String> {
  let params = match query {
    Some(value) if !value.is_empty() => serde_urlencoded::from_str::<ListQuery>(value)
      .map_err(|_| "invalid query params")?,
    _ => ListQuery::default(),
  };

  db::list_notes(params.query, params.limit)
    .map(|notes| serde_json::json!({ "notes": notes }))
    .map_err(|err| err.to_string())
}

fn create_note(request: &mut Request) -> Result<serde_json::Value, String> {
  let body = read_body(request).map_err(|err| err.to_string())?;
  let input: NoteInput =
    serde_json::from_str(&body).map_err(|_| "invalid json body")?;

  db::add_note(
    input.title,
    input.content,
    input.mood,
    input.tags.unwrap_or_default(),
  )
  .map(|note| serde_json::json!({ "note": note }))
  .map_err(|err| err.to_string())
}

fn update_note(request: &mut Request, path: &str) -> Result<serde_json::Value, String> {
  let id = parse_note_id(path)?;
  let body = read_body(request).map_err(|err| err.to_string())?;
  let input: NoteInput =
    serde_json::from_str(&body).map_err(|_| "invalid json body")?;

  db::update_note(
    id,
    input.title,
    input.content,
    input.mood,
    input.tags.unwrap_or_default(),
  )
  .map(|note| serde_json::json!({ "note": note }))
  .map_err(|err| err.to_string())
}

fn delete_note(path: &str) -> Result<serde_json::Value, String> {
  let id = parse_note_id(path)?;
  db::delete_note(id)
    .map(|_| serde_json::json!({ "ok": true }))
    .map_err(|err| err.to_string())
}

fn parse_note_id(path: &str) -> Result<i64, String> {
  let id_part = path
    .trim_start_matches("/notes/")
    .trim_matches('/');
  id_part
    .parse::<i64>()
    .map_err(|_| "invalid note id".to_string())
}

fn read_body(request: &mut Request) -> Result<String, std::io::Error> {
  let mut body = String::new();
  request.as_reader().read_to_string(&mut body)?;
  Ok(body)
}

fn json_ok(body: serde_json::Value) -> Response<std::io::Cursor<Vec<u8>>> {
  let body = serde_json::to_string(&body).unwrap_or_else(|_| "{\"ok\":false}".to_string());
  response_with_status(200, body)
}

fn json_error(status: u16, message: impl ToString) -> Response<std::io::Cursor<Vec<u8>>> {
  let body = serde_json::json!({ "error": message.to_string() });
  let body = serde_json::to_string(&body).unwrap_or_else(|_| "{\"error\":\"unknown\"}".to_string());
  response_with_status(status, body)
}

fn response_with_status(status: u16, body: String) -> Response<std::io::Cursor<Vec<u8>>> {
  let mut response = Response::from_string(body).with_status_code(StatusCode(status));
  response.add_header(content_type_header());
  add_cors_headers(&mut response);
  response
}

fn respond_empty(request: &mut Request, status: u16) {
  let mut response = Response::empty(StatusCode(status));
  add_cors_headers(&mut response);
  let _ = request.respond(response);
}

fn respond_with(
  request: &mut Request,
  response: Response<std::io::Cursor<Vec<u8>>>,
) -> Result<(), std::io::Error> {
  request.respond(response)
}

fn content_type_header() -> Header {
  Header::from_bytes("Content-Type", "application/json; charset=utf-8")
    .expect("valid content type header")
}

fn add_cors_headers<R: Read>(response: &mut Response<R>) {
  let headers = [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type, Authorization"),
  ];

  for (name, value) in headers {
    let header = Header::from_bytes(name, value).expect("valid cors header");
    response.add_header(header);
  }
}
