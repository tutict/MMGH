use super::*;

pub(super) fn canonical_starter_skill_name(name: &str) -> Option<&'static str> {
  let normalized_name = name.trim().to_ascii_lowercase();
  if normalized_name.is_empty() {
    return None;
  }

  STARTER_SKILL_SEEDS.iter().find_map(|seed| {
    std::iter::once(seed.name)
      .chain(seed.legacy_names.iter().copied())
      .find(|candidate| candidate.trim().eq_ignore_ascii_case(&normalized_name))
      .map(|_| seed.name)
  })
}

pub(super) fn normalize_starter_skill_tombstones(
  names: impl IntoIterator<Item = String>,
) -> BTreeSet<String> {
  names
    .into_iter()
    .filter_map(|name| canonical_starter_skill_name(&name).map(str::to_string))
    .collect()
}

pub(super) fn infer_starter_skill_tombstones_in(conn: &Connection) -> Result<BTreeSet<String>> {
  let mut existing_starter_names = BTreeSet::new();
  let mut stmt = conn.prepare("SELECT name FROM skills")?;
  let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;

  for row in rows {
    if let Some(name) = canonical_starter_skill_name(&row?) {
      existing_starter_names.insert(name.to_string());
    }
  }

  Ok(
    STARTER_SKILL_SEEDS
      .iter()
      .filter(|seed| !existing_starter_names.contains(seed.name))
      .map(|seed| seed.name.to_string())
      .collect(),
  )
}

pub(super) fn load_starter_skill_catalog_version_in(conn: &Connection) -> Result<u32> {
  if let Some(value) = load_setting_value_in(conn, STARTER_SKILL_CATALOG_VERSION_KEY)? {
    return Ok(value.parse::<u32>().unwrap_or(0));
  }

  if load_setting_value_in(conn, STARTER_SKILL_SEED_MIGRATION_KEY)?.is_some() {
    return Ok(LEGACY_STARTER_SKILL_CATALOG_VERSION);
  }

  Ok(0)
}

pub(super) fn load_starter_skill_tombstones_in(conn: &Connection) -> Result<BTreeSet<String>> {
  let mut stmt = conn.prepare("SELECT name FROM starter_skill_tombstones ORDER BY name ASC")?;
  let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
  let mut stored_names = Vec::new();
  for row in rows {
    stored_names.push(row?);
  }
  if !stored_names.is_empty() {
    return Ok(normalize_starter_skill_tombstones(stored_names));
  }

  if let Some(value) = load_setting_value_in(conn, STARTER_SKILL_DELETED_TOMBSTONES_KEY)? {
    let names = serde_json::from_str::<Vec<String>>(&value).unwrap_or_default();
    let tombstones = normalize_starter_skill_tombstones(names);
    if !tombstones.is_empty() {
      store_starter_skill_tombstones_in(conn, &tombstones)?;
    }
    return Ok(tombstones);
  }

  if load_setting_value_in(conn, STARTER_SKILL_SEED_MIGRATION_KEY)?.is_some() {
    return infer_starter_skill_tombstones_in(conn);
  }

  Ok(BTreeSet::new())
}

pub(super) fn store_starter_skill_tombstones_in(
  conn: &Connection,
  tombstones: &BTreeSet<String>,
) -> Result<()> {
  conn.execute("DELETE FROM starter_skill_tombstones", [])?;
  let now = now_millis();
  for name in tombstones {
    conn.execute(
      "INSERT INTO starter_skill_tombstones (name, created_at)
       VALUES (?1, ?2)
       ON CONFLICT(name) DO UPDATE SET created_at = excluded.created_at",
      params![name, now],
    )?;
  }
  Ok(())
}

pub(super) fn append_starter_skill_tombstone_in(conn: &Connection, name: &str) -> Result<()> {
  let mut tombstones = load_starter_skill_tombstones_in(conn)?;
  if tombstones.insert(name.to_string()) {
    store_starter_skill_tombstones_in(conn, &tombstones)?;
  }
  Ok(())
}

