use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use once_cell::sync::Lazy;
use rusqlite::{params, params_from_iter, Connection};
use serde::Serialize;

static DB_CONN: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
  pub id: i64,
  pub title: Option<String>,
  pub content: String,
  pub mood: Option<String>,
  pub tags: Vec<String>,
  pub created_at: i64,
  pub updated_at: i64,
}

fn app_data_dir() -> Option<PathBuf> {
  let app_name = env!("CARGO_PKG_NAME");
  tauri::api::path::local_data_dir()
    .or_else(tauri::api::path::data_dir)
    .map(|mut dir| {
      dir.push(app_name);
      dir
    })
}

fn db_path() -> Result<PathBuf, anyhow::Error> {
  let base_dir = app_data_dir().unwrap_or_else(|| {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
  });
  let mut dir = base_dir;
  dir.push("data");
  fs::create_dir_all(&dir)?;
  dir.push("mmgh.sqlite");
  Ok(dir)
}

fn table_has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, rusqlite::Error> {
  let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
  let mut rows = stmt.query([])?;
  while let Some(row) = rows.next()? {
    let name: String = row.get(1)?;
    if name == column {
      return Ok(true);
    }
  }
  Ok(false)
}

fn ensure_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
  let schema = include_str!("../sql/schema.sql");
  conn.execute_batch(schema)?;

  if !table_has_column(conn, "notes", "title")? {
    conn.execute("ALTER TABLE notes ADD COLUMN title TEXT", [])?;
  }
  if !table_has_column(conn, "notes", "mood")? {
    conn.execute("ALTER TABLE notes ADD COLUMN mood TEXT", [])?;
  }
  if !table_has_column(conn, "notes", "tags")? {
    conn.execute("ALTER TABLE notes ADD COLUMN tags TEXT", [])?;
  }
  if !table_has_column(conn, "notes", "updated_at")? {
    conn.execute("ALTER TABLE notes ADD COLUMN updated_at INTEGER", [])?;
  }

  conn.execute(
    "UPDATE notes SET updated_at = created_at WHERE updated_at IS NULL",
    [],
  )?;

  conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC)",
    [],
  )?;
  conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)",
    [],
  )?;

  Ok(())
}

fn with_connection<T, F>(action: F) -> Result<T, anyhow::Error>
where
  F: FnOnce(&Connection) -> Result<T, rusqlite::Error>,
{
  let mut guard = DB_CONN
    .lock()
    .map_err(|_| anyhow::anyhow!("database mutex poisoned"))?;
  if guard.is_none() {
    let path = db_path()?;
    let conn = Connection::open(path)?;
    ensure_schema(&conn)?;
    *guard = Some(conn);
  }

  let conn = guard.as_ref().expect("database connection not initialized");
  action(conn).map_err(anyhow::Error::from)
}

fn decode_tags(raw: Option<String>) -> Vec<String> {
  match raw {
    Some(value) => serde_json::from_str::<Vec<String>>(&value).unwrap_or_default(),
    None => Vec::new(),
  }
}

pub fn list_notes(query: Option<String>, limit: Option<u32>) -> Result<Vec<Note>, anyhow::Error> {
  with_connection(|conn| {
    let mut sql = String::from(
      "SELECT id, title, content, mood, tags, created_at, updated_at FROM notes",
    );
    let mut params: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(q) = query {
      let like = format!("%{}%", q);
      sql.push_str(" WHERE content LIKE ? OR title LIKE ? OR mood LIKE ? OR tags LIKE ?");
      params.push(like.clone().into());
      params.push(like.clone().into());
      params.push(like.clone().into());
      params.push(like.into());
    }

    sql.push_str(" ORDER BY created_at DESC");

    if let Some(limit) = limit {
      sql.push_str(" LIMIT ?");
      params.push((limit as i64).into());
    }

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params), |row| {
      Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        mood: row.get(3)?,
        tags: decode_tags(row.get(4)?),
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
      })
    })?;

    let mut notes = Vec::new();
    for row in rows {
      notes.push(row?);
    }
    Ok(notes)
  })
}

pub fn add_note(
  title: Option<String>,
  content: String,
  mood: Option<String>,
  tags: Vec<String>,
) -> Result<Note, anyhow::Error> {
  with_connection(|conn| {
    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map_err(|_| rusqlite::Error::InvalidQuery)?
      .as_millis() as i64;
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
      "INSERT INTO notes (title, content, mood, tags, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      params![title, content, mood, tags_json, now, now],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Note {
      id,
      title,
      content,
      mood,
      tags,
      created_at: now,
      updated_at: now,
    })
  })
}

pub fn update_note(
  id: i64,
  title: Option<String>,
  content: String,
  mood: Option<String>,
  tags: Vec<String>,
) -> Result<Note, anyhow::Error> {
  with_connection(|conn| {
    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map_err(|_| rusqlite::Error::InvalidQuery)?
      .as_millis() as i64;
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
      "UPDATE notes SET title = ?1, content = ?2, mood = ?3, tags = ?4, updated_at = ?5 WHERE id = ?6",
      params![title, content, mood, tags_json, now, id],
    )?;
    let created_at: i64 = conn.query_row(
      "SELECT created_at FROM notes WHERE id = ?1",
      params![id],
      |row| row.get(0),
    )?;
    Ok(Note {
      id,
      title,
      content,
      mood,
      tags,
      created_at,
      updated_at: now,
    })
  })
}

pub fn delete_note(id: i64) -> Result<(), anyhow::Error> {
  with_connection(|conn| {
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
    Ok(())
  })
}
