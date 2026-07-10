use super::*;

#[cfg(test)]
pub(super) fn ensure_seed_session_in(conn: &Connection) -> Result<i64> {
  let existing: Option<i64> = conn
    .query_row(
      "SELECT id FROM agent_sessions ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  match existing {
    Some(id) => Ok(id),
    None => create_session_in(conn, Some(DEFAULT_SESSION_TITLE.to_string())),
  }
}

#[cfg(test)]
pub(super) fn create_session_in(conn: &Connection, title: Option<String>) -> Result<i64> {
  Ok(create_session_detail_in(conn, title)?.session.id)
}

pub(super) fn create_session_detail_in(
  conn: &Connection,
  title: Option<String>,
) -> Result<SessionDetail> {
  let now = now_millis();
  let session_title = normalize_optional_text_field(
    title.as_deref(),
    DEFAULT_SESSION_TITLE,
    MAX_TITLE_CHARS,
    "session title",
  )?;

  conn.execute(
    "INSERT INTO agent_sessions (title, status, created_at, updated_at)
     VALUES (?1, 'idle', ?2, ?3)",
    params![session_title, now, now],
  )?;
  let session_id = conn.last_insert_rowid();

  let message = append_message_in(
    conn,
    session_id,
    "assistant",
    "Workspace ready. Configure an OpenAI-compatible endpoint to use the real Rust model path. Until then the runtime will return local preview responses.",
  )?;
  let activity = append_activity_in(
    conn,
    session_id,
    "system",
    "Workspace ready",
    "A new agent session has been created.",
    "completed",
  )?;
  let session = load_session_summary_in(conn, session_id)?;

  Ok(SessionDetail {
    session,
    messages: vec![message],
    activity: vec![activity],
    mounted_skill_ids: Vec::new(),
    mounted_skills: Vec::new(),
    recommended_skills: Vec::new(),
  })
}

pub(super) fn delete_session_in(conn: &Connection, session_id: i64) -> Result<()> {
  conn.execute(
    "DELETE FROM session_activity WHERE session_id = ?1",
    params![session_id],
  )?;
  conn.execute(
    "DELETE FROM session_messages WHERE session_id = ?1",
    params![session_id],
  )?;
  let changed = conn.execute(
    "DELETE FROM agent_sessions WHERE id = ?1",
    params![session_id],
  )?;
  if changed == 0 {
    return Err(anyhow!("session not found"));
  }
  Ok(())
}

