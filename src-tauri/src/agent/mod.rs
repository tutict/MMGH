use anyhow::{anyhow, Result};

use crate::contracts::{AgentSettingsInput, SkillInput};
use crate::db;

mod contract;
mod fallback;
mod runtime;
mod skill;
mod text;

use contract::{model_call_failure_title, AgentRuntimeContract};
use fallback::local_fallback_reply;
use runtime::RigRuntime;
use skill::{
  build_local_skill_draft, parse_generated_skill, skill_draft_system_prompt,
  skill_draft_user_prompt, skill_generation_fallback_warning_message,
  with_skill_generation_warning,
};
use text::{normalize_agent_prompt, normalize_lang};

pub use skill::GeneratedSkillDraft;

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
        model_call_failure_title(&error).to_string(),
        shorten_error(&error),
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
  let history = db::recent_messages(session_id, contract::MAX_AGENT_HISTORY_MESSAGES)?;
  let enabled_skills = db::session_enabled_skills(session_id)?;
  let bundle = contract.compose_prompt(settings, history, &enabled_skills);
  let content = RigRuntime::complete_reply(settings, bundle).await?;
  contract.validate_reply(&content)
}

async fn request_skill_draft_from_model(
  settings: &db::AgentSettings,
  prompt: &str,
  lang: &str,
  existing_skill: Option<&SkillInput>,
) -> Result<GeneratedSkillDraft> {
  let content = RigRuntime::complete_skill_draft(
    settings,
    &skill_draft_system_prompt(lang),
    &skill_draft_user_prompt(prompt, existing_skill)?,
  )
  .await?;
  let content = content.trim();
  if content.is_empty() {
    return Err(anyhow!("provider returned an empty skill draft"));
  }
  parse_generated_skill(content, existing_skill)
}

fn shorten_error(error: &anyhow::Error) -> String {
  text::shorten(&format!("{:#}", error), 200)
}