pub(super) fn run_post_init_migrations_in(conn: &Connection) -> Result<()> {
  let migration_done: Option<String> = conn
    .query_row(
      "SELECT value FROM app_meta WHERE key = ?1",
      params![SESSION_SKILL_MIGRATION_KEY],
      |row| row.get(0),
    )
    .optional()?;

  if migration_done.is_none() {
    let mut enabled_skill_ids = Vec::new();
    let mut skills_stmt =
      conn.prepare("SELECT id FROM skills WHERE enabled = 1 ORDER BY id ASC")?;
    let skill_rows = skills_stmt.query_map([], |row| row.get::<_, i64>(0))?;
    for row in skill_rows {
      enabled_skill_ids.push(row?);
    }

    let has_session_skills: bool = conn
      .query_row(
        "SELECT EXISTS(SELECT 1 FROM session_skill_mounts LIMIT 1)",
        [],
        |row| row.get::<_, i64>(0),
      )
      .map(|value| value != 0)?;

    if !has_session_skills && !enabled_skill_ids.is_empty() {
      let mut session_ids = Vec::new();
      let mut session_stmt = conn.prepare("SELECT id FROM agent_sessions ORDER BY id ASC")?;
      let session_rows = session_stmt.query_map([], |row| row.get::<_, i64>(0))?;
      for row in session_rows {
        session_ids.push(row?);
      }

      for session_id in session_ids {
        save_session_skills_in(conn, session_id, enabled_skill_ids.clone())?;
      }
    }

    conn.execute(
      "INSERT INTO app_meta (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![SESSION_SKILL_MIGRATION_KEY, "done"],
    )?;
  }

  seed_starter_skill_catalog_in(conn)?;
  prune_disabled_session_skill_mounts_in(conn)?;

  Ok(())
}

pub(super) fn seed_starter_skill_catalog_in(conn: &Connection) -> Result<()> {
  let catalog_version = load_starter_skill_catalog_version_in(conn)?;
  let tombstones = load_starter_skill_tombstones_in(conn)?;

  if catalog_version < STARTER_SKILL_CATALOG_VERSION {
    ensure_starter_skills_in(conn, &tombstones)?;
  }

  store_starter_skill_tombstones_in(conn, &tombstones)?;
  upsert_setting_value_in(
    conn,
    STARTER_SKILL_CATALOG_VERSION_KEY,
    &STARTER_SKILL_CATALOG_VERSION.to_string(),
  )?;

  Ok(())
}

pub(super) fn prune_disabled_session_skill_mounts_in(conn: &Connection) -> Result<()> {
  let mut stmt = conn.prepare(
    "SELECT DISTINCT ss.session_id
     FROM session_skill_mounts ss
     INNER JOIN skills s ON s.id = ss.skill_id
     WHERE s.enabled = 0",
  )?;
  let rows = stmt.query_map([], |row| row.get::<_, i64>(0))?;

  let mut session_ids = Vec::new();
  for row in rows {
    session_ids.push(row?);
  }

  if session_ids.is_empty() {
    return Ok(());
  }

  conn.execute(
    "DELETE FROM session_skill_mounts
     WHERE skill_id IN (
       SELECT id FROM skills WHERE enabled = 0
     )",
    [],
  )?;

  let updated_at = now_millis();
  for session_id in session_ids {
    conn.execute(
      "UPDATE agent_sessions SET updated_at = ?1 WHERE id = ?2",
      params![updated_at, session_id],
    )?;
  }

  Ok(())
}

pub(super) fn ensure_starter_skills_in(
  conn: &Connection,
  tombstones: &BTreeSet<String>,
) -> Result<()> {
  for seed in STARTER_SKILL_SEEDS {
    if tombstones.contains(seed.name) {
      continue;
    }
    if find_skill_id_by_names(conn, seed).is_some() {
      continue;
    }
    insert_starter_skill_in(conn, seed)?;
  }
  Ok(())
}

pub(super) fn find_skill_id_by_names(conn: &Connection, seed: &StarterSkillSeed) -> Option<i64> {
  std::iter::once(seed.name)
    .chain(seed.legacy_names.iter().copied())
    .find_map(|name| {
      conn
        .query_row(
          "SELECT id FROM skills WHERE name = ?1 ORDER BY id ASC LIMIT 1",
          params![name],
          |row| row.get::<_, i64>(0),
        )
        .optional()
        .ok()
        .flatten()
    })
}

pub(super) fn insert_starter_skill_in(conn: &Connection, seed: &StarterSkillSeed) -> Result<i64> {
  let now = now_millis();
  conn.execute(
    "INSERT INTO skills (name, description, instructions, trigger_hint, enabled, permission_level, origin, catalog_key, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, 1, 'low', 'starter', ?1, ?5, ?6)",
    params![
      seed.name,
      seed.description,
      seed.instructions,
      seed.trigger_hint,
      now,
      now
    ],
  )?;

  Ok(conn.last_insert_rowid())
}

