use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

pub const MAIN_WINDOW_LABEL: &str = "main";
pub const DESKTOP_WINDOW_STATE_EVENT: &str = "mmgh://desktop-window-state";
pub const DESKTOP_LIFECYCLE_EVENT: &str = "mmgh://desktop-lifecycle";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWindowState {
  pub label: String,
  pub visible: bool,
  pub focused: bool,
  pub minimized: bool,
  pub maximized: bool,
  pub fullscreen: bool,
  pub resizable: bool,
  pub decorated: bool,
  pub width: u32,
  pub height: u32,
  pub scale_factor: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLifecycleEvent {
  pub reason: String,
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
  app
    .get_webview_window(MAIN_WINDOW_LABEL)
    .ok_or_else(|| format!("window '{}' is not available", MAIN_WINDOW_LABEL))
}

pub fn collect_window_state(window: &WebviewWindow) -> DesktopWindowState {
  let size = window.inner_size().ok();

  DesktopWindowState {
    label: window.label().to_string(),
    visible: window.is_visible().unwrap_or(true),
    focused: window.is_focused().unwrap_or(false),
    minimized: window.is_minimized().unwrap_or(false),
    maximized: window.is_maximized().unwrap_or(false),
    fullscreen: window.is_fullscreen().unwrap_or(false),
    resizable: window.is_resizable().unwrap_or(true),
    decorated: window.is_decorated().unwrap_or(true),
    width: size.as_ref().map(|value| value.width).unwrap_or_default(),
    height: size.as_ref().map(|value| value.height).unwrap_or_default(),
    scale_factor: window.scale_factor().unwrap_or(1.0),
  }
}

pub fn emit_window_state(window: &WebviewWindow) {
  let _ = window.emit(DESKTOP_WINDOW_STATE_EVENT, collect_window_state(window));
}

pub fn emit_lifecycle(window: &WebviewWindow, reason: &str) {
  let payload = DesktopLifecycleEvent {
    reason: reason.to_string(),
  };
  let _ = window.emit(DESKTOP_LIFECYCLE_EVENT, payload);
}

pub fn show_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    emit_lifecycle(&window, "restored-from-tray");
    emit_window_state(&window);
  }
}

pub fn hide_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let _ = window.unminimize();
    let _ = window.hide();
    emit_lifecycle(&window, "hidden-to-tray");
    emit_window_state(&window);
  }
}

pub fn toggle_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let is_visible = window.is_visible().unwrap_or(true);
    let is_minimized = window.is_minimized().unwrap_or(false);

    if is_visible && !is_minimized {
      let _ = window.hide();
      emit_lifecycle(&window, "hidden-to-tray");
    } else {
      let _ = window.unminimize();
      let _ = window.show();
      let _ = window.set_focus();
      emit_lifecycle(&window, "restored-from-tray");
    }

    emit_window_state(&window);
  }
}

pub fn desktop_window_state(app: AppHandle) -> Result<DesktopWindowState, String> {
  main_window(&app).map(|window| collect_window_state(&window))
}
