use anyhow::{anyhow, Result};

use super::contract::MAX_AGENT_PROMPT_CHARS;

pub(super) fn shorten(value: &str, limit: usize) -> String {
  let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
  if compact.chars().count() <= limit {
    compact
  } else {
    compact.chars().take(limit).collect::<String>() + "..."
  }
}

pub(super) fn trim_for_template(value: &str, limit: usize) -> String {
  shorten(value, limit)
}

pub(super) fn normalize_lang(lang: Option<&str>) -> &'static str {
  match lang.unwrap_or_default().to_lowercase() {
    value if value.starts_with("zh") => "zh-CN",
    value if value.starts_with("en") => "en-US",
    _ => "en-US",
  }
}

pub(super) fn normalize_agent_prompt(prompt: String) -> Result<String> {
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
