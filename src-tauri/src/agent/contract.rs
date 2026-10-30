use anyhow::Result;

use crate::db;

use super::text::shorten;

pub(super) const MAX_AGENT_PROMPT_CHARS: usize = 20_000;
const MAX_AGENT_REPLY_CHARS: usize = 12_000;
pub(super) const MAX_AGENT_HISTORY_MESSAGES: usize = 18;
const MAX_AGENT_HISTORY_MESSAGE_CHARS: usize = 2_000;
const MAX_SYSTEM_PROMPT_CHARS: usize = 4_000;
const MAX_CONTEXT_NOTES_TO_SCAN: usize = 12;
const MAX_CONTEXT_NOTE_SOURCE_CHARS: usize = 1_600;
const MAX_STAGED_CONTEXT_NOTES: usize = 3;
const MAX_STAGED_OPEN_REMINDERS: usize = 4;
const MAX_MOUNTED_SKILLS_IN_PROMPT: usize = 8;

#[derive(Debug, Clone)]
pub(super) struct AgentRuntimeContext {
  pub session_title: String,
  pub session_status: String,
  pub message_count: usize,
  pub mounted_skill_names: Vec<String>,
  pub relevant_notes: Vec<ContextNote>,
  pub open_reminders: Vec<ContextReminder>,
  pub capability_titles: Vec<String>,
}

#[derive(Debug, Clone)]
pub(super) struct ContextNote {
  pub title: String,
  pub excerpt: String,
  pub tags: Vec<String>,
}

#[derive(Debug, Clone)]
pub(super) struct ContextReminder {
  pub title: String,
  pub severity: String,
  pub due_label: String,
  pub linked_note_title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct AgentHistoryMessage {
  pub role: String,
  pub content: String,
}

#[derive(Debug, Clone)]
pub(super) struct AgentPromptBundle {
  pub preamble: String,
  pub history: Vec<AgentHistoryMessage>,
  pub prompt: String,
}

#[derive(Debug, Clone)]
pub(super) struct AgentRuntimeContract {
  pub prompt: String,
  pub context: AgentRuntimeContext,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct AgentContractError {
  pub reason: String,
}

impl std::fmt::Display for AgentContractError {
  fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(
      formatter,
      "runtime contract rejected provider reply: {}",
      self.reason
    )
  }
}

impl std::error::Error for AgentContractError {}

impl AgentRuntimeContract {
  pub(super) fn for_session(session_id: i64, prompt: String) -> Result<Self> {
    let normalized_prompt = super::text::normalize_agent_prompt(prompt)?;
    let context = build_runtime_context(session_id, &normalized_prompt)?;
    Ok(Self {
      prompt: normalized_prompt,
      context,
    })
  }

  pub(super) fn runtime_context_detail(&self) -> String {
    format!(
      "{} Contract enforced: input limit {} chars, reply limit {} chars, history limit {} messages, {} staged notes, {} open reminders, and low-permission mounted skills only.",
      render_runtime_context_activity(&self.context),
      MAX_AGENT_PROMPT_CHARS,
      MAX_AGENT_REPLY_CHARS,
      MAX_AGENT_HISTORY_MESSAGES,
      self.context.relevant_notes.len(),
      self.context.open_reminders.len()
    )
  }

  pub(super) fn plan(&self) -> String {
    draft_plan(&self.prompt, &self.context)
  }

  pub(super) fn compose_prompt(
    &self,
    settings: &db::AgentSettings,
    history: Vec<db::ChatMessage>,
    enabled_skills: &[db::SkillDetail],
  ) -> AgentPromptBundle {
    let skill_block = render_skill_block(enabled_skills);
    let runtime_block = render_runtime_context_block(&self.context);
    let contract_block = render_contract_boundary_block();
    let mut system_sections = Vec::new();

    if !settings.system_prompt.trim().is_empty() {
      system_sections.push(shorten(
        settings.system_prompt.trim(),
        MAX_SYSTEM_PROMPT_CHARS,
      ));
    }
    if !runtime_block.is_empty() {
      system_sections.push(runtime_block);
    }
    if !skill_block.is_empty() {
      system_sections.push(skill_block);
    }
    system_sections.push(contract_block);

    let history = history
      .into_iter()
      .filter(|item| matches!(item.role.as_str(), "user" | "assistant"))
      .take(MAX_AGENT_HISTORY_MESSAGES)
      .map(|item| AgentHistoryMessage {
        role: item.role,
        content: shorten(&item.content, MAX_AGENT_HISTORY_MESSAGE_CHARS),
      })
      .collect();

    AgentPromptBundle {
      preamble: system_sections.join("\n\n"),
      history,
      prompt: self.prompt.clone(),
    }
  }

