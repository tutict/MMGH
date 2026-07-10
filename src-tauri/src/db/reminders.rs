use super::*;

#[cfg(test)]
pub(super) fn create_reminder_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  Ok(create_reminder_detail_in(conn, title)?.id)
}

pub(super) fn create_reminder_detail_in(
  conn: &Connection,
  title: Option<String>,
) -> Result<ReminderDetail> {
  let now = now_millis();
  let reminder_title = normalize_optional_text_field(
    title.as_deref(),
    "New reminder",
    MAX_TITLE_CHARS,
    "reminder title",
  )?;
  let linked_note_id: Option<i64> = conn
    .query_row(
      "SELECT id FROM knowledge_notes ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  conn.execute(
    "INSERT INTO reminders (title, detail, due_at, severity, status, linked_note_id, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    params![
      reminder_title,
      "Capture the next action, attach a note, and set when it should surface again.",
      now + 60 * 60 * 1000,
      "medium",
      "scheduled",
      linked_note_id,
      now,
      now
    ],
  )?;

  Ok(build_reminder_detail(ReminderDetailParts {
    id: conn.last_insert_rowid(),
    title: reminder_title,
    detail: "Capture the next action, attach a note, and set when it should surface again."
      .to_string(),
    due_at: Some(now + 60 * 60 * 1000),
    severity: "medium".to_string(),
    status: "scheduled".to_string(),
    linked_note_id,
    created_at: now,
    updated_at: now,
  }))
}

#[cfg(test)]
pub(super) fn save_reminder_in(conn: &Connection, input: ReminderInput) -> Result<()> {
  save_reminder_detail_in(conn, input).map(|_| ())
}

pub(super) fn save_reminder_detail_in(
  conn: &Connection,
  input: ReminderInput,
) -> Result<ReminderDetail> {
  let title = normalize_text_field(
    &input.title,
    "New reminder",
    MAX_TITLE_CHARS,
    "reminder title",
  )?;
  let detail = normalize_free_text(&input.detail, MAX_LONG_TEXT_CHARS, "reminder detail")?;
  let severity = match input.severity.trim() {
    "low" => "low",
    "high" => "high",
    "critical" => "critical",
    _ => "medium",
  };
  let status = if input.status.trim() == "done" {
    "done"
  } else {
    "scheduled"
  };
  let linked_note_id = match input.linked_note_id.filter(|value| *value > 0) {
    Some(note_id) if note_exists_in(conn, note_id)? => Some(note_id),
    _ => None,
  };
  let updated_at = now_millis();
  let created_at = load_reminder_created_at_in(conn, input.id)?;

  let changed = conn.execute(
    "UPDATE reminders
     SET title = ?1,
         detail = ?2,
         due_at = ?3,
         severity = ?4,
         status = ?5,
         linked_note_id = ?6,
         updated_at = ?7
     WHERE id = ?8",
    params![
      &title,
      &detail,
      input.due_at,
      severity,
      status,
      linked_note_id,
      updated_at,
      input.id
    ],
  )?;

  if changed == 0 {
    return Err(anyhow!("reminder not found"));
  }

  Ok(build_reminder_detail(ReminderDetailParts {
    id: input.id,
    title,
    detail,
    due_at: input.due_at,
    severity: severity.to_string(),
    status: status.to_string(),
    linked_note_id,
    created_at,
    updated_at,
  }))
}

pub(super) fn delete_reminder_in(conn: &Connection, reminder_id: i64) -> Result<()> {
  let changed = conn.execute("DELETE FROM reminders WHERE id = ?1", params![reminder_id])?;
  if changed == 0 {
    return Err(anyhow!("reminder not found"));
  }
  Ok(())
}

