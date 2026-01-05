#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

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
            // definitions for your custom commands from Cmd here
            MyCustomCommand { argument } => {
              //  your command code
              println!("{}", argument);
            }
            ListNotes { query, limit, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::list_notes(query, limit)?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            AddNote { title, content, mood, tags, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::add_note(title, content, mood, tags.unwrap_or_default())?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            UpdateNote { id, title, content, mood, tags, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::update_note(id, title, content, mood, tags.unwrap_or_default())?),
                callback,
                error,
              )
              .map_err(|err| err.to_string())?;
            }
            DeleteNote { id, callback, error } => {
              tauri::execute_promise_sync(
                webview,
                move || Ok(db::delete_note(id)?),
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
