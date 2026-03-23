#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod agent;
mod cmd;
mod db;

fn main() {
  tauri::AppBuilder::new()
    .invoke_handler(|webview, arg| {
      use cmd::Cmd::*;
      match serde_json::from_str(arg) {
        Err(e) => {
          Err(e.to_string())
        }
        Ok(command) => {
          match command {
            Bootstrap { callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::bootstrap()?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            OpenSession { session_id, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::open_session(session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            CreateSession { title, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::create_session(title)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            DeleteSession { session_id, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::delete_session(session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            SaveSettings {
              settings,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::save_settings(settings, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            OpenKnowledgeNote {
              note_id,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::open_note(note_id, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            CreateKnowledgeNote {
              title,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::create_note(title, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            SaveKnowledgeNote {
              note,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::save_note(note, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            DeleteKnowledgeNote {
              note_id,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::delete_note(note_id, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            CreateReminder {
              title,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::create_reminder(title, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            SaveReminder {
              reminder,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::save_reminder(reminder, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            DeleteReminder {
              reminder_id,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::delete_reminder(reminder_id, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            OpenSkill {
              skill_id,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::open_skill(skill_id, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            CreateSkill {
              name,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::create_skill(name, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            SaveSkill {
              skill,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::save_skill(skill, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            DeleteSkill {
              skill_id,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::delete_skill(skill_id, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            SaveSessionSkills {
              session_id,
              skill_ids,
              active_session_id,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::save_session_skills(session_id, skill_ids, active_session_id)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            RunAgent {
              session_id,
              prompt,
              callback,
              error,
            } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(agent::run_agent(session_id, prompt)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
          }
          Ok(())
        }
      }
    })
    .build()
    .run();
}