#[cfg(test)]
pub(super) fn ensure_seed_skill_in(conn: &Connection) -> Result<i64> {
  let existing: Option<i64> = conn
    .query_row(
      "SELECT id FROM skills ORDER BY updated_at DESC LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()?;

  match existing {
    Some(id) => Ok(id),
    None => create_skill_in(conn, None),
  }
}

#[cfg(test)]
pub(super) fn create_skill_in(conn: &Connection, name: Option<String>) -> Result<i64> {
  Ok(create_skill_detail_in(conn, name)?.id)
}

pub(super) fn create_skill_detail_in(
  conn: &Connection,
  name: Option<String>,
) -> Result<SkillDetail> {
  let now = now_millis();
  let skill_name =
    normalize_optional_text_field(name.as_deref(), "New skill", MAX_TITLE_CHARS, "skill name")?;

  let (description, instructions, trigger_hint) = if skill_name == "Local note recall" {
    (
      "Guide the assistant to search and reuse local knowledge notes before answering."
        .to_string(),
      "Before answering, inspect the operator's local notes and prefer stable facts from the Knowledge Vault. If a note is relevant, mention that the answer should align with it. Keep the skill low-permission: no destructive actions, no external side effects, and no elevated access."
        .to_string(),
      "When the operator asks to use notes, prior context, documentation, or local knowledge.".to_string(),
    )
  } else {
    (
      "Describe what this custom skill should bias the agent toward.".to_string(),
      "Write the reusable instruction set for this skill. All custom skills run in low-permission mode only."
        .to_string(),
      "Describe when the agent should apply this skill.".to_string(),
    )
  };

  conn.execute(
    "INSERT INTO skills (name, description, instructions, trigger_hint, enabled, permission_level, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, 1, 'low', ?5, ?6)",
    params![&skill_name, &description, &instructions, &trigger_hint, now, now],
  )?;

  Ok(build_skill_detail(SkillDetailParts {
    id: conn.last_insert_rowid(),
    name: skill_name,
    description,
    instructions,
    trigger_hint,
    enabled: true,
    permission_level: "low".to_string(),
    created_at: now,
    updated_at: now,
  }))
}

pub(super) fn skill_exists_in(conn: &Connection, skill_id: i64) -> Result<bool> {
  conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM skills WHERE id = ?1)",
      params![skill_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)
    .map_err(Into::into)
}

pub(super) fn ensure_skill_exists_in(conn: &Connection, skill_id: i64) -> Result<()> {
  if !skill_exists_in(conn, skill_id)? {
    return Err(anyhow!("skill not found"));
  }
  Ok(())
}

pub(super) fn get_skill_name_in(conn: &Connection, skill_id: i64) -> Result<Option<String>> {
  conn
    .query_row(
      "SELECT name FROM skills WHERE id = ?1",
      params![skill_id],
      |row| row.get(0),
    )
    .optional()
    .map_err(Into::into)
}

#[cfg(test)]
pub(super) fn create_skill_for_active_session_in(
  conn: &Connection,
  name: Option<String>,
  active_session_id: Option<i64>,
) -> Result<i64> {
  Ok(create_skill_detail_for_active_session_in(conn, name, active_session_id)?.id)
}

pub(super) fn create_skill_detail_for_active_session_in(
  conn: &Connection,
  name: Option<String>,
  active_session_id: Option<i64>,
) -> Result<SkillDetail> {
  if let Some(session_id) = active_session_id {
    ensure_session_exists_in(conn, session_id)?;
  }

  let skill = create_skill_detail_in(conn, name)?;
  if let Some(session_id) = active_session_id {
    let mut skill_ids = list_session_skill_ids_in(conn, session_id)?;
    skill_ids.push(skill.id);
    save_session_skills_in(conn, session_id, skill_ids)?;
  }
  Ok(skill)
}

