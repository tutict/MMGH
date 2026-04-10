#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::path::PathBuf;

use tauri::Manager;

mod agent;
mod cmd;
mod db;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let app_data_dir = app
        .path()
        .app_local_data_dir()
        .or_else(|_| app.path().app_data_dir())
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

      if let Err(error) = db::set_app_data_dir(app_data_dir) {
        return Err(std::io::Error::other(error.to_string()).into());
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      cmd::bootstrap,
      cmd::open_session,
      cmd::create_session,
      cmd::delete_session,
      cmd::save_settings,
      cmd::open_knowledge_note,
      cmd::create_knowledge_note,
      cmd::save_knowledge_note,
      cmd::delete_knowledge_note,
      cmd::create_reminder,
      cmd::save_reminder,
      cmd::delete_reminder,
      cmd::open_skill,
      cmd::create_skill,
      cmd::save_skill,
      cmd::delete_skill,
      cmd::save_session_skills,
      cmd::forge_skill,
      cmd::run_agent
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
