use super::*;

#[cfg(test)]
pub(super) fn ensure_seed_note_in(conn: &Connection) -> Result<i64> {
  let existing: Option<i64> = conn
    .query_row(
      "SELECT id FROM knowledge_notes ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  match existing {
    Some(id) => Ok(id),
    None => create_note_in(conn, Some("Welcome note".to_string())),
  }
}

#[cfg(test)]
pub(super) fn create_note_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  Ok(create_note_detail_in(conn, title)?.id)
}

pub(super) fn create_note_detail_in(
  conn: &Connection,
  title: Option<String>,
) -> Result<KnowledgeNoteDetail> {
  let now = now_millis();
  let note_title = normalize_optional_text_field(
    title.as_deref(),
    "Untitled note",
    MAX_TITLE_CHARS,
    "note title",
  )?;
  let body = if note_title == "Welcome note" {
    "# Knowledge Vault\n\nUse this space for local notes, reusable prompts, product facts, and runbooks.\n\n- Keep durable context here.\n- Use short titles.\n- Tag notes so they are easy to filter later.".to_string()
  } else {
    format!("# {}\n\nStart writing here.", note_title)
  };

  conn.execute(
    "INSERT INTO knowledge_notes (icon, title, body, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)",
    params!["*", &note_title, &body, now, now],
  )?;

  Ok(build_note_detail(
    conn.last_insert_rowid(),
    "*".to_string(),
    note_title,
    body,
    Vec::new(),
    now,
    now,
  ))
}

#[cfg(test)]
pub(super) fn save_note_in(conn: &Connection, input: KnowledgeNoteInput) -> Result<()> {
  save_note_detail_in(conn, input).map(|_| ())
}

pub(super) fn save_note_detail_in(
  conn: &Connection,
  input: KnowledgeNoteInput,
) -> Result<KnowledgeNoteDetail> {
  let icon = normalize_note_icon(&input.icon);
  let title = normalize_text_field(&input.title, "Untitled note", MAX_TITLE_CHARS, "note title")?;
  let body = normalize_free_text(&input.body, MAX_NOTE_BODY_CHARS, "note body")?;
  let tags = normalize_tags(input.tags);
  let updated_at = now_millis();
  let created_at = load_note_created_at_in(conn, input.id)?;

  let changed = conn.execute(
    "UPDATE knowledge_notes
     SET icon = ?1, title = ?2, body = ?3, updated_at = ?4
     WHERE id = ?5",
    params![&icon, &title, &body, updated_at, input.id],
  )?;

  if changed == 0 {
    return Err(anyhow!("note not found"));
  }

  replace_note_tags_in(conn, input.id, &tags)?;

  Ok(build_note_detail(
    input.id, icon, title, body, tags, created_at, updated_at,
  ))
}

pub(super) fn delete_note_in(conn: &Connection, note_id: i64) -> Result<()> {
  let changed = conn.execute(
    "DELETE FROM knowledge_notes WHERE id = ?1",
    params![note_id],
  )?;
  if changed == 0 {
    return Err(anyhow!("note not found"));
  }
  Ok(())
}

pub(super) fn note_exists_in(conn: &Connection, note_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM knowledge_notes WHERE id = ?1)",
      params![note_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

pub(super) fn ensure_note_exists_in(conn: &Connection, note_id: i64) -> Result<()> {
  if !note_exists_in(conn, note_id)? {
    return Err(anyhow!("note not found"));
  }
  Ok(())
}

pub(super) fn list_notes_in(conn: &Connection) -> Result<Vec<KnowledgeNoteSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, icon, title, substr(body, 1, 512), updated_at
     FROM knowledge_notes
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    Ok(KnowledgeNoteSummary {
      id: row.get(0)?,
      icon: row.get(1)?,
      title: row.get(2)?,
      summary: preview_text(&row.get::<_, String>(3)?, 120),
      tags: Vec::new(),
      updated_at: row.get(4)?,
    })
  })?;

  let mut notes = Vec::new();
  for row in rows {
    let mut note = row?;
    note.tags = load_note_tags_in(conn, note.id)?;
    notes.push(note);
  }

  Ok(notes)
}

