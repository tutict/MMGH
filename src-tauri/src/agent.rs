use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::contracts::{AgentSettingsInput, SkillInput};
use crate::db;

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
  Client::builder()
    .timeout(std::time::Duration::from_secs(90))
    .build()
    .expect("failed to build shared HTTP client")
});

const MAX_AGENT_PROMPT_CHARS: usize = 20_000;
const MAX_AGENT_REPLY_CHARS: usize = 12_000;
const MAX_AGENT_HISTORY_MESSAGES: usize = 18;
const MAX_AGENT_HISTORY_MESSAGE_CHARS: usize = 2_000;
const MAX_SYSTEM_PROMPT_CHARS: usize = 4_000;
const MAX_CONTEXT_NOTES_TO_SCAN: usize = 12;
const MAX_CONTEXT_NOTE_SOURCE_CHARS: usize = 1_600;
const MAX_STAGED_CONTEXT_NOTES: usize = 3;
const MAX_STAGED_OPEN_REMINDERS: usize = 4;
const MAX_MOUNTED_SKILLS_IN_PROMPT: usize = 8;

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

#[derive(Debug, Clone)]
struct AgentRuntimeContract {
  prompt: String,
  context: AgentRuntimeContext,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct AgentContractError {
  reason: String,
}

impl std::fmt::Display for AgentContractError {
  fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(formatter, "runtime contract rejected provider reply: {}", self.reason)
  }
}

impl std::error::Error for AgentContractError {}

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