pub(super) fn delete_skill_in(conn: &Connection, skill_id: i64) -> Result<()> {
  let deleted_skill_name = get_skill_name_in(conn, skill_id)?.context("skill not found")?;
  let mut stmt = conn.prepare(
    "SELECT DISTINCT session_id
     FROM session_skill_mounts
     WHERE skill_id = ?1",
  )?;
  let rows = stmt.query_map(params![skill_id], |row| row.get::<_, i64>(0))?;
  let mut session_ids = Vec::new();
  for row in rows {
    session_ids.push(row?);
  }

  let changed = conn.execute("DELETE FROM skills WHERE id = ?1", params![skill_id])?;
  if changed == 0 {
    return Err(anyhow!("skill not found"));
  }

  if let Some(starter_name) = canonical_starter_skill_name(&deleted_skill_name) {
    append_starter_skill_tombstone_in(conn, starter_name)?;
  }

  if !session_ids.is_empty() {
    let updated_at = now_millis();
    for session_id in session_ids {
      conn.execute(
        "UPDATE agent_sessions SET updated_at = ?1 WHERE id = ?2",
        params![updated_at, session_id],
      )?;
    }
  }

  Ok(())
}

#[cfg(test)]
pub(super) fn save_skill_in(conn: &Connection, input: SkillInput) -> Result<()> {
  save_skill_detail_in(conn, input).map(|_| ())
}

pub(super) fn save_skill_detail_in(conn: &Connection, input: SkillInput) -> Result<SkillDetail> {
  let name = normalize_text_field(&input.name, "New skill", MAX_TITLE_CHARS, "skill name")?;
  let description = normalize_free_text(
    &input.description,
    MAX_SHORT_TEXT_CHARS,
    "skill description",
  )?;
  let instructions = normalize_free_text(
    &input.instructions,
    MAX_SKILL_INSTRUCTIONS_CHARS,
    "skill instructions",
  )?;
  let trigger_hint = normalize_free_text(
    &input.trigger_hint,
    MAX_SHORT_TEXT_CHARS,
    "skill trigger hint",
  )?;
  let updated_at = now_millis();
  let created_at = load_skill_created_at_in(conn, input.id)?;

  let changed = conn.execute(
    "UPDATE skills
     SET name = ?1,
         description = ?2,
         instructions = ?3,
         trigger_hint = ?4,
         enabled = ?5,
         permission_level = 'low',
         updated_at = ?6
     WHERE id = ?7",
    params![
      &name,
      &description,
      &instructions,
      &trigger_hint,
      if input.enabled { 1 } else { 0 },
      updated_at,
      input.id
    ],
  )?;

  if changed == 0 {
    return Err(anyhow!("skill not found"));
  }

  if !input.enabled {
    let mut stmt = conn.prepare(
      "SELECT DISTINCT session_id
       FROM session_skill_mounts
       WHERE skill_id = ?1",
    )?;
    let rows = stmt.query_map(params![input.id], |row| row.get::<_, i64>(0))?;
    let mut session_ids = Vec::new();
    for row in rows {
      session_ids.push(row?);
    }

    conn.execute(
      "DELETE FROM session_skill_mounts WHERE skill_id = ?1",
      params![input.id],
    )?;

    for session_id in session_ids {
      conn.execute(
        "UPDATE agent_sessions SET updated_at = ?1 WHERE id = ?2",
        params![updated_at, session_id],
      )?;
    }
  }

  Ok(build_skill_detail(SkillDetailParts {
    id: input.id,
    name,
    description,
    instructions,
    trigger_hint,
    enabled: input.enabled,
    permission_level: "low".to_string(),
    created_at,
    updated_at,
  }))
}

pub(super) fn save_session_skills_in(
  conn: &Connection,
  session_id: i64,
  skill_ids: Vec<i64>,
) -> Result<Vec<i64>> {
  let session_exists = conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM agent_sessions WHERE id = ?1)",
      params![session_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|value| value != 0)?;
  if !session_exists {
    return Err(anyhow!("session not found"));
  }

  let mut unique_ids = Vec::new();
  for skill_id in skill_ids.into_iter().filter(|value| *value > 0) {
    if !unique_ids.contains(&skill_id) {
      unique_ids.push(skill_id);
    }
  }

  let mut next_skill_ids = Vec::new();
  for skill_id in unique_ids {
    let exists = conn
      .query_row(
        "SELECT EXISTS(SELECT 1 FROM skills WHERE id = ?1 AND enabled = 1)",
        params![skill_id],
        |row| row.get::<_, i64>(0),
      )
      .map(|value| value != 0)?;

    if exists {
      next_skill_ids.push(skill_id);
    }
  }

  let current_skill_ids = list_session_skill_ids_in(conn, session_id)?;
  if current_skill_ids == next_skill_ids {
    return Ok(next_skill_ids);
  }

  conn.execute(
    "DELETE FROM session_skill_mounts WHERE session_id = ?1",
    params![session_id],
  )?;

  let base_timestamp = now_millis();

  for (index, skill_id) in next_skill_ids.iter().copied().enumerate() {
    conn.execute(
      "INSERT OR IGNORE INTO session_skill_mounts (session_id, skill_id, created_at)
       VALUES (?1, ?2, ?3)",
      params![session_id, skill_id, base_timestamp + index as i64],
    )?;
  }

  conn.execute(
    "UPDATE agent_sessions SET updated_at = ?1 WHERE id = ?2",
    params![base_timestamp + next_skill_ids.len() as i64, session_id],
  )?;

  Ok(next_skill_ids)
}

