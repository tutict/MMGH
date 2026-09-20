use crate::db;

use super::contract::AgentRuntimeContext;
use super::text::shorten;

pub(super) fn local_fallback_reply(
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