pub async fn forge_skill(
  prompt: String,
  lang: Option<String>,
  existing_skill: Option<SkillInput>,
  settings_override: Option<AgentSettingsInput>,
) -> Result<GeneratedSkillDraft> {
  let trimmed_prompt = normalize_agent_prompt(prompt)?;

  let resolved_lang = normalize_lang(lang.as_deref());
  let settings = db::resolve_settings_override(settings_override)?;

  if settings.is_ready() {
    match request_skill_draft_from_model(
      &settings,
      &trimmed_prompt,
      resolved_lang,
      existing_skill.as_ref(),
    )
    .await
    {
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

impl AgentRuntimeContract {
  fn for_session(session_id: i64, prompt: String) -> Result<Self> {
    let normalized_prompt = normalize_agent_prompt(prompt)?;
    let context = build_runtime_context(session_id, &normalized_prompt)?;

    Ok(Self {
      prompt: normalized_prompt,
      context,
    })
  }

  fn runtime_context_detail(&self) -> String {
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

  fn plan(&self) -> String {
    draft_plan(&self.prompt, &self.context)
  }

  fn compose_messages(
    &self,
    settings: &db::AgentSettings,
    history: Vec<db::ChatMessage>,
    enabled_skills: &[db::SkillDetail],
  ) -> Vec<CompletionMessage> {
    let mut messages = Vec::new();
    let skill_block = render_skill_block(enabled_skills);
    let runtime_block = render_runtime_context_block(&self.context);
    let contract_block = render_contract_boundary_block();
    let mut system_sections = Vec::new();

    if !settings.system_prompt.trim().is_empty() {
      system_sections.push(shorten(settings.system_prompt.trim(), MAX_SYSTEM_PROMPT_CHARS));
    }
    if !runtime_block.is_empty() {
      system_sections.push(runtime_block);
    }
    if !skill_block.is_empty() {
      system_sections.push(skill_block);
    }
    system_sections.push(contract_block);

    let system_prompt = system_sections.join("\n\n");

    if !system_prompt.trim().is_empty() {
      messages.push(CompletionMessage {
        role: "system".to_string(),
        content: system_prompt,
      });
    }

    for item in history.into_iter().take(MAX_AGENT_HISTORY_MESSAGES) {
      if !matches!(item.role.as_str(), "user" | "assistant") {
        continue;
      }

      messages.push(CompletionMessage {
        role: item.role,
        content: shorten(&item.content, MAX_AGENT_HISTORY_MESSAGE_CHARS),
      });
    }

    messages.push(CompletionMessage {
      role: "user".to_string(),
      content: self.prompt.clone(),
    });

    messages
  }

  fn validate_reply(&self, reply: &str) -> Result<String> {
    let trimmed = reply.trim();
    if trimmed.is_empty() {
      return Err(AgentContractError {
        reason: "assistant reply is empty".to_string(),
      }
      .into());
    }

    if trimmed.chars().count() > MAX_AGENT_REPLY_CHARS {
      return Err(AgentContractError {
        reason: format!(
          "assistant reply exceeds {} characters",
          MAX_AGENT_REPLY_CHARS
        ),
      }
      .into());
    }

    if let Some(reason) = detect_forbidden_reply_claim(trimmed) {
      return Err(AgentContractError { reason }.into());
    }

    Ok(trimmed.to_string())
  }
}

pub async fn run_agent(session_id: i64, prompt: String) -> Result<db::WorkspaceSnapshot> {
  let contract = AgentRuntimeContract::for_session(session_id, prompt)?;
  let runtime_context_detail = contract.runtime_context_detail();
  let plan = contract.plan();
  let settings = db::load_settings()?;

  let (model_title, model_detail, model_status, reply) = if settings.is_ready() {
    match request_completion(&settings, session_id, &contract).await {
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
        model_failure_title(&error).to_string(),
        shorten(&format!("{:#}", error), 200),
        "failed".to_string(),
        local_fallback_reply(
          &contract.prompt,
          Some(&error.to_string()),
          &settings,
          &contract.context,
        ),
      ),
    }
  } else {
    (
      "Provider not configured".to_string(),
      "Missing baseUrl, model or apiKey. Falling back to local preview mode.".to_string(),
      "warning".to_string(),
      local_fallback_reply(&contract.prompt, None, &settings, &contract.context),
    )
  };

  db::persist_agent_run(db::AgentRunPersistence {
    session_id,
    prompt: &contract.prompt,
    runtime_context_detail: &runtime_context_detail,
    plan: &plan,
    model_title: &model_title,
    model_detail: &model_detail,
    model_status: &model_status,
    reply: &reply,
  })
}

async fn request_completion(
  settings: &db::AgentSettings,
  session_id: i64,
  contract: &AgentRuntimeContract,
) -> Result<String> {
  let history = db::recent_messages(session_id, MAX_AGENT_HISTORY_MESSAGES)?;
  let enabled_skills = db::session_enabled_skills(session_id)?;

  let request = ChatCompletionRequest {
    model: settings.model.clone(),
    messages: contract.compose_messages(settings, history, &enabled_skills),
    temperature: 0.4,
  };

  let endpoint = completion_endpoint(&settings.base_url);
  let response = HTTP_CLIENT
    .post(endpoint)
    .header(CONTENT_TYPE, "application/json")
    .header(AUTHORIZATION, format!("Bearer {}", settings.api_key))
    .json(&request)
    .send()
    .await
    .context("failed to send completion request")?;

  let status = response.status();
  let body = response
    .text()
    .await
    .context("failed to read completion response")?;
  if !status.is_success() {
    return Err(anyhow!(
      "provider returned {}: {}",
      status,
      shorten(&body, 240)
    ));
  }

  let parsed: ChatCompletionResponse =
    serde_json::from_str(&body).context("failed to parse completion response")?;
  let content = parsed
    .choices
    .into_iter()
    .next()
    .and_then(|choice| extract_text(choice.message.content))
    .unwrap_or_default();

  contract.validate_reply(&content)
}

async fn request_skill_draft_from_model(
  settings: &db::AgentSettings,
  prompt: &str,
  lang: &str,
  existing_skill: Option<&SkillInput>,
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
  let response = HTTP_CLIENT
    .post(endpoint)
    .header(CONTENT_TYPE, "application/json")
    .header(AUTHORIZATION, format!("Bearer {}", settings.api_key))
    .json(&request)
    .send()
    .await
    .context("failed to send skill generation request")?;

  let status = response.status();
  let body = response
    .text()
    .await
    .context("failed to read skill generation response")?;
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

  for skill in skills.iter().take(MAX_MOUNTED_SKILLS_IN_PROMPT) {
    lines.push(format!(
      "- {} [{}]: Trigger when {}. Instructions: {}",
      skill.name,
      skill.permission_level,
      shorten(&skill.trigger_hint, 120),
      shorten(&skill.instructions, 260)
    ));
  }
  if skills.len() > MAX_MOUNTED_SKILLS_IN_PROMPT {
    lines.push(format!(
      "- {} additional mounted skills were withheld by the context budget.",
      skills.len() - MAX_MOUNTED_SKILLS_IN_PROMPT
    ));
  }

  lines.join("\n")
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
      &["updated settings", "changed settings", "modified settings", "saved settings"],
    ),
    (
      "cleared cache",
      &["cleared cache", "cleared the cache", "cleaned cache", "reset cache"],
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
      &["played music", "started playback", "changed track", "opened music"],
    ),
    (
      "gallery access",
      &["opened gallery", "updated gallery", "tagged the image", "tagged image"],
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
      &["已清理缓存", "已经清理缓存", "已清缓存", "已经清缓存", "已重置缓存", "已经重置缓存"],
    ),
    (
      "weather access",
      &["已查询天气", "已经查询天气", "已获取天气", "已经获取天气", "已打开天气", "已经打开天气"],
    ),
    (
      "music access",
      &["已播放音乐", "已经播放音乐", "已切换音乐", "已经切换音乐", "已打开音乐", "已经打开音乐"],
    ),
    (
      "gallery access",
      &["已打开图库", "已经打开图库", "已更新图库", "已经更新图库", "已标记图片", "已经标记图片"],
    ),
  ];

  for (label, patterns) in chinese_patterns {
    if patterns.iter().any(|pattern| reply.contains(pattern)) {
      return Some(format!("reply claims unauthorized side effect: {label}"));
    }
  }

  None
}

fn parse_generated_skill(
  content: &str,
  existing_skill: Option<&SkillInput>,
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
  existing_skill: Option<&SkillInput>,
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
  existing_skill: Option<&SkillInput>,
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

fn normalize_agent_prompt(prompt: String) -> Result<String> {
  let trimmed = prompt.trim().to_string();
  if trimmed.is_empty() {
    return Err(anyhow!("prompt cannot be empty"));
  }
  if trimmed.chars().count() > MAX_AGENT_PROMPT_CHARS {
    return Err(anyhow!(
      "prompt is too long; maximum is {} characters",
      MAX_AGENT_PROMPT_CHARS
    ));
  }
  Ok(trimmed)
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
    None => {
      "No provider is configured yet, so the runtime is using local preview mode.".to_string()
    }
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
    format!(
      "Mounted skills: {}.",
      context.mounted_skill_names.join(", ")
    )
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
  fn compose_messages_enforces_contract_budget() {
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

    let messages = contract.compose_messages(&settings, history, &skills);

    assert!(messages[0]
      .content
      .contains("Non-negotiable Agent runtime contract"));
    assert!(messages[0].content.contains("additional mounted skills"));
    assert_eq!(messages.iter().filter(|item| item.role == "system").count(), 1);
    assert!(messages
      .iter()
      .all(|item| item.role == "system" || item.role == "user" || item.role == "assistant"));
    assert!(
      messages[1].content.chars().count() <= MAX_AGENT_HISTORY_MESSAGE_CHARS + 3
    );
    assert_eq!(messages.last().map(|item| item.content.as_str()), Some(contract.prompt.as_str()));
  }
}