  pub(super) fn validate_reply(&self, reply: &str) -> Result<String> {
    let trimmed = reply.trim();
    if trimmed.is_empty() {
      return Err(
        AgentContractError {
          reason: "assistant reply is empty".to_string(),
        }
        .into(),
      );
    }

    if trimmed.chars().count() > MAX_AGENT_REPLY_CHARS {
      return Err(
        AgentContractError {
          reason: format!(
            "assistant reply exceeds {} characters",
            MAX_AGENT_REPLY_CHARS
          ),
        }
        .into(),
      );
    }

    if let Some(reason) = detect_forbidden_reply_claim(trimmed) {
      return Err(AgentContractError { reason }.into());
    }

    Ok(trimmed.to_string())
  }
}

pub(super) fn model_call_failure_title(error: &anyhow::Error) -> &'static str {
  model_failure_title(error)
}

fn render_skill_block(skills: &[db::SkillDetail]) -> String {
  if skills.is_empty() {
    return String::new();
  }

  let mut lines = vec![
    "Enabled custom skills:".to_string(),
    "All custom skills are low-permission only. They may shape reasoning and output style, but they must not assume elevated access, destructive authority, or unrestricted external side effects.".to_string(),
  ];

  for skill in skills.iter().take(MAX_MOUNTED_SKILLS_IN_PROMPT) {
    lines.push(render_skill_line(skill));
  }
  if skills.len() > MAX_MOUNTED_SKILLS_IN_PROMPT {
    lines.push(format!(
      "- {} additional mounted skills were withheld by the context budget.",
      skills.len() - MAX_MOUNTED_SKILLS_IN_PROMPT
    ));
  }

  lines.join("\n")
}

pub(super) fn render_skill_line(skill: &db::SkillDetail) -> String {
  format!(
    "- {} [{}]: Trigger when {}. Instructions: {}",
    skill.name,
    skill.permission_level,
    shorten(&skill.trigger_hint, 120),
    shorten(&skill.instructions, 260)
  )
}

/// Renders a staged note the way the runtime context block presents it.
pub(super) fn render_context_note(note: &ContextNote) -> String {
  let tag_block = if note.tags.is_empty() {
    String::new()
  } else {
    format!(" [{}]", note.tags.join(", "))
  };
  format!(
    "{}{}: {}",
    shorten(&note.title, 48),
    tag_block,
    shorten(&note.excerpt, 180)
  )
}

fn render_contract_boundary_block() -> String {
  [
    "Non-negotiable Agent runtime contract:",
    "- You may read only the staged session history, relevant notes, open reminders, mounted skills, and runtime capability names.",
    "- Weather, music, gallery, settings, cache cleanup, note writes, reminder writes, and skill writes are UI surfaces unless explicitly represented in the staged context.",
    "- You may produce only an assistant reply, an execution plan, and traceable reasoning summary. You must not claim that you created, deleted, updated, scheduled, cleared, fetched, opened, or played anything.",
    "- If an action is needed, phrase it as a recommended next action for the operator to perform in the UI.",
    "- Do not invent tool access beyond the staged runtime context.",
  ]
  .join("\n")
}

fn model_failure_title(error: &anyhow::Error) -> &'static str {
  if error
    .chain()
    .any(|cause| cause.downcast_ref::<AgentContractError>().is_some())
  {
    "Provider reply rejected"
  } else {
    "Provider call failed"
  }
}

