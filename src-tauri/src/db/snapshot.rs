use super::*;

#[cfg(test)]
pub(super) fn build_workspace_snapshot_with_policy_in(
  conn: &Connection,
  preferred_session_id: Option<i64>,
  preferred_note_id: Option<i64>,
  preferred_reminder_id: Option<i64>,
  preferred_skill_id: Option<i64>,
  reuse_policy: SnapshotReusePolicy,
) -> Result<WorkspaceSnapshot> {
  let snapshot = build_workspace_snapshot_with_seed_snapshot_in(
    conn,
    preferred_session_id,
    preferred_note_id,
    preferred_reminder_id,
    preferred_skill_id,
    reuse_policy,
    None,
  )?;
  store_snapshot_cache(&snapshot)?;
  Ok(snapshot)
}

pub(super) fn build_workspace_snapshot_with_seed_snapshot_in(
  conn: &Connection,
  preferred_session_id: Option<i64>,
  preferred_note_id: Option<i64>,
  preferred_reminder_id: Option<i64>,
  preferred_skill_id: Option<i64>,
  reuse_policy: SnapshotReusePolicy,
  cached_snapshot_override: Option<WorkspaceSnapshot>,
) -> Result<WorkspaceSnapshot> {
  let cached_snapshot = if let Some(snapshot) = cached_snapshot_override {
    Some(snapshot)
  } else if reuse_policy.uses_cached_snapshot() {
    read_snapshot_cache()?
  } else {
    None
  };
  let mut sessions = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_session_list)
    .map(|snapshot| snapshot.sessions.clone())
    .unwrap_or(list_sessions_in(conn)?);
  let mut seeded_session_detail = None;
  if sessions.is_empty() {
    let detail = create_session_detail_in(conn, Some(DEFAULT_SESSION_TITLE.to_string()))?;
    upsert_session_summary(&mut sessions, detail.session.clone());
    seeded_session_detail = Some(detail);
  }

  let mut notes = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_note_list)
    .map(|snapshot| snapshot.notes.clone())
    .unwrap_or(list_notes_in(conn)?);
  let mut seeded_note_detail = None;
  if notes.is_empty() {
    let detail = create_note_detail_in(conn, Some("Welcome note".to_string()))?;
    upsert_note_summary(&mut notes, build_note_summary_from_detail(&detail));
    seeded_note_detail = Some(detail);
  }

  let reminders = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_reminder_list)
    .map(|snapshot| snapshot.reminders.clone())
    .unwrap_or(list_reminders_in(conn)?);
  let mut skills = cached_snapshot
    .as_ref()
    .filter(|_| reuse_policy.reuse_skill_list)
    .map(|snapshot| snapshot.skills.clone())
    .unwrap_or(list_skills_in(conn)?);
  let mut seeded_skill_detail = None;
  if skills.is_empty() {
    let detail = create_skill_detail_in(conn, None)?;
    upsert_skill_summary(&mut skills, build_skill_summary_from_detail(&detail));
    seeded_skill_detail = Some(detail);
  }

  let active_session_id = preferred_session_id
    .filter(|candidate| sessions.iter().any(|session| session.id == *candidate))
    .unwrap_or_else(|| sessions.first().map(|session| session.id).unwrap_or(0));
  let active_note_id = preferred_note_id
    .filter(|candidate| notes.iter().any(|note| note.id == *candidate))
    .unwrap_or_else(|| notes.first().map(|note| note.id).unwrap_or(0));
  let active_reminder_id = preferred_reminder_id
    .filter(|candidate| reminders.iter().any(|reminder| reminder.id == *candidate))
    .or_else(|| {
      cached_snapshot.as_ref().and_then(|snapshot| {
        let candidate = snapshot.active_reminder_id;
        if candidate > 0 && reminders.iter().any(|reminder| reminder.id == candidate) {
          Some(candidate)
        } else {
          None
        }
      })
    })
    .unwrap_or_else(|| reminders.first().map(|reminder| reminder.id).unwrap_or(0));
  let active_skill_id = preferred_skill_id
    .filter(|candidate| skills.iter().any(|skill| skill.id == *candidate))
    .unwrap_or_else(|| skills.first().map(|skill| skill.id).unwrap_or(0));

  let active_session_summary = sessions
    .iter()
    .find(|session| session.id == active_session_id)
    .cloned()
    .context("active session not found")?;

  let preserved_session_timeline = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_session_timeline && snapshot.active_session_id == active_session_id
    })
    .map(|snapshot| &snapshot.active_session);
  let preserved_skill_catalog = cached_snapshot
    .as_ref()
    .filter(|snapshot| snapshot.skills == skills)
    .map(|snapshot| snapshot.skills.as_slice());

  let active_session = if let Some(detail) =
    seeded_session_detail.filter(|detail| detail.session.id == active_session_id)
  {
    let mut detail = detail;
    detail.mounted_skills = build_mounted_skills_from_catalog(&detail.mounted_skill_ids, &skills);
    detail.recommended_skills = recommend_session_skills_from_messages(
      &detail.session.title,
      &detail.messages,
      &detail.mounted_skill_ids,
      4,
      &skills,
    );
    detail
  } else {
    build_session_detail_with_summary_in(
      conn,
      active_session_summary,
      preserved_session_timeline,
      &skills,
      preserved_skill_catalog,
    )?
  };
  let active_note_detail = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_note_detail && snapshot.active_note_id == active_note_id
    })
    .map(|snapshot| snapshot.active_note.clone())
    .or_else(|| {
      seeded_note_detail
        .clone()
        .filter(|detail| detail.id == active_note_id)
    });
  let active_note = if let Some(detail) = active_note_detail {
    detail
  } else {
    build_note_detail_in(conn, active_note_id)?
  };
  let active_reminder = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_reminder_detail && snapshot.active_reminder_id == active_reminder_id
    })
    .map(|snapshot| snapshot.active_reminder.clone())
    .or_else(|| {
      if active_reminder_id > 0 {
        build_reminder_detail_in(conn, active_reminder_id).ok()
      } else {
        None
      }
    })
    .unwrap_or_else(empty_reminder_detail);
  let active_skill_detail = cached_snapshot
    .as_ref()
    .filter(|snapshot| {
      reuse_policy.reuse_active_skill_detail && snapshot.active_skill_id == active_skill_id
    })
    .map(|snapshot| snapshot.active_skill.clone())
    .or_else(|| {
      seeded_skill_detail
        .clone()
        .filter(|detail| detail.id == active_skill_id)
    });
  let active_skill = if let Some(detail) = active_skill_detail {
    detail
  } else {
    build_skill_detail_in(conn, active_skill_id)?
  };

  let snapshot = WorkspaceSnapshot {
    settings: sanitize_settings_for_client(&load_settings_in(conn)?),
    sessions,
    active_session_id,
    active_session,
    notes,
    active_note_id,
    active_note,
    reminders,
    active_reminder_id,
    active_reminder,
    skills,
    active_skill_id,
    active_skill,
    capabilities: capability_catalog(),
  };
  Ok(snapshot)
}

