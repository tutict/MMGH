use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::contracts::SkillInput;

use super::text::{shorten, trim_for_template};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedSkillDraft {
  pub name: String,
  pub description: String,
  pub trigger_hint: String,
  pub instructions: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub warning: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct GeneratedSkillDraftPayload {
  pub name: Option<String>,
  pub description: Option<String>,
  pub trigger_hint: Option<String>,
  pub instructions: Option<String>,
}

pub(super) fn parse_generated_skill(
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

pub(super) fn sanitize_generated_skill(
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

pub(super) fn with_skill_generation_warning(
  mut draft: GeneratedSkillDraft,
  warning: String,
) -> GeneratedSkillDraft {
  let trimmed = warning.trim();
  if !trimmed.is_empty() {
    draft.warning = Some(trimmed.to_string());
  }
  draft
}

pub(super) fn skill_generation_fallback_warning_message(
  lang: &str,
  error: &anyhow::Error,
) -> String {
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

pub(super) fn skill_draft_system_prompt(lang: &str) -> String {
  if lang == "zh-CN" {
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
  }
}

pub(super) fn skill_draft_user_prompt(
  prompt: &str,
  existing_skill: Option<&SkillInput>,
) -> Result<String> {
  if let Some(skill) = existing_skill {
    Ok(format!(
      "User request: {}\nExisting skill for rewrite reference: {}",
      prompt,
      serde_json::to_string(skill)?
    ))
  } else {
    Ok(format!(
      "User request: {}\nThis is for a brand new skill.",
      prompt
    ))
  }
}

pub(super) fn build_local_skill_draft(
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
      format!(
        "Locally generated draft for: {}",
        trim_for_template(prompt, 88)
      ),
      format!(
        "Use when the request is about: {}",
        trim_for_template(prompt, 72)
      ),
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