fn detect_forbidden_reply_claim(reply: &str) -> Option<String> {
  let normalized = reply.to_lowercase();
  let compact = normalized.split_whitespace().collect::<Vec<_>>().join(" ");

  let english_patterns: [(&str, &[&str]); 9] = [
    (
      "created note",
      &[
        "i created a note",
        "i created the note",
        "i have created a note",
        "i have created the note",
        "i've created a note",
        "i've created the note",
        "created the note",
        "created a note",
      ],
    ),
    (
      "deleted note",
      &[
        "i deleted a note",
        "i deleted the note",
        "i have deleted a note",
        "i have deleted the note",
        "i've deleted a note",
        "i've deleted the note",
        "deleted the note",
        "deleted a note",
      ],
    ),
    (
      "updated note",
      &[
        "i updated a note",
        "i updated the note",
        "i have updated a note",
        "i have updated the note",
        "i've updated a note",
        "i've updated the note",
        "updated the note",
        "saved to notes",
        "saved the note",
      ],
    ),
    (
      "created reminder",
      &[
        "i scheduled a reminder",
        "i scheduled the reminder",
        "i have scheduled a reminder",
        "i have scheduled the reminder",
        "i've scheduled a reminder",
        "i've scheduled the reminder",
        "created the reminder",
        "created a reminder",
        "set a reminder",
      ],
    ),
    (
      "modified settings",
      &[
        "updated settings",
        "changed settings",
        "modified settings",
        "saved settings",
      ],
    ),
    (
      "cleared cache",
      &[
        "cleared cache",
        "cleared the cache",
        "cleaned cache",
        "reset cache",
      ],
    ),
    (
      "weather access",
      &[
        "checked weather",
        "fetched weather",
        "queried weather",
        "looked up weather",
        "accessed weather",
      ],
    ),
    (
      "music access",
      &[
        "played music",
        "started playback",
        "changed track",
        "opened music",
      ],
    ),
    (
      "gallery access",
      &[
        "opened gallery",
        "updated gallery",
        "tagged the image",
        "tagged image",
      ],
    ),
  ];

  for (label, patterns) in english_patterns {
    if patterns.iter().any(|pattern| compact.contains(pattern)) {
      return Some(format!("reply claims unauthorized side effect: {label}"));
    }
  }

  let chinese_patterns: [(&str, &[&str]); 7] = [
    (
      "note write",
      &[
        "已创建笔记",
        "已经创建笔记",
        "我创建了笔记",
        "已删除笔记",
        "已经删除笔记",
        "我删除了笔记",
        "已更新笔记",
        "已经更新笔记",
        "已保存到笔记",
        "已经保存到笔记",
      ],
    ),
    (
      "reminder write",
      &[
        "已创建提醒",
        "已经创建提醒",
        "我创建了提醒",
        "已设置提醒",
        "已经设置提醒",
        "已安排提醒",
        "已经安排提醒",
      ],
    ),
    (
      "settings write",
      &[
        "已修改设置",
        "已经修改设置",
        "已更新设置",
        "已经更新设置",
        "已保存设置",
        "已经保存设置",
      ],
    ),
    (
      "cache cleanup",
      &[
        "已清理缓存",
        "已经清理缓存",
        "已清缓存",
        "已经清缓存",
        "已重置缓存",
        "已经重置缓存",
      ],
    ),
    (
      "weather access",
      &[
        "已查询天气",
        "已经查询天气",
        "已获取天气",
        "已经获取天气",
        "已打开天气",
        "已经打开天气",
      ],
    ),
    (
      "music access",
      &[
        "已播放音乐",
        "已经播放音乐",
        "已切换音乐",
        "已经切换音乐",
        "已打开音乐",
        "已经打开音乐",
      ],
    ),
    (
      "gallery access",
      &[
        "已打开图库",
        "已经打开图库",
        "已更新图库",
        "已经更新图库",
        "已标记图片",
        "已经标记图片",
      ],
    ),
  ];

  for (label, patterns) in chinese_patterns {
    if patterns.iter().any(|pattern| reply.contains(pattern)) {
      return Some(format!("reply claims unauthorized side effect: {label}"));
    }
  }

  None
}