pub(super) fn reminder_exists_in(conn: &Connection, reminder_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM reminders WHERE id = ?1)",
      params![reminder_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

pub(super) fn ensure_reminder_exists_in(conn: &Connection, reminder_id: i64) -> Result<()> {
  if !reminder_exists_in(conn, reminder_id)? {
    return Err(anyhow!("reminder not found"));
  }
  Ok(())
}

pub(super) fn list_reminders_in(conn: &Connection) -> Result<Vec<ReminderSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, substr(detail, 1, 512), due_at, severity, status, linked_note_id, updated_at
     FROM reminders
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    let detail: String = row.get(2)?;
    Ok(ReminderSummary {
      id: row.get(0)?,
      title: row.get(1)?,
      preview: preview_text(&detail, 120),
      due_at: row.get(3)?,
      severity: row.get(4)?,
      status: row.get(5)?,
      linked_note_id: row.get(6)?,
      updated_at: row.get(7)?,
    })
  })?;

  let mut reminders = Vec::new();
  for row in rows {
    reminders.push(row?);
  }

  Ok(reminders)
}

pub(super) fn build_reminder_detail_in(
  conn: &Connection,
  reminder_id: i64,
) -> Result<ReminderDetail> {
  conn
    .query_row(
      "SELECT id, title, detail, due_at, severity, status, linked_note_id, created_at, updated_at
       FROM reminders
       WHERE id = ?1",
      params![reminder_id],
      |row| {
        let detail: String = row.get(2)?;
        Ok(ReminderDetail {
          id: row.get(0)?,
          title: row.get(1)?,
          preview: preview_text(&detail, 120),
          detail,
          due_at: row.get(3)?,
          severity: row.get(4)?,
          status: row.get(5)?,
          linked_note_id: row.get(6)?,
          created_at: row.get(7)?,
          updated_at: row.get(8)?,
        })
      },
    )
    .optional()?
    .context("reminder not found")
}

pub(super) fn list_open_reminder_context_in(
  conn: &Connection,
  limit: usize,
) -> Result<Vec<ReminderContextItem>> {
  let mut stmt = conn.prepare(
    "SELECT r.title, r.severity, r.due_at, n.title
     FROM reminders r
     LEFT JOIN knowledge_notes n ON n.id = r.linked_note_id
     WHERE r.status != 'done'
     ORDER BY CASE WHEN r.due_at IS NULL THEN 1 ELSE 0 END ASC,
              r.due_at ASC,
              r.updated_at DESC
     LIMIT ?1",
  )?;
  let rows = stmt.query_map(params![limit as i64], |row| {
    Ok(ReminderContextItem {
      title: row.get(0)?,
      severity: row.get(1)?,
      due_at: row.get(2)?,
      linked_note_title: row.get(3)?,
    })
  })?;

  let mut reminders = Vec::new();
  for row in rows {
    reminders.push(row?);
  }

  Ok(reminders)
}

pub(super) fn empty_reminder_detail() -> ReminderDetail {
  ReminderDetail {
    id: 0,
    title: String::new(),
    detail: String::new(),
    preview: String::new(),
    due_at: None,
    severity: "medium".to_string(),
    status: "scheduled".to_string(),
    linked_note_id: None,
    created_at: 0,
    updated_at: 0,
  }
}

pub(super) struct ReminderDetailParts {
  id: i64,
  title: String,
  detail: String,
  due_at: Option<i64>,
  severity: String,
  status: String,
  linked_note_id: Option<i64>,
  created_at: i64,
  updated_at: i64,
}

pub(super) fn build_reminder_detail(parts: ReminderDetailParts) -> ReminderDetail {
  ReminderDetail {
    id: parts.id,
    title: parts.title,
    preview: preview_text(&parts.detail, 120),
    detail: parts.detail,
    due_at: parts.due_at,
    severity: parts.severity,
    status: parts.status,
    linked_note_id: parts.linked_note_id,
    created_at: parts.created_at,
    updated_at: parts.updated_at,
  }
}

pub(super) fn build_reminder_summary_from_detail(detail: &ReminderDetail) -> ReminderSummary {
  ReminderSummary {
    id: detail.id,
    title: detail.title.clone(),
    preview: detail.preview.clone(),
    due_at: detail.due_at,
    severity: detail.severity.clone(),
    status: detail.status.clone(),
    linked_note_id: detail.linked_note_id,
    updated_at: detail.updated_at,
  }
}

pub(super) fn load_reminder_created_at_in(conn: &Connection, reminder_id: i64) -> Result<i64> {
  conn
    .query_row(
      "SELECT created_at FROM reminders WHERE id = ?1",
      params![reminder_id],
      |row| row.get(0),
    )
    .optional()?
    .context("reminder not found")
}