pub(super) fn session_exists_in(conn: &Connection, session_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM agent_sessions WHERE id = ?1)",
      params![session_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

pub(super) fn ensure_session_exists_in(conn: &Connection, session_id: i64) -> Result<()> {
  if !session_exists_in(conn, session_id)? {
    return Err(anyhow!("session not found"));
  }
  Ok(())
}

pub(super) fn resolve_active_session_id_in(
  conn: &Connection,
  active_session_id: Option<i64>,
) -> Result<Option<i64>> {
  if let Some(session_id) = active_session_id {
    ensure_session_exists_in(conn, session_id)?;
    return Ok(Some(session_id));
  }
  Ok(None)
}

pub(super) fn ensure_session_title_in(
  conn: &Connection,
  session_id: i64,
  prompt: &str,
) -> Result<()> {
  let existing: Option<String> = conn
    .query_row(
      "SELECT title FROM agent_sessions WHERE id = ?1",
      params![session_id],
      |row| row.get(0),
    )
    .optional()?;

  if let Some(title) = existing {
    if is_default_session_title(&title) {
      let next_title = infer_title(prompt);
      conn.execute(
        "UPDATE agent_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![next_title, now_millis(), session_id],
      )?;
    }
  }

  Ok(())
}

pub(super) fn list_sessions_in(conn: &Connection) -> Result<Vec<SessionSummary>> {
  let mut stmt = conn.prepare(
    "SELECT s.id,
            s.title,
            s.status,
            s.updated_at,
            COALESCE(message_stats.message_count, 0) AS message_count,
            COALESCE(substr(last_message.content, 1, 256), '') AS last_message_preview,
            COALESCE(skill_stats.mounted_skill_count, 0) AS mounted_skill_count
     FROM agent_sessions s
     LEFT JOIN (
       SELECT session_id, COUNT(*) AS message_count, MAX(id) AS last_message_id
       FROM session_messages
       GROUP BY session_id
     ) AS message_stats ON message_stats.session_id = s.id
     LEFT JOIN session_messages AS last_message ON last_message.id = message_stats.last_message_id
     LEFT JOIN (
       SELECT ss.session_id, COUNT(*) AS mounted_skill_count
       FROM session_skill_mounts ss
       INNER JOIN skills s ON s.id = ss.skill_id
       WHERE s.enabled = 1
       GROUP BY ss.session_id
     ) AS skill_stats ON skill_stats.session_id = s.id
     ORDER BY s.updated_at DESC, s.id DESC",
  )?;
  let rows = stmt.query_map([], map_session_summary_row)?;

  let mut sessions = Vec::new();
  for row in rows {
    sessions.push(row?);
  }

  Ok(sessions)
}

pub(super) fn load_session_summary_in(
  conn: &Connection,
  session_id: i64,
) -> Result<SessionSummary> {
  conn
    .query_row(
      "SELECT s.id,
              s.title,
              s.status,
              s.updated_at,
              COALESCE(message_stats.message_count, 0) AS message_count,
              COALESCE(substr(last_message.content, 1, 256), '') AS last_message_preview,
              COALESCE(skill_stats.mounted_skill_count, 0) AS mounted_skill_count
       FROM agent_sessions s
       LEFT JOIN (
         SELECT session_id, COUNT(*) AS message_count, MAX(id) AS last_message_id
         FROM session_messages
         GROUP BY session_id
       ) AS message_stats ON message_stats.session_id = s.id
       LEFT JOIN session_messages AS last_message ON last_message.id = message_stats.last_message_id
       LEFT JOIN (
         SELECT ss.session_id, COUNT(*) AS mounted_skill_count
         FROM session_skill_mounts ss
         INNER JOIN skills s ON s.id = ss.skill_id
         WHERE s.enabled = 1
         GROUP BY ss.session_id
       ) AS skill_stats ON skill_stats.session_id = s.id
       WHERE s.id = ?1",
      params![session_id],
      map_session_summary_row,
    )
    .optional()?
    .context("session not found")
}

pub(super) fn map_session_summary_row(row: &Row<'_>) -> rusqlite::Result<SessionSummary> {
  let last_message_preview: String = row.get(5)?;
  Ok(SessionSummary {
    id: row.get(0)?,
    title: row.get(1)?,
    status: row.get(2)?,
    updated_at: row.get(3)?,
    message_count: row.get(4)?,
    last_message_preview: preview_text(&last_message_preview, 92),
    mounted_skill_count: row.get(6)?,
  })
}

pub(super) fn load_agent_session_context_in(
  conn: &Connection,
  session_id: i64,
) -> Result<AgentSessionContext> {
  let (title, status, message_count) = conn
    .query_row(
      "SELECT s.title,
              s.status,
              COALESCE((
                SELECT COUNT(*)
                FROM session_messages m
                WHERE m.session_id = s.id
              ), 0) AS message_count
       FROM agent_sessions s
       WHERE s.id = ?1",
      params![session_id],
      |row| {
        Ok((
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, i64>(2)?,
        ))
      },
    )
    .optional()?
    .context("session not found")?;

  let mut stmt = conn.prepare(
    "SELECT s.name
     FROM skills s
     INNER JOIN session_skill_mounts ss ON ss.skill_id = s.id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, s.id ASC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| row.get::<_, String>(0))?;

  let mut mounted_skill_names = Vec::new();
  for row in rows {
    mounted_skill_names.push(row?);
  }

  Ok(AgentSessionContext {
    title,
    status,
    message_count: message_count.max(0) as usize,
    mounted_skill_names,
  })
}

pub(super) fn build_session_detail_with_summary_in(
  conn: &Connection,
  session: SessionSummary,
  preserved_timeline: Option<&SessionDetail>,
  all_skills: &[SkillSummary],
  preserved_skill_catalog: Option<&[SkillSummary]>,
) -> Result<SessionDetail> {
  let session_id = session.id;
  let preserved_detail = preserved_timeline.filter(|detail| detail.session.id == session_id);
  let (messages, activity) = if let Some(detail) = preserved_detail {
    (detail.messages.clone(), detail.activity.clone())
  } else {
    let mut messages_stmt = conn.prepare(
      "SELECT id, role, content, created_at
         FROM session_messages
         WHERE session_id = ?1
         ORDER BY created_at ASC, id ASC",
    )?;
    let message_rows = messages_stmt.query_map(params![session_id], |row| {
      Ok(ChatMessage {
        id: row.get(0)?,
        role: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
      })
    })?;
    let mut messages = Vec::new();
    for row in message_rows {
      messages.push(row?);
    }

    let mut activity_stmt = conn.prepare(
      "SELECT id, kind, title, detail, status, created_at
         FROM session_activity
         WHERE session_id = ?1
         ORDER BY created_at DESC, id DESC
         LIMIT 24",
    )?;
    let activity_rows = activity_stmt.query_map(params![session_id], |row| {
      Ok(ActivityItem {
        id: row.get(0)?,
        kind: row.get(1)?,
        title: row.get(2)?,
        detail: row.get(3)?,
        status: row.get(4)?,
        created_at: row.get(5)?,
      })
    })?;
    let mut activity = Vec::new();
    for row in activity_rows {
      activity.push(row?);
    }

    (messages, activity)
  };
  let mounted_skill_ids = preserved_detail
    .filter(|detail| detail.session == session)
    .map(|detail| detail.mounted_skill_ids.clone())
    .unwrap_or(list_session_skill_ids_in(conn, session_id)?);
  let can_reuse_skill_views = preserved_detail
    .zip(preserved_skill_catalog)
    .map(|(detail, cached_skills)| {
      detail.session == session
        && detail.mounted_skill_ids == mounted_skill_ids
        && cached_skills == all_skills
    })
    .unwrap_or(false);

  let (mounted_skills, recommended_skills) = if can_reuse_skill_views {
    let detail = preserved_detail.context("missing preserved session detail")?;
    (
      detail.mounted_skills.clone(),
      detail.recommended_skills.clone(),
    )
  } else {
    let mounted_skills = build_mounted_skills_from_catalog(&mounted_skill_ids, all_skills);
    let recommended_skills = recommend_session_skills_from_messages(
      &session.title,
      &messages,
      &mounted_skill_ids,
      4,
      all_skills,
    );
    (mounted_skills, recommended_skills)
  };

  Ok(SessionDetail {
    session,
    messages,
    activity,
    mounted_skill_ids,
    mounted_skills,
    recommended_skills,
  })
}

pub(super) fn append_message_in(
  conn: &Connection,
  session_id: i64,
  role: &str,
  content: &str,
) -> Result<ChatMessage> {
  let now = now_millis();
  let trimmed = content.trim();
  conn.execute(
    "INSERT INTO session_messages (session_id, role, content, created_at)
     VALUES (?1, ?2, ?3, ?4)",
    params![session_id, role, trimmed, now],
  )?;
  let message = ChatMessage {
    id: conn.last_insert_rowid(),
    role: role.to_string(),
    content: trimmed.to_string(),
    created_at: now,
  };
  conn.execute(
    "UPDATE agent_sessions SET updated_at = ?1 WHERE id = ?2",
    params![now, session_id],
  )?;
  Ok(message)
}

pub(super) fn append_activity_in(
  conn: &Connection,
  session_id: i64,
  kind: &str,
  title: &str,
  detail: &str,
  status: &str,
) -> Result<ActivityItem> {
  let now = now_millis();
  conn.execute(
    "INSERT INTO session_activity (session_id, kind, title, detail, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![session_id, kind, title, detail, status, now],
  )?;
  let activity = ActivityItem {
    id: conn.last_insert_rowid(),
    kind: kind.to_string(),
    title: title.to_string(),
    detail: detail.to_string(),
    status: status.to_string(),
    created_at: now,
  };
  conn.execute(
    "UPDATE agent_sessions SET updated_at = ?1 WHERE id = ?2",
    params![now, session_id],
  )?;
  Ok(activity)
}

pub(super) fn touch_session_in(conn: &Connection, session_id: i64, status: &str) -> Result<()> {
  conn.execute(
    "UPDATE agent_sessions SET status = ?1, updated_at = ?2 WHERE id = ?3",
    params![status, now_millis(), session_id],
  )?;
  Ok(())
}