fn build_runtime_context(session_id: i64, prompt: &str) -> Result<AgentRuntimeContext> {
  let session = db::agent_session_context(session_id)?;
  let notes = db::recent_note_context(MAX_CONTEXT_NOTES_TO_SCAN, MAX_CONTEXT_NOTE_SOURCE_CHARS)?;
  let reminders = db::open_reminder_context(MAX_STAGED_OPEN_REMINDERS)?;

  Ok(AgentRuntimeContext {
    session_title: session.title,
    session_status: session.status,
    message_count: session.message_count,
    mounted_skill_names: session.mounted_skill_names,
    relevant_notes: select_relevant_notes(prompt, &notes, MAX_STAGED_CONTEXT_NOTES),
    open_reminders: select_open_reminders(&reminders),
    capability_titles: db::capability_titles(),
  })
}

fn render_runtime_context_activity(context: &AgentRuntimeContext) -> String {
  format!(
    "Session '{}' is {} with {} messages, {} mounted skills, {} relevant notes, and {} open reminders staged for this run.",
    shorten(&context.session_title, 48),
    context.session_status,
    context.message_count,
    context.mounted_skill_names.len(),
    context.relevant_notes.len(),
    context.open_reminders.len()
  )
}

fn render_runtime_context_block(context: &AgentRuntimeContext) -> String {
  let mut lines = vec![
    "Runtime context available for this run:".to_string(),
    format!(
      "- Session: '{}' [{}], {} messages in history.",
      shorten(&context.session_title, 64),
      context.session_status,
      context.message_count
    ),
    format!(
      "- Mounted skills on this session: {}.",
      if context.mounted_skill_names.is_empty() {
        "none".to_string()
      } else {
        context.mounted_skill_names.join(", ")
      }
    ),
    format!(
      "- Runtime capabilities: {}.",
      if context.capability_titles.is_empty() {
        "none".to_string()
      } else {
        context.capability_titles.join(", ")
      }
    ),
    "- Runtime boundary: local notes, reminders, session history, and mounted skills are directly available. Weather, music, and gallery pages are UI surfaces unless their state is provided in the conversation.".to_string(),
  ];

  if context.relevant_notes.is_empty() {
    lines.push("- Relevant notes: none matched strongly enough to stage.".to_string());
  } else {
    lines.push("- Relevant notes:".to_string());
    for note in &context.relevant_notes {
      let tag_block = if note.tags.is_empty() {
        String::new()
      } else {
        format!(" [{}]", note.tags.join(", "))
      };
      lines.push(format!(
        "  - {}{}: {}",
        shorten(&note.title, 48),
        tag_block,
        shorten(&note.excerpt, 180)
      ));
    }
  }

  if context.open_reminders.is_empty() {
    lines.push("- Open reminders: none.".to_string());
  } else {
    lines.push("- Open reminders:".to_string());
    for reminder in &context.open_reminders {
      let note_suffix = reminder
        .linked_note_title
        .as_ref()
        .map(|title| format!(" | linked note: {}", shorten(title, 32)))
        .unwrap_or_default();
      lines.push(format!(
        "  - {} [{} | {}]{}",
        shorten(&reminder.title, 56),
        reminder.severity,
        reminder.due_label,
        note_suffix
      ));
    }
  }

  lines.join("\n")
}

