use anyhow::{anyhow, Context, Result};
use reqwest::blocking::Client;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::cmd;
use crate::db;

#[derive(Debug, Clone)]
struct AgentRuntimeContext {
  session_title: String,
  session_status: String,
  message_count: usize,
  mounted_skill_names: Vec<String>,
  relevant_notes: Vec<ContextNote>,
  open_reminders: Vec<ContextReminder>,
  capability_titles: Vec<String>,
}

#[derive(Debug, Clone)]
struct ContextNote {
  title: String,
  excerpt: String,
  tags: Vec<String>,
}

#[derive(Debug, Clone)]
struct ContextReminder {
  title: String,
  severity: String,
  due_label: String,
  linked_note_title: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedSkillDraft {
  name: String,
  description: String,
  trigger_hint: String,
  instructions: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  warning: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedSkillDraftPayload {
  name: Option<String>,
  description: Option<String>,
  trigger_hint: Option<String>,
  instructions: Option<String>,
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
  model: String,
  messages: Vec<CompletionMessage>,
  temperature: f32,
}

#[derive(Debug, Serialize)]
struct CompletionMessage {
  role: String,
  content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
  choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
  message: ChatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponseMessage {
  content: Value,
}

pub fn forge_skill(
  prompt: String,
  lang: Option<String>,
  existing_skill: Option<cmd::SkillInput>,
  settings_override: Option<cmd::AgentSettingsInput>,
) -> Result<GeneratedSkillDraft> {
  let trimmed_prompt = prompt.trim().to_string();
  if trimmed_prompt.is_empty() {
    return Err(anyhow!("prompt cannot be empty"));
  }

  let resolved_lang = normalize_lang(lang.as_deref());
  let settings = db::resolve_settings_override(settings_override)?;

  if settings.is_ready() {
    match request_skill_draft_from_model(
      &settings,
      &trimmed_prompt,
      resolved_lang,
      existing_skill.as_ref(),
    ) {
      Ok(skill) => Ok(skill),
      Err(error) => Ok(with_skill_generation_warning(
        build_local_skill_draft(existing_skill.as_ref(), &trimmed_prompt, resolved_lang),
        skill_generation_fallback_warning_message(resolved_lang, &error),
      )),
    }
  } else {
    Ok(build_local_skill_draft(
      existing_skill.as_ref(),
      &trimmed_prompt,
      resolved_lang,
    ))
  }
}

pub fn run_agent(session_id: i64, prompt: String) -> Result<db::WorkspaceSnapshot> {
  let trimmed_prompt = prompt.trim().to_string();
  if trimmed_prompt.is_empty() {
    return Err(anyhow!("prompt cannot be empty"));
  }

  let runtime_context = build_runtime_context(session_id, &trimmed_prompt)?;
  let runtime_context_detail = render_runtime_context_activity(&runtime_context);
  let plan = draft_plan(&trimmed_prompt, &runtime_context);
  let settings = db::load_settings()?;

  let (model_title, model_detail, model_status, reply) = if settings.is_ready() {
    match request_completion(&settings, session_id, &runtime_context, &trimmed_prompt) {
      Ok(content) => (
        "Provider call finished".to_string(),
        format!(
          "{} / {} returned {} chars.",
          settings.provider_name,
          settings.model,
          content.chars().count()
        ),
        "completed".to_string(),
        content,
      ),
      Err(error) => (
        "Provider call failed".to_string(),
        shorten(&format!("{:#}", error), 200),
        "failed".to_string(),
        local_fallback_reply(
          &trimmed_prompt,
          Some(&error.to_string()),
          &settings,
          &runtime_context,
        ),
      ),
    }
  } else {
    (
      "Provider not configured".to_string(),
      "Missing baseUrl, model or apiKey. Falling back to local preview mode.".to_string(),
      "warning".to_string(),
      local_fallback_reply(&trimmed_prompt, None, &settings, &runtime_context),
    )
  };

  db::persist_agent_run(
    session_id,
    &trimmed_prompt,
    &runtime_context_detail,
    &plan,
    &model_title,
    &model_detail,
    &model_status,
    &reply,
  )
}

fn request_completion(
  settings: &db::AgentSettings,
  session_id: i64,
  runtime_context: &AgentRuntimeContext,
  prompt: &str,
) -> Result<String> {
  let history = db::recent_messages(session_id, 18)?;
  let enabled_skills = db::session_enabled_skills(session_id)?;
  let mut messages = Vec::new();

  let skill_block = render_skill_block(&enabled_skills);
  let runtime_block = render_runtime_context_block(runtime_context);
  let mut system_sections = Vec::new();

  if !settings.system_prompt.trim().is_empty() {
    system_sections.push(settings.system_prompt.trim().to_string());
  }
  if !runtime_block.is_empty() {
    system_sections.push(runtime_block);
  }
  if !skill_block.is_empty() {
    system_sections.push(skill_block);
  }

  let system_prompt = system_sections.join("\n\n");

  if !system_prompt.trim().is_empty() {
    messages.push(CompletionMessage {
      role: "system".to_string(),
      content: system_prompt,
    });
  }

  for item in history {
    messages.push(CompletionMessage {
      role: item.role,
      content: item.content,
    });
  }
  messages.push(CompletionMessage {
    role: "user".to_string(),
    content: prompt.to_string(),
  });

  let request = ChatCompletionRequest {
    model: settings.model.clone(),
    messages,
    temperature: 0.4,
  };

  let endpoint = completion_endpoint(&settings.base_url);
  let client = Client::builder()
    .timeout(std::time::Duration::from_secs(90))
    .build()
    .context("failed to build HTTP client")?;

  let response = client
    .post(endpoint)
    .header(CONTENT_TYPE, "application/json")
    .header(AUTHORIZATION, format!("Bearer {}", settings.api_key))
    .json(&request)
    .send()
    .context("failed to send completion request")?;

  let status = response.status();
  let body = response.text().context("failed to read completion response")?;
  if !status.is_success() {
    return Err(anyhow!("provider returned {}: {}", status, shorten(&body, 240)));
  }

  let parsed: ChatCompletionResponse =
    serde_json::from_str(&body).context("failed to parse completion response")?;
  let content = parsed
    .choices
    .into_iter()
    .next()
    .and_then(|choice| extract_text(choice.message.content))
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .context("provider returned an empty assistant message")?;

  Ok(content)
}

fn request_skill_draft_from_model(
  settings: &db::AgentSettings,
  prompt: &str,
  lang: &str,
  existing_skill: Option<&cmd::SkillInput>,
) -> Result<GeneratedSkillDraft> {
  let system_prompt = if lang == "zh-CN" {
    [
      "You are a skill designer. Output a reusable low-permission skill based on the user request.",
      "Return JSON only. Do not output markdown.",
      "JSON fields must be name, description, triggerHint, instructions.",
      "name must be under 40 characters.",
      "description should summarize the skill value in 1-2 sentences.",
      "triggerHint should describe the requests where this skill should activate.",
      "instructions should be reusable, explicit, and actionable.",
    ]
    .join("\n")
  } else {
    [
      "You are designing a reusable low-permission skill for an agent workspace.",
      "Return JSON only. No markdown.",
      "The JSON fields must be: name, description, triggerHint, instructions.",
      "Keep name under 40 characters.",
      "Description should explain the value of the skill in 1-2 sentences.",
      "triggerHint should explain when this skill should activate.",
      "instructions should be a reusable instruction block with concrete operational guidance.",
    ]
    .join("\n")
  };

  let user_prompt = if let Some(skill) = existing_skill {
    format!(
      "User request: {}\nExisting skill for rewrite reference: {}",
      prompt,
      serde_json::to_string(skill)?
    )
  } else {
    format!("User request: {}\nThis is for a brand new skill.", prompt)
  };

  let request = ChatCompletionRequest {
    model: settings.model.clone(),
    messages: vec![
      CompletionMessage {
        role: "system".to_string(),
        content: system_prompt,
      },
      CompletionMessage {
        role: "user".to_string(),
        content: user_prompt,
      },
    ],
    temperature: 0.4,
  };

  let endpoint = completion_endpoint(&settings.base_url);
  let client = Client::builder()
    .timeout(std::time::Duration::from_secs(90))
    .build()
    .context("failed to build HTTP client")?;

  let response = client
    .post(endpoint)
    .header(CONTENT_TYPE, "application/json")
    .header(AUTHORIZATION, format!("Bearer {}", settings.api_key))
    .json(&request)
    .send()
    .context("failed to send skill generation request")?;

  let status = response.status();
  let body = response.text().context("failed to read skill generation response")?;
  if !status.is_success() {
    return Err(anyhow!(
      "provider returned {} while generating skill: {}",
      status,
      shorten(&body, 240)
    ));
  }

  let parsed: ChatCompletionResponse =
    serde_json::from_str(&body).context("failed to parse skill generation response")?;
  let content = parsed
    .choices
    .into_iter()
    .next()
    .and_then(|choice| extract_text(choice.message.content))
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .context("provider returned an empty skill draft")?;

  parse_generated_skill(&content, existing_skill)
}

fn render_skill_block(skills: &[db::SkillDetail]) -> String {
  if skills.is_empty() {
    return String::new();
  }

  let mut lines = vec![
    "Enabled custom skills:".to_string(),
    "All custom skills are low-permission only. They may shape reasoning and output style, but they must not assume elevated access, destructive authority, or unrestricted external side effects.".to_string(),
  ];

  for skill in skills {
    lines.push(format!(
      "- {} [{}]: Trigger when {}. Instructions: {}",
      skill.name,
      skill.permission_level,
      shorten(&skill.trigger_hint, 120),
      shorten(&skill.instructions, 260)
    ));
  }

  lines.join("\n")
}

fn parse_generated_skill(
  content: &str,
  existing_skill: Option<&cmd::SkillInput>,
) -> Result<GeneratedSkillDraft> {
  let trimmed = content.trim();
  let candidate = if let Some(fenced) = trimmed
    .strip_prefix("```json")
    .and_then(|value| value.strip_suffix("```"))
  {
    fenced.trim()
  } else if let Some(fenced) = trimmed
    .strip_prefix("```")
    .and_then(|value| value.strip_suffix("```"))
  {
    fenced.trim()
  } else {
    trimmed
  };

  let start = candidate.find('{').context("model did not return JSON")?;
  let end = candidate.rfind('}').context("model did not return JSON")?;
  let payload = &candidate[start..=end];
  let parsed: GeneratedSkillDraftPayload =
    serde_json::from_str(payload).context("failed to parse generated skill JSON")?;

  Ok(sanitize_generated_skill(parsed, existing_skill, None))
}

fn build_local_skill_draft(
  existing_skill: Option<&cmd::SkillInput>,
  prompt: &str,
  lang: &str,
) -> GeneratedSkillDraft {
  let title_seed = prompt
    .split(|ch: char| ['\n', ',', '.', '!', '?', ';', ':'].contains(&ch))
    .find(|part| !part.trim().is_empty())
    .map(str::trim)
    .map(|value| value.chars().take(28).collect::<String>());

  let (fallback_name, description, trigger_hint, instructions) = if lang == "zh-CN" {
    (
      "\u{751f}\u{6210}\u{6280}\u{80fd}",
      format!(
        "\u{6839}\u{636e}\u{4ee5}\u{4e0b}\u{9700}\u{6c42}\u{751f}\u{6210}\u{7684}\u{672c}\u{5730}\u{8349}\u{7a3f}\u{ff1a}{}",
        trim_for_template(prompt, 88)
      ),
      format!(
        "\u{5f53}\u{4efb}\u{52a1}\u{6d89}\u{53ca}\u{4ee5}\u{4e0b}\u{5185}\u{5bb9}\u{65f6}\u{4f7f}\u{7528}\u{ff1a}{}",
        trim_for_template(prompt, 72)
      ),
      format!(
        "\u{5c06}\u{4ee5}\u{4e0b}\u{76ee}\u{6807}\u{89e3}\u{91ca}\u{6210}\u{4e00}\u{4e2a}\u{53ef}\u{590d}\u{7528}\u{7684}\u{4f4e}\u{6743}\u{9650}\u{6280}\u{80fd}\u{ff0c}\u{5e76}\u{636e}\u{6b64}\u{8c03}\u{6574}\u{4f60}\u{7684}\u{6267}\u{884c}\u{65b9}\u{5f0f}\u{ff1a}{}\n\n\u{4f18}\u{5148}\u{663e}\u{5f0f}\u{89c4}\u{5212}\u{ff0c}\u{6e05}\u{695a}\u{8bf4}\u{660e}\u{5047}\u{8bbe}\u{ff0c}\u{9664}\u{975e}\u{64cd}\u{4f5c}\u{8005}\u{660e}\u{786e}\u{8981}\u{6c42}\u{ff0c}\u{5426}\u{5219}\u{907f}\u{514d}\u{7834}\u{574f}\u{6027}\u{64cd}\u{4f5c}\u{3002}",
        trim_for_template(prompt, 180)
      ),
    )
  } else {
    (
      "Generated skill",
      format!("Locally generated draft for: {}", trim_for_template(prompt, 88)),
      format!("Use when the request is about: {}", trim_for_template(prompt, 72)),
      format!(
        "Interpret the following goal as a reusable low-permission skill and bias your execution accordingly: {}\n\nPrefer explicit planning, keep assumptions visible, and avoid destructive actions unless the operator clearly requests them.",
        trim_for_template(prompt, 180)
      ),
    )
  };

  sanitize_generated_skill(
    GeneratedSkillDraftPayload {
      name: title_seed,
      description: Some(description),
      trigger_hint: Some(trigger_hint),
      instructions: Some(instructions),
    },
    existing_skill,
    Some(fallback_name),
  )
}

fn sanitize_generated_skill(
  skill: GeneratedSkillDraftPayload,
  existing_skill: Option<&cmd::SkillInput>,
  fallback_name: Option<&str>,
) -> GeneratedSkillDraft {
  GeneratedSkillDraft {
    name: skill
      .name
      .as_deref()
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(|value| value.chars().take(64).collect::<String>())
      .or_else(|| {
        existing_skill
          .map(|value| value.name.trim().to_string())
          .filter(|value| !value.is_empty())
      })
      .or_else(|| fallback_name.map(str::to_string))
      .unwrap_or_else(|| "Generated skill".to_string()),
    description: skill
      .description
      .as_deref()
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(str::to_string)
      .or_else(|| {
        existing_skill
          .map(|value| value.description.trim().to_string())
          .filter(|value| !value.is_empty())
      })
      .unwrap_or_default(),
    trigger_hint: skill
      .trigger_hint
      .as_deref()
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(str::to_string)
      .or_else(|| {
        existing_skill
          .map(|value| value.trigger_hint.trim().to_string())
          .filter(|value| !value.is_empty())
      })
      .unwrap_or_default(),
    instructions: skill
      .instructions
      .as_deref()
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(str::to_string)
      .or_else(|| {
        existing_skill
          .map(|value| value.instructions.trim().to_string())
          .filter(|value| !value.is_empty())
      })
      .unwrap_or_default(),
    warning: None,
  }
}

fn with_skill_generation_warning(
  mut draft: GeneratedSkillDraft,
  warning: String,
) -> GeneratedSkillDraft {
  let trimmed = warning.trim();
  if !trimmed.is_empty() {
    draft.warning = Some(trimmed.to_string());
  }
  draft
}

/*
fn skill_generation_fallback_warning(lang: &str, error: &anyhow::Error) -> String {
  let detail = shorten(&format!("{:#}", error), 200);
  if lang == "zh-CN" {
    format!("模型技能生成失败，已退回到本地草稿构建：{}", detail)
  } else {
    format!(
      "Model skill generation failed, so a local draft was created instead: {}",
      detail
    )
  }
}

*/
fn skill_generation_fallback_warning_message(lang: &str, error: &anyhow::Error) -> String {
  let detail = shorten(&format!("{:#}", error), 200);
  if lang == "zh-CN" {
    format!(
      "\u{6a21}\u{578b}\u{6280}\u{80fd}\u{751f}\u{6210}\u{5931}\u{8d25}\u{ff0c}\u{5df2}\u{9000}\u{56de}\u{5230}\u{672c}\u{5730}\u{8349}\u{7a3f}\u{6784}\u{5efa}\u{ff1a}{}",
      detail
    )
  } else {
    format!(
      "Model skill generation failed, so a local draft was created instead: {}",
      detail
    )
  }
}

fn normalize_lang(lang: Option<&str>) -> &str {
  match lang.unwrap_or_default().to_lowercase() {
    value if value.starts_with("zh") => "zh-CN",
    value if value.starts_with("en") => "en-US",
    _ => "en-US",
  }
}

fn trim_for_template(value: &str, limit: usize) -> String {
  let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
  if compact.chars().count() <= limit {
    compact
  } else {
    compact.chars().take(limit).collect::<String>() + "..."
  }
}

fn build_runtime_context(session_id: i64, prompt: &str) -> Result<AgentRuntimeContext> {
  let workspace = db::workspace_snapshot(Some(session_id))?;
  let notes = db::recent_note_details(12)?;
  let note_titles = workspace
    .notes
    .iter()
    .map(|note| (note.id, note.title.clone()))
    .collect::<std::collections::HashMap<_, _>>();

  Ok(AgentRuntimeContext {
    session_title: workspace.active_session.session.title.clone(),
    session_status: workspace.active_session.session.status.clone(),
    message_count: workspace.active_session.messages.len(),
    mounted_skill_names: workspace
      .active_session
      .mounted_skills
      .iter()
      .filter(|skill| skill.enabled)
      .map(|skill| skill.name.clone())
      .collect(),
    relevant_notes: select_relevant_notes(prompt, &notes, 3),
    open_reminders: select_open_reminders(&workspace.reminders, &note_titles, 4),
    capability_titles: workspace
      .capabilities
      .iter()
      .map(|capability| capability.title.clone())
      .collect(),
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
  notes: &[db::KnowledgeNoteDetail],
  limit: usize,
) -> Vec<ContextNote> {
  let keywords = extract_keywords(prompt);
  let mut ranked = notes
    .iter()
    .map(|note| {
      let haystack = format!(
        "{} {} {}",
        note.title.to_lowercase(),
        note.body.to_lowercase(),
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
          excerpt: first_non_empty_line(&note.body)
            .unwrap_or_else(|| note.summary.clone()),
          tags: note.tags.clone(),
        },
      )
    })
    .collect::<Vec<_>>();

  ranked.sort_by(|left, right| {
    right
      .0
      .cmp(&left.0)
      .then_with(|| right.1.cmp(&left.1))
  });

  ranked
    .into_iter()
    .filter(|(score, _, _)| *score > 0)
    .take(limit)
    .map(|(_, _, note)| note)
    .collect()
}

fn select_open_reminders(
  reminders: &[db::ReminderItem],
  note_titles: &std::collections::HashMap<i64, String>,
  limit: usize,
) -> Vec<ContextReminder> {
  let mut open_items = reminders
    .iter()
    .filter(|reminder| reminder.status != "done")
    .collect::<Vec<_>>();

  open_items.sort_by(|left, right| {
    left
      .due_at
      .unwrap_or(i64::MAX)
      .cmp(&right.due_at.unwrap_or(i64::MAX))
      .then_with(|| right.updated_at.cmp(&left.updated_at))
  });

  open_items
    .into_iter()
    .take(limit)
    .map(|reminder| ContextReminder {
      title: reminder.title.clone(),
      severity: reminder.severity.clone(),
      due_label: render_due_label(reminder.due_at),
      linked_note_title: reminder
        .linked_note_id
        .and_then(|note_id| note_titles.get(&note_id).cloned()),
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

  let cjk_only = lowered
    .chars()
    .filter(|ch| is_cjk(*ch))
    .collect::<String>();
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

fn first_non_empty_line(value: &str) -> Option<String> {
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

fn completion_endpoint(base_url: &str) -> String {
  let trimmed = base_url.trim().trim_end_matches('/');
  if trimmed.ends_with("/chat/completions") {
    trimmed.to_string()
  } else {
    format!("{}/chat/completions", trimmed)
  }
}

fn extract_text(content: Value) -> Option<String> {
  match content {
    Value::String(text) => Some(text),
    Value::Array(items) => {
      let joined = items
        .into_iter()
        .filter_map(|item| item.get("text").and_then(Value::as_str).map(str::to_string))
        .collect::<Vec<_>>()
        .join("\n");
      if joined.trim().is_empty() {
        None
      } else {
        Some(joined)
      }
    }
    _ => None,
  }
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

fn local_fallback_reply(
  prompt: &str,
  failure_reason: Option<&str>,
  settings: &db::AgentSettings,
  context: &AgentRuntimeContext,
) -> String {
  let provider_state = match failure_reason {
    Some(reason) => format!(
      "Remote model call failed and the runtime switched to local preview mode. Reason: {}.",
      shorten(reason, 120)
    ),
    None if settings.is_ready() => "The runtime is in local preview mode.".to_string(),
    None => "No provider is configured yet, so the runtime is using local preview mode.".to_string(),
  };
  let staged_notes = if context.relevant_notes.is_empty() {
    "No relevant notes were staged.".to_string()
  } else {
    format!(
      "Relevant notes: {}.",
      context
        .relevant_notes
        .iter()
        .map(|note| shorten(&note.title, 24))
        .collect::<Vec<_>>()
        .join(", ")
    )
  };
  let staged_reminders = if context.open_reminders.is_empty() {
    "No open reminders are currently staged.".to_string()
  } else {
    format!(
      "Open reminders: {}.",
      context
        .open_reminders
        .iter()
        .map(|reminder| shorten(&reminder.title, 24))
        .collect::<Vec<_>>()
        .join(", ")
    )
  };
  let mounted_skills = if context.mounted_skill_names.is_empty() {
    "Mounted skills: none.".to_string()
  } else {
    format!("Mounted skills: {}.", context.mounted_skill_names.join(", "))
  };

  format!(
    "Mission accepted: {}\n\nStaged context:\n- {}\n- {}\n- {}\n\nSuggested next steps:\n1. Break the request into the smallest verifiable outcome.\n2. Decide which context must survive into the next run.\n3. Convert the output into a concrete instruction or code change.\n\n{}\nOnce baseUrl, apiKey and model are configured, the next run will use the real model path.",
    shorten(prompt, 180),
    staged_notes,
    staged_reminders,
    mounted_skills,
    provider_state
  )
}

fn shorten(value: &str, limit: usize) -> String {
  let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
  if compact.chars().count() <= limit {
    compact
  } else {
    compact.chars().take(limit).collect::<String>() + "..."
  }
}