pub(super) fn list_note_context_in(
  conn: &Connection,
  limit: usize,
  body_char_limit: usize,
) -> Result<Vec<KnowledgeNoteContext>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, substr(body, 1, ?2), updated_at
     FROM knowledge_notes
     ORDER BY updated_at DESC, id DESC
     LIMIT ?1",
  )?;
  let rows = stmt.query_map(params![limit as i64, body_char_limit as i64], |row| {
    let body_excerpt: String = row.get(2)?;
    Ok((
      row.get::<_, i64>(0)?,
      KnowledgeNoteContext {
        title: row.get(1)?,
        summary: preview_text(&body_excerpt, 120),
        body_excerpt,
        tags: Vec::new(),
        updated_at: row.get(3)?,
      },
    ))
  })?;

  let mut notes = Vec::new();
  for row in rows {
    let (note_id, mut note) = row?;
    note.tags = load_note_tags_in(conn, note_id)?;
    notes.push(note);
  }

  Ok(notes)
}

pub(super) fn build_note_detail_in(conn: &Connection, note_id: i64) -> Result<KnowledgeNoteDetail> {
  let mut note = conn
    .query_row(
      "SELECT id, icon, title, body, created_at, updated_at
       FROM knowledge_notes
       WHERE id = ?1",
      params![note_id],
      |row| {
        let body: String = row.get(3)?;
        Ok(KnowledgeNoteDetail {
          id: row.get(0)?,
          icon: row.get(1)?,
          title: row.get(2)?,
          summary: preview_text(&body, 120),
          body,
          tags: Vec::new(),
          created_at: row.get(4)?,
          updated_at: row.get(5)?,
        })
      },
    )
    .optional()?
    .context("note not found")?;

  note.tags = load_note_tags_in(conn, note.id)?;
  Ok(note)
}

pub(super) fn decode_tags(raw: String) -> Vec<String> {
  serde_json::from_str::<Vec<String>>(&raw).unwrap_or_default()
}

pub(super) fn load_note_tags_in(conn: &Connection, note_id: i64) -> Result<Vec<String>> {
  let mut stmt = conn.prepare(
    "SELECT tag
     FROM knowledge_note_tags
     WHERE note_id = ?1
     ORDER BY position ASC, tag ASC",
  )?;
  let rows = stmt.query_map(params![note_id], |row| row.get::<_, String>(0))?;

  let mut tags = Vec::new();
  for row in rows {
    tags.push(row?);
  }
  Ok(tags)
}

pub(super) fn replace_note_tags_in(conn: &Connection, note_id: i64, tags: &[String]) -> Result<()> {
  conn.execute(
    "DELETE FROM knowledge_note_tags WHERE note_id = ?1",
    params![note_id],
  )?;
  for (position, tag) in tags.iter().enumerate() {
    conn.execute(
      "INSERT INTO knowledge_note_tags (note_id, tag, position)
       VALUES (?1, ?2, ?3)",
      params![note_id, tag, position as i64],
    )?;
  }
  Ok(())
}

pub(super) fn normalize_tags(tags: Vec<String>) -> Vec<String> {
  tags
    .into_iter()
    .map(|tag| tag.trim().to_string())
    .filter(|tag| !tag.is_empty())
    .map(|tag| tag.chars().take(MAX_TAG_CHARS).collect::<String>())
    .take(MAX_TAGS)
    .collect()
}

pub(super) fn normalize_note_icon(icon: &str) -> String {
  if icon.trim().is_empty() {
    "*".to_string()
  } else {
    icon.trim().chars().take(2).collect::<String>()
  }
}

pub(super) fn build_note_detail(
  id: i64,
  icon: String,
  title: String,
  body: String,
  tags: Vec<String>,
  created_at: i64,
  updated_at: i64,
) -> KnowledgeNoteDetail {
  KnowledgeNoteDetail {
    id,
    icon,
    title,
    summary: preview_text(&body, 120),
    body,
    tags,
    created_at,
    updated_at,
  }
}

pub(super) fn build_note_summary_from_detail(detail: &KnowledgeNoteDetail) -> KnowledgeNoteSummary {
  KnowledgeNoteSummary {
    id: detail.id,
    icon: detail.icon.clone(),
    title: detail.title.clone(),
    summary: detail.summary.clone(),
    tags: detail.tags.clone(),
    updated_at: detail.updated_at,
  }
}

pub(super) fn load_note_created_at_in(conn: &Connection, note_id: i64) -> Result<i64> {
  conn
    .query_row(
      "SELECT created_at FROM knowledge_notes WHERE id = ?1",
      params![note_id],
      |row| row.get(0),
    )
    .optional()?
    .context("note not found")
}