fn select_relevant_notes(
  prompt: &str,
  notes: &[db::KnowledgeNoteContext],
  limit: usize,
) -> Vec<ContextNote> {
  let keywords = extract_keywords(prompt);
  let mut ranked = notes
    .iter()
    .map(|note| {
      let haystack = format!(
        "{} {} {}",
        note.title.to_lowercase(),
        note.body_excerpt.to_lowercase(),
        note.tags.join(" ").to_lowercase()
      );

      let mut score = 0i64;
      for keyword in &keywords {
        if haystack.contains(keyword) {
          score += 2;
        }
        if note.title.to_lowercase().contains(keyword) {
          score += 3;
        }
      }
      if keywords.is_empty() {
        score += 1;
      }

      score += freshness_bonus(note.updated_at);

      (
        score,
        note.updated_at,
        ContextNote {
          title: note.title.clone(),
          excerpt: first_non_empty_line(&note.body_excerpt).unwrap_or_else(|| note.summary.clone()),
          tags: note.tags.clone(),
        },
      )
    })
    .collect::<Vec<_>>();

  ranked.sort_by(|left, right| right.0.cmp(&left.0).then_with(|| right.1.cmp(&left.1)));

  ranked
    .into_iter()
    .filter(|(score, _, _)| *score > 0)
    .take(limit)
    .map(|(_, _, note)| note)
    .collect()
}

fn select_open_reminders(reminders: &[db::ReminderContextItem]) -> Vec<ContextReminder> {
  reminders
    .iter()
    .map(|reminder| ContextReminder {
      title: reminder.title.clone(),
      severity: reminder.severity.clone(),
      due_label: render_due_label(reminder.due_at),
      linked_note_title: reminder.linked_note_title.clone(),
    })
    .collect()
}

fn extract_keywords(input: &str) -> Vec<String> {
  let lowered = input.to_lowercase();
  let mut keywords = lowered
    .split(|ch: char| !ch.is_alphanumeric() && !is_cjk(ch))
    .filter_map(|part| {
      let value = part.trim();
      if value.chars().count() >= 2 {
        Some(value.to_string())
      } else {
        None
      }
    })
    .collect::<Vec<_>>();

  let cjk_only = lowered.chars().filter(|ch| is_cjk(*ch)).collect::<String>();
  if cjk_only.chars().count() >= 4 {
    let chars = cjk_only.chars().collect::<Vec<_>>();
    for width in [2usize, 3usize] {
      for window in chars.windows(width).take(8) {
        keywords.push(window.iter().collect());
      }
    }
  }

  keywords.sort();
  keywords.dedup();
  keywords
}

fn is_cjk(ch: char) -> bool {
  matches!(
    ch as u32,
    0x4E00..=0x9FFF | 0x3400..=0x4DBF | 0xF900..=0xFAFF
  )
}

fn freshness_bonus(updated_at: i64) -> i64 {
  let age = (current_time_millis() - updated_at).max(0);
  if age <= 24 * 60 * 60 * 1000 {
    3
  } else if age <= 7 * 24 * 60 * 60 * 1000 {
    2
  } else if age <= 30 * 24 * 60 * 60 * 1000 {
    1
  } else {
    0
  }
}

fn render_due_label(due_at: Option<i64>) -> String {
  let Some(value) = due_at else {
    return "no due time".to_string();
  };

  let delta = value - current_time_millis();
  if delta < 0 {
    "overdue".to_string()
  } else if delta <= 6 * 60 * 60 * 1000 {
    "due soon".to_string()
  } else if delta <= 24 * 60 * 60 * 1000 {
    "due today".to_string()
  } else if delta <= 3 * 24 * 60 * 60 * 1000 {
    "due this week".to_string()
  } else {
    "scheduled later".to_string()
  }
}

pub(super) fn first_non_empty_line(value: &str) -> Option<String> {
  value
    .lines()
    .map(str::trim)
    .find(|line| !line.is_empty() && !line.starts_with('#'))
    .map(str::to_string)
}

fn current_time_millis() -> i64 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as i64
}

fn draft_plan(prompt: &str, context: &AgentRuntimeContext) -> String {
  format!(
    "1. Clarify the operator objective: {}.\n2. Load runtime context: {} relevant notes, {} open reminders, and {} mounted skills.\n3. Produce the next actionable answer without inventing tool access beyond the current runtime.\n4. Persist the trace and next-step guidance.",
    shorten(prompt, 88),
    context.relevant_notes.len(),
    context.open_reminders.len(),
    context.mounted_skill_names.len()
  )
}

#[cfg(test)]
mod tests {
  use super::*;