pub(super) fn list_skills_in(conn: &Connection) -> Result<Vec<SkillSummary>> {
  let mut stmt = conn.prepare(
    "SELECT id, name, substr(description, 1, 512), trigger_hint, enabled, permission_level, updated_at
     FROM skills
     ORDER BY updated_at DESC, id DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    let description: String = row.get(2)?;
    Ok(SkillSummary {
      id: row.get(0)?,
      name: row.get(1)?,
      summary: preview_text(&description, 120),
      trigger_hint: row.get(3)?,
      recommendation_reason: None,
      enabled: row.get::<_, i64>(4)? != 0,
      permission_level: row.get(5)?,
      updated_at: row.get(6)?,
    })
  })?;

  let mut skills = Vec::new();
  for row in rows {
    skills.push(row?);
  }

  Ok(skills)
}

pub(super) fn list_session_enabled_skills_in(
  conn: &Connection,
  session_id: i64,
) -> Result<Vec<SkillDetail>> {
  let mut stmt = conn.prepare(
    "SELECT s.id, s.name, s.description, s.instructions, s.trigger_hint, s.enabled, s.permission_level, s.created_at, s.updated_at
     FROM skills s
     INNER JOIN session_skill_mounts ss ON ss.skill_id = s.id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, s.id ASC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| {
    let description: String = row.get(2)?;
    Ok(SkillDetail {
      id: row.get(0)?,
      name: row.get(1)?,
      description: description.clone(),
      summary: preview_text(&description, 120),
      instructions: row.get(3)?,
      trigger_hint: row.get(4)?,
      enabled: row.get::<_, i64>(5)? != 0,
      permission_level: row.get(6)?,
      created_at: row.get(7)?,
      updated_at: row.get(8)?,
    })
  })?;

  let mut skills = Vec::new();
  for row in rows {
    skills.push(row?);
  }

  Ok(skills)
}

pub(super) fn list_session_skill_ids_in(conn: &Connection, session_id: i64) -> Result<Vec<i64>> {
  let mut stmt = conn.prepare(
    "SELECT ss.skill_id
     FROM session_skill_mounts ss
     INNER JOIN skills s ON s.id = ss.skill_id
     WHERE ss.session_id = ?1
       AND s.enabled = 1
     ORDER BY ss.created_at ASC, ss.skill_id ASC",
  )?;
  let rows = stmt.query_map(params![session_id], |row| row.get::<_, i64>(0))?;

  let mut skill_ids = Vec::new();
  for row in rows {
    skill_ids.push(row?);
  }

  Ok(skill_ids)
}

pub(super) fn build_mounted_skills_from_catalog(
  mounted_skill_ids: &[i64],
  all_skills: &[SkillSummary],
) -> Vec<SkillSummary> {
  mounted_skill_ids
    .iter()
    .filter_map(|skill_id| all_skills.iter().find(|skill| skill.id == *skill_id))
    .cloned()
    .collect()
}

