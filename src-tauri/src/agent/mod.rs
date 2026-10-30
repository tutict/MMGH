use anyhow::{anyhow, Result};

use crate::contracts::{AgentSettingsInput, SkillInput};
use crate::db;

mod contract;
mod fallback;
mod runtime;
mod skill;
mod text;

#[cfg(test)]
mod test_support;
#[cfg(test)]
mod tests;

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

/// One retrieved chunk the model received during an agent run.
#[derive(Debug, Clone)]
pub struct AgentEvidenceContext {
  pub title: String,
  pub text: String,
}

/// What one agent run actually staged and answered, for offline capability
/// evaluation. The contexts are the retrieved chunks the model received.
#[derive(Debug, Clone)]
pub struct AgentRunEvidence {
  pub reply: String,
  pub model_status: String,
  pub model_title: String,
  pub contexts: Vec<AgentEvidenceContext>,
  pub skill_contexts: Vec<String>,
  pub mounted_skill_names: Vec<String>,
  pub open_reminder_titles: Vec<String>,
  pub prompt: String,
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

pub async fn run_agent(session_id: i64, prompt: String) -> Result<db::WorkspaceSnapshot> {
  let contract = AgentRuntimeContract::for_session(session_id, prompt)?;
  let settings = db::load_settings()?;
  let (snapshot, _evidence) = execute_agent_run(session_id, contract, settings).await?;
  Ok(snapshot)
}

/// Runs one agent turn against an explicit provider configuration instead of
/// the persisted one, and returns the staged retrieval alongside the reply.
///
/// The offline capability harness uses this so it can drive the real prompt
/// assembly without touching the system keyring or the persisted settings.
pub async fn run_agent_for_evaluation(
  session_id: i64,
  prompt: String,
  settings: db::AgentSettings,
) -> Result<(db::WorkspaceSnapshot, AgentRunEvidence)> {
  let contract = AgentRuntimeContract::for_session(session_id, prompt)?;
  execute_agent_run(session_id, contract, settings).await
}

async fn execute_agent_run(
  session_id: i64,
  contract: AgentRuntimeContract,
  settings: db::AgentSettings,
) -> Result<(db::WorkspaceSnapshot, AgentRunEvidence)> {
  let runtime_context_detail = contract.runtime_context_detail();
  let plan = contract.plan();

  let (model_title, model_detail, model_status, reply, skill_contexts) = if settings.is_ready() {
    let enabled_skills = db::session_enabled_skills(session_id)?;
    let skill_contexts = enabled_skills
      .iter()
      .map(contract::render_skill_line)
      .collect::<Vec<_>>();
    match request_completion(&settings, session_id, &contract, &enabled_skills).await {
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
        skill_contexts,
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
        skill_contexts,
      ),
    }
  } else {
    (
      "Provider not configured".to_string(),
      "Missing baseUrl, model or apiKey. Falling back to local preview mode.".to_string(),
      "warning".to_string(),
      local_fallback_reply(&contract.prompt, None, &settings, &contract.context),
      Vec::new(),
    )
  };

  let evidence = AgentRunEvidence {
    reply: reply.clone(),
    model_status: model_status.clone(),
    model_title: model_title.clone(),
    contexts: contract
      .context
      .relevant_notes
      .iter()
      .map(|note| AgentEvidenceContext {
        title: note.title.clone(),
        text: contract::render_context_note(note),
      })
      .collect(),
    skill_contexts,
    mounted_skill_names: contract.context.mounted_skill_names.clone(),
    open_reminder_titles: contract
      .context
      .open_reminders
      .iter()
      .map(|reminder| reminder.title.clone())
      .collect(),
    prompt: contract.prompt.clone(),
  };

  let snapshot = db::persist_agent_run(db::AgentRunPersistence {
    session_id,
    prompt: &contract.prompt,
    runtime_context_detail: &runtime_context_detail,
    plan: &plan,
    model_title: &model_title,
    model_detail: &model_detail,
    model_status: &model_status,
    reply: &reply,
  })?;

  Ok((snapshot, evidence))
}

/// Renders a knowledge note the way the runtime context block presents it, so
/// an offline evaluation can build reference contexts from raw note data.
pub fn render_reference_context(title: &str, body: &str, tags: &[String]) -> String {
  contract::render_context_note(&contract::ContextNote {
    title: title.to_string(),
    excerpt: contract::first_non_empty_line(body).unwrap_or_default(),
    tags: tags.to_vec(),
  })
}

async fn request_completion(
  settings: &db::AgentSettings,
  session_id: i64,
  contract: &AgentRuntimeContract,
  enabled_skills: &[db::SkillDetail],
) -> Result<String> {
  let history = db::recent_messages(session_id, contract::MAX_AGENT_HISTORY_MESSAGES)?;
  let bundle = contract.compose_prompt(settings, history, enabled_skills);
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
