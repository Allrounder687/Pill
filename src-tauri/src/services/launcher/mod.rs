use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::Manager;

pub mod registry;
pub mod scanner;
pub mod shell;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppEntry {
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
    pub category: Option<String>,
}

pub struct LauncherState {
    pub _apps: Arc<Vec<AppEntry>>,
}

#[tauri::command]
pub async fn get_apps() -> Vec<AppEntry> {
    scanner::scan_all()
}

#[tauri::command]
pub async fn launch_app(path: String) -> Result<(), String> {
    println!("[Launcher] Launching: {}", path);

    // 1. Try UWP/Protocol first
    if path.contains("!") || !path.contains("\\") {
        if let Ok(_) = shell::launch_uwp(&path) {
            return Ok(());
        }
    }

    // 2. Try opener (Standard method)
    match opener::open(&path) {
        Ok(_) => return Ok(()),
        Err(e) => {
            println!(
                "[Launcher] Opener failed: {}, trying manual cmd start...",
                e
            );
        }
    }

    // 3. Last resort fallback: Manual shell start
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    Command::new("cmd")
        .args(&["/C", "start", "", &path])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("All launch methods failed: {}", e))
}

pub fn init<R: tauri::Runtime>(app: &mut tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let apps = scanner::scan_all();
    app.manage(LauncherState {
        _apps: Arc::new(apps),
    });
    Ok(())
}