pub(super) fn recommend_session_skills_from_messages(
  session_title: &str,
  messages: &[ChatMessage],
  mounted_skill_ids: &[i64],
  limit: usize,
  all_skills: &[SkillSummary],
) -> Vec<SkillSummary> {
  let mut message_fragments = messages
    .iter()
    .rev()
    .take(10)
    .map(|message| message.content.as_str())
    .collect::<Vec<_>>();
  message_fragments.reverse();

  let session_text = format!("{} {}", session_title, message_fragments.join(" "));
  let session_haystack = session_text.to_lowercase();
  let keywords = extract_recommendation_keywords(&session_haystack);
  let mut ranked = all_skills
    .iter()
    .filter(|skill| skill.enabled && !mounted_skill_ids.contains(&skill.id))
    .cloned()
    .map(|mut skill| {
      let (score, reason) = score_skill_recommendation_stable(&skill, &session_haystack, &keywords);
      skill.recommendation_reason = reason;
      (score, skill)
    })
    .filter(|(score, _)| *score > 0)
    .collect::<Vec<_>>();

  ranked.sort_by(|left, right| {
    right
      .0
      .cmp(&left.0)
      .then_with(|| right.1.enabled.cmp(&left.1.enabled))
      .then_with(|| right.1.updated_at.cmp(&left.1.updated_at))
  });

  ranked
    .into_iter()
    .take(limit)
    .map(|(_, skill)| skill)
    .collect()
}

pub(super) fn extract_recommendation_keywords(text: &str) -> Vec<String> {
  let mut keywords = text
    .split(|ch: char| !ch.is_alphanumeric() && !is_cjk_character(ch))
    .map(str::trim)
    .filter(|part| part.chars().count() >= 2)
    .map(str::to_string)
    .collect::<Vec<_>>();

  keywords.sort();
  keywords.dedup();
  keywords
}

pub(super) fn is_cjk_character(ch: char) -> bool {
  matches!(
    ch as u32,
    0x4E00..=0x9FFF | 0x3400..=0x4DBF | 0xF900..=0xFAFF
  )
}

pub(super) fn score_skill_recommendation_stable(
  skill: &SkillSummary,
  session_haystack: &str,
  keywords: &[String],
) -> (i64, Option<String>) {
  let searchable = format!(
    "{} {} {}",
    skill.name.to_lowercase(),
    skill.summary.to_lowercase(),
    skill.trigger_hint.to_lowercase()
  );

  let mut score = if skill.enabled { 2 } else { 0 };
  let mut matched_terms = Vec::new();

  for keyword in keywords {
    if searchable.contains(keyword) {
      score += 2;
      matched_terms.push(keyword.clone());
    }
    if skill.name.to_lowercase().contains(keyword) {
      score += 3;
      matched_terms.push(keyword.clone());
    }
  }

  score +=
    score_skill_recommendation_from_intent_stable(skill, session_haystack, &mut matched_terms);
  matched_terms.sort();
  matched_terms.dedup();

  (
    score,
    build_skill_recommendation_reason_stable(session_haystack, &matched_terms),
  )
}