pub(super) fn seed_snapshot_for_persisted_run(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session_id: i64,
  updated_session: SessionSummary,
  appended_messages: &[ChatMessage],
  appended_activity: &[ActivityItem],
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  if snapshot.active_session_id != session_id || snapshot.active_session.session.id != session_id {
    return None;
  }

  snapshot.active_session.session = updated_session.clone();
  snapshot
    .active_session
    .messages
    .extend(appended_messages.iter().cloned());

  let mut recent_activity = appended_activity.iter().rev().cloned().collect::<Vec<_>>();
  recent_activity.extend(snapshot.active_session.activity);
  recent_activity.truncate(24);
  snapshot.active_session.activity = recent_activity;
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &updated_session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );

  Some(snapshot)
}

pub(super) fn seed_snapshot_for_session_activity(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session_id: i64,
  updated_session: SessionSummary,
  appended_activity: &[ActivityItem],
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_session_summary(&mut snapshot.sessions, updated_session.clone());
  if snapshot.active_session_id != session_id || snapshot.active_session.session.id != session_id {
    return Some(snapshot);
  }

  snapshot.active_session.session = updated_session;
  let mut recent_activity = appended_activity.iter().rev().cloned().collect::<Vec<_>>();
  recent_activity.extend(snapshot.active_session.activity);
  recent_activity.truncate(24);
  snapshot.active_session.activity = recent_activity;
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_session_create(
  cached_snapshot: Option<WorkspaceSnapshot>,
  mut detail: SessionDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  detail.mounted_skills =
    build_mounted_skills_from_catalog(&detail.mounted_skill_ids, &snapshot.skills);
  detail.recommended_skills = recommend_session_skills_from_messages(
    &detail.session.title,
    &detail.messages,
    &detail.mounted_skill_ids,
    4,
    &snapshot.skills,
  );
  upsert_session_summary(&mut snapshot.sessions, detail.session.clone());
  snapshot.active_session_id = detail.session.id;
  snapshot.active_session = detail;
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_session_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  let deleted_active_session = snapshot.active_session_id == session_id;
  snapshot.sessions.retain(|session| session.id != session_id);
  if deleted_active_session {
    snapshot.active_session_id = snapshot
      .sessions
      .first()
      .map(|session| session.id)
      .unwrap_or(0);
  }
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_note_upsert(
  cached_snapshot: Option<WorkspaceSnapshot>,
  detail: KnowledgeNoteDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_note_summary(&mut snapshot.notes, build_note_summary_from_detail(&detail));
  snapshot.active_note_id = detail.id;
  snapshot.active_note = detail;
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_reminder_upsert(
  cached_snapshot: Option<WorkspaceSnapshot>,
  detail: ReminderDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_reminder_summary(
    &mut snapshot.reminders,
    build_reminder_summary_from_detail(&detail),
  );
  snapshot.active_reminder_id = detail.id;
  snapshot.active_reminder = detail;
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_skill_upsert(
  cached_snapshot: Option<WorkspaceSnapshot>,
  detail: SkillDetail,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_skill_summary(
    &mut snapshot.skills,
    build_skill_summary_from_detail(&detail),
  );
  snapshot.active_skill_id = detail.id;
  snapshot.active_skill = detail;
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &snapshot.active_session.session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_note_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  note_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  snapshot.notes.retain(|note| note.id != note_id);
  for reminder in &mut snapshot.reminders {
    if reminder.linked_note_id == Some(note_id) {
      reminder.linked_note_id = None;
    }
  }
  if snapshot.active_reminder.linked_note_id == Some(note_id) {
    snapshot.active_reminder.linked_note_id = None;
  }

  if snapshot.active_note_id == note_id {
    snapshot.active_note_id = snapshot.notes.first().map(|note| note.id).unwrap_or(0);
  }
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_reminder_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  reminder_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  snapshot
    .reminders
    .retain(|reminder| reminder.id != reminder_id);
  if snapshot.active_reminder_id == reminder_id {
    if let Some(next_reminder) = snapshot.reminders.first() {
      snapshot.active_reminder_id = next_reminder.id;
    } else {
      snapshot.active_reminder_id = 0;
      snapshot.active_reminder = empty_reminder_detail();
    }
  }
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_skill_delete(
  cached_snapshot: Option<WorkspaceSnapshot>,
  skill_id: i64,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  snapshot.skills.retain(|skill| skill.id != skill_id);
  snapshot
    .active_session
    .mounted_skill_ids
    .retain(|mounted_skill_id| *mounted_skill_id != skill_id);
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &snapshot.active_session.session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );

  if snapshot.active_skill_id == skill_id {
    snapshot.active_skill_id = snapshot.skills.first().map(|skill| skill.id).unwrap_or(0);
  }
  Some(snapshot)
}

pub(super) fn seed_snapshot_for_session_skills_save(
  cached_snapshot: Option<WorkspaceSnapshot>,
  session: SessionSummary,
  mounted_skill_ids: Vec<i64>,
) -> Option<WorkspaceSnapshot> {
  let mut snapshot = cached_snapshot?;
  upsert_session_summary(&mut snapshot.sessions, session.clone());
  if snapshot.active_session_id != session.id || snapshot.active_session.session.id != session.id {
    return Some(snapshot);
  }

  snapshot.active_session.session = session.clone();
  snapshot.active_session.mounted_skill_ids = mounted_skill_ids;
  snapshot.active_session.mounted_skills =
    build_mounted_skills_from_catalog(&snapshot.active_session.mounted_skill_ids, &snapshot.skills);
  snapshot.active_session.recommended_skills = recommend_session_skills_from_messages(
    &session.title,
    &snapshot.active_session.messages,
    &snapshot.active_session.mounted_skill_ids,
    4,
    &snapshot.skills,
  );
  Some(snapshot)
}

pub(super) fn upsert_note_summary(
  notes: &mut Vec<KnowledgeNoteSummary>,
  summary: KnowledgeNoteSummary,
) {
  notes.retain(|note| note.id != summary.id);
  notes.push(summary);
  notes.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}

pub(super) fn upsert_session_summary(sessions: &mut Vec<SessionSummary>, summary: SessionSummary) {
  sessions.retain(|session| session.id != summary.id);
  sessions.push(summary);
  sessions.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}

pub(super) fn upsert_reminder_summary(
  reminders: &mut Vec<ReminderSummary>,
  summary: ReminderSummary,
) {
  reminders.retain(|reminder| reminder.id != summary.id);
  reminders.push(summary);
  reminders.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}

pub(super) fn upsert_skill_summary(skills: &mut Vec<SkillSummary>, summary: SkillSummary) {
  skills.retain(|skill| skill.id != summary.id);
  skills.push(summary);
  skills.sort_by(|left, right| {
    right
      .updated_at
      .cmp(&left.updated_at)
      .then_with(|| right.id.cmp(&left.id))
  });
}
