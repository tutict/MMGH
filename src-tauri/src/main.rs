#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::path::PathBuf;
use std::sync::{
  atomic::{AtomicBool, Ordering},
  Arc,
};

use tauri::{
  menu::{Menu, MenuItemBuilder},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Manager, WindowEvent,
};

mod agent;
mod cmd;
mod db;

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_SHOW_ID: &str = "tray_show";
const TRAY_HIDE_ID: &str = "tray_hide";
const TRAY_QUIT_ID: &str = "tray_quit";

struct AppRuntimeState {
  is_quitting: AtomicBool,
}

fn show_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
  }
}

fn hide_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let _ = window.hide();
  }
}

fn toggle_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let is_visible = window.is_visible().unwrap_or(true);
    if is_visible {
      let _ = window.hide();
    } else {
      let _ = window.unminimize();
      let _ = window.show();
      let _ = window.set_focus();
    }
  }
}

fn build_tray(app: &AppHandle, state: Arc<AppRuntimeState>) -> tauri::Result<()> {
  let show_item = MenuItemBuilder::with_id(TRAY_SHOW_ID, "显示主窗口").build(app)?;
  let hide_item = MenuItemBuilder::with_id(TRAY_HIDE_ID, "隐藏到托盘").build(app)?;
  let quit_item = MenuItemBuilder::with_id(TRAY_QUIT_ID, "退出 MMGH").build(app)?;
  let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

  let mut tray = TrayIconBuilder::with_id("main-tray")
    .menu(&menu)
    .tooltip("MMGH Agent Deck")
    .show_menu_on_left_click(false)
    .on_menu_event({
      let state = Arc::clone(&state);
      move |app, event| match event.id().as_ref() {
        TRAY_SHOW_ID => show_main_window(app),
        TRAY_HIDE_ID => hide_main_window(app),
        TRAY_QUIT_ID => {
          state.is_quitting.store(true, Ordering::SeqCst);
          app.exit(0);
        }
        _ => {}
      }
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        toggle_main_window(tray.app_handle());
      }
    });

  if let Some(icon) = app.default_window_icon().cloned() {
    tray = tray.icon(icon);
  }

  tray.build(app)?;
  Ok(())
}

fn main() {
  let runtime_state = Arc::new(AppRuntimeState {
    is_quitting: AtomicBool::new(false),
  });

  tauri::Builder::default()
    .setup(move |app| {
      let app_data_dir = app
        .path()
        .app_local_data_dir()
        .or_else(|_| app.path().app_data_dir())
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

      if let Err(error) = db::set_app_data_dir(app_data_dir) {
        return Err(std::io::Error::other(error.to_string()).into());
      }

      build_tray(app.handle(), Arc::clone(&runtime_state))?;

      if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let state = Arc::clone(&runtime_state);
        let window_handle = window.clone();
        window.on_window_event(move |event| {
          if let WindowEvent::CloseRequested { api, .. } = event {
            if state.is_quitting.load(Ordering::SeqCst) {
              return;
            }
            api.prevent_close();
            let _ = window_handle.hide();
          }
        });
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
      cmd::open_reminder,
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