pub(super) fn score_skill_recommendation_from_intent_stable(
  skill: &SkillSummary,
  session_haystack: &str,
  matched_terms: &mut Vec<String>,
) -> i64 {
  let skill_name = skill.name.to_lowercase();
  let mut capture_match = |patterns: &[&str]| {
    let found = patterns
      .iter()
      .filter(|pattern| session_haystack.contains(**pattern))
      .map(|pattern| pattern.to_string())
      .collect::<Vec<_>>();
    if !found.is_empty() {
      matched_terms.extend(found);
      true
    } else {
      false
    }
  };

  if skill_name.contains("note recall")
    || skill_name.contains("local note recall")
    || skill_name.contains("笔记召回")
  {
    return if capture_match(&[
      "note",
      "notes",
      "knowledge",
      "context",
      "文档",
      "笔记",
      "知识",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("knowledge librarian") || skill_name.contains("知识整理员") {
    return if capture_match(&[
      "summary",
      "summarize",
      "整理",
      "归档",
      "note",
      "沉淀",
      "知识库",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("reminder radar") || skill_name.contains("提醒雷达") {
    return if capture_match(&[
      "todo",
      "deadline",
      "follow-up",
      "follow up",
      "remind",
      "待办",
      "截止",
      "提醒",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("weather brief") || skill_name.contains("天气简报") {
    return if capture_match(&[
      "weather",
      "forecast",
      "temperature",
      "rain",
      "travel",
      "天气",
      "降雨",
      "温度",
      "出行",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("music companion") || skill_name.contains("音乐陪听") {
    return if capture_match(&[
      "music", "playlist", "song", "track", "mood", "音乐", "歌单", "曲目", "氛围",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("gallery curator") || skill_name.contains("画廊策展") {
    return if capture_match(&[
      "gallery", "album", "photo", "image", "caption", "图库", "相册", "照片", "图片",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("settings steward") || skill_name.contains("设置管家") {
    return if capture_match(&[
      "setting", "provider", "api key", "cache", "配置", "设置", "缓存", "网关",
    ]) {
      8
    } else {
      0
    };
  }

  if skill_name.contains("release guard") || skill_name.contains("发布守卫") {
    return if capture_match(&[
      "deploy",
      "migration",
      "auth",
      "billing",
      "delete",
      "发布",
      "迁移",
      "鉴权",
      "删除",
    ]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("ui polish") || skill_name.contains("界面打磨") {
    return if capture_match(&[
      "ui", "layout", "css", "frontend", "design", "界面", "布局", "前端", "样式",
    ]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("research mode") || skill_name.contains("研究模式") {
    return if capture_match(&[
      "research", "source", "docs", "verify", "citation", "文档", "校验", "出处", "来源",
    ]) {
      7
    } else {
      0
    };
  }

  if skill_name.contains("task router") || skill_name.contains("任务路由") {
    return if capture_match(&[
      "plan",
      "steps",
      "multi-step",
      "complex",
      "规划",
      "步骤",
      "复杂",
      "拆解",
    ]) {
      6
    } else {
      0
    };
  }

  0
}

pub(super) fn build_skill_recommendation_reason_stable(
  session_haystack: &str,
  matched_terms: &[String],
) -> Option<String> {
  if matched_terms.is_empty() {
    return None;
  }

  let reason_terms = matched_terms
    .iter()
    .take(3)
    .map(|term| term.trim())
    .filter(|term| !term.is_empty())
    .collect::<Vec<_>>();

  if reason_terms.is_empty() {
    return None;
  }

  let is_zh = session_haystack.chars().any(is_cjk_character);
  Some(if is_zh {
    format!("匹配到当前会话里的关键词：{}。", reason_terms.join(" / "))
  } else {
    format!("Matched session topics: {}.", reason_terms.join(" / "))
  })
}

pub(super) fn build_skill_detail_in(conn: &Connection, skill_id: i64) -> Result<SkillDetail> {
  let skill = conn
    .query_row(
      "SELECT id, name, description, instructions, trigger_hint, enabled, permission_level, created_at, updated_at
       FROM skills
       WHERE id = ?1",
      params![skill_id],
      |row| {
        let description: String = row.get(2)?;
        Ok(SkillDetail {
          id: row.get(0)?,
          name: row.get(1)?,
          description: description.clone(),
          summary: preview_text(&description, 120),
          instructions: row.get(3)?,
          trigger_hint: row.get(4)?,
          enabled: row.get::<_, i64>(5)? != 0,
          permission_level: row.get(6)?,
          created_at: row.get(7)?,
          updated_at: row.get(8)?,
        })
      },
    )
    .optional()?
    .context("skill not found")?;

  Ok(skill)
}

pub(super) struct SkillDetailParts {
  id: i64,
  name: String,
  description: String,
  instructions: String,
  trigger_hint: String,
  enabled: bool,
  permission_level: String,
  created_at: i64,
  updated_at: i64,
}

pub(super) fn build_skill_detail(parts: SkillDetailParts) -> SkillDetail {
  SkillDetail {
    id: parts.id,
    name: parts.name,
    description: parts.description.clone(),
    summary: preview_text(&parts.description, 120),
    instructions: parts.instructions,
    trigger_hint: parts.trigger_hint,
    enabled: parts.enabled,
    permission_level: parts.permission_level,
    created_at: parts.created_at,
    updated_at: parts.updated_at,
  }
}

pub(super) fn build_skill_summary_from_detail(detail: &SkillDetail) -> SkillSummary {
  SkillSummary {
    id: detail.id,
    name: detail.name.clone(),
    summary: detail.summary.clone(),
    trigger_hint: detail.trigger_hint.clone(),
    recommendation_reason: None,
    enabled: detail.enabled,
    permission_level: detail.permission_level.clone(),
    updated_at: detail.updated_at,
  }
}

pub(super) fn load_skill_created_at_in(conn: &Connection, skill_id: i64) -> Result<i64> {
  conn
    .query_row(
      "SELECT created_at FROM skills WHERE id = ?1",
      params![skill_id],
      |row| row.get(0),
    )
    .optional()?
    .context("skill not found")
}