  fn contract_fixture() -> AgentRuntimeContract {
    AgentRuntimeContract {
      prompt: "Review the release plan".to_string(),
      context: AgentRuntimeContext {
        session_title: "Release".to_string(),
        session_status: "ready".to_string(),
        message_count: 2,
        mounted_skill_names: vec!["Release Guard".to_string()],
        relevant_notes: vec![ContextNote {
          title: "Release checklist".to_string(),
          excerpt: "Verify migrations before rollout.".to_string(),
          tags: vec!["release".to_string()],
        }],
        open_reminders: vec![ContextReminder {
          title: "Follow up rollout".to_string(),
          severity: "medium".to_string(),
          due_label: "due today".to_string(),
          linked_note_title: None,
        }],
        capability_titles: vec!["Knowledge".to_string(), "Reminders".to_string()],
      },
    }
  }

  fn settings_fixture() -> db::AgentSettings {
    db::AgentSettings {
      provider_name: "OpenAI Compatible".to_string(),
      base_url: "https://example.com/v1".to_string(),
      has_api_key: true,
      api_key: "key".to_string(),
      model: "model".to_string(),
      system_prompt: "Prefer concise answers.".to_string(),
    }
  }

  fn skill_fixture(index: i64) -> db::SkillDetail {
    db::SkillDetail {
      id: index,
      name: format!("Skill {index}"),
      description: "A mounted skill.".to_string(),
      summary: "A mounted skill.".to_string(),
      instructions: "Keep actions low permission and explain assumptions.".to_string(),
      trigger_hint: "release planning".to_string(),
      enabled: true,
      permission_level: "low".to_string(),
      created_at: 0,
      updated_at: 0,
    }
  }

  #[test]
  fn validate_reply_rejects_side_effect_claims() {
    let contract = contract_fixture();
    let error = contract
      .validate_reply("I created a note and saved the rollout details.")
      .expect_err("side-effect claim should be rejected");
    assert!(error.to_string().contains("unauthorized side effect"));
  }

  #[test]
  fn validate_reply_rejects_empty_output() {
    let contract = contract_fixture();
    let error = contract
      .validate_reply("   ")
      .expect_err("empty replies should be rejected");
    assert!(error.to_string().contains("assistant reply is empty"));
  }

  #[test]
  fn validate_reply_allows_recommended_next_actions() {
    let contract = contract_fixture();
    let reply = contract
      .validate_reply("I recommend creating a note for the rollout details.")
      .expect("recommendations should stay allowed");
    assert!(reply.contains("recommend creating"));
  }

  #[test]
  fn validate_reply_rejects_over_budget_output() {
    let contract = contract_fixture();
    let error = contract
      .validate_reply(&"x".repeat(MAX_AGENT_REPLY_CHARS + 1))
      .expect_err("oversized reply should be rejected");
    assert!(error.to_string().contains("exceeds"));
  }

  #[test]
  fn compose_prompt_enforces_contract_budget() {
    let contract = contract_fixture();
    let settings = settings_fixture();
    let history = vec![
      db::ChatMessage {
        id: 1,
        role: "system".to_string(),
        content: "should be dropped".to_string(),
        created_at: 0,
      },
      db::ChatMessage {
        id: 2,
        role: "assistant".to_string(),
        content: "a".repeat(MAX_AGENT_HISTORY_MESSAGE_CHARS + 200),
        created_at: 0,
      },
    ];
    let skills = (0..(MAX_MOUNTED_SKILLS_IN_PROMPT + 2) as i64)
      .map(skill_fixture)
      .collect::<Vec<_>>();

    let bundle = contract.compose_prompt(&settings, history, &skills);

    assert!(bundle
      .preamble
      .contains("Non-negotiable Agent runtime contract"));
    assert!(bundle.preamble.contains("additional mounted skills"));
    assert!(bundle
      .history
      .iter()
      .all(|item| item.role == "user" || item.role == "assistant"));
    assert_eq!(bundle.history.len(), 1);
    assert!(bundle.history[0].content.chars().count() <= MAX_AGENT_HISTORY_MESSAGE_CHARS + 3);
    assert_eq!(bundle.prompt, contract.prompt);
  }
}
