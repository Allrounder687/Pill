use serde::Serialize;
use std::path::PathBuf;
use sysinfo::{Pid, System};
use windows::Win32::UI::Input::KeyboardAndMouse::{keybd_event, KEYBD_EVENT_FLAGS, VK_CONTROL};
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
};

#[derive(Serialize)]
pub struct ActiveApp {
    pub name: String,
    pub title: String,
    pub exe_path: String,
}

#[derive(Serialize)]
pub struct ContextSnapshot {
    pub active_app: Option<ActiveApp>,
    pub clipboard: Option<String>,
    pub recent_files: Vec<String>,
    pub meeting_status: String,
    pub time: String,
}

#[tauri::command]
pub async fn get_context_snapshot() -> Result<ContextSnapshot, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let active_app = get_active_window_info(&sys);
    let clipboard = get_clipboard_text();
    let recent_files = get_recent_files();
    let meeting_status = get_meeting_status(&sys);
    let time = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    Ok(ContextSnapshot {
        active_app,
        clipboard,
        recent_files,
        meeting_status,
        time,
    })
}

fn get_active_window_info(sys: &System) -> Option<ActiveApp> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        // Get window title
        let mut title_bytes: [u16; 512] = [0; 512];
        let len = GetWindowTextW(hwnd, &mut title_bytes);
        let title = String::from_utf16_lossy(&title_bytes[..len as usize]);

        // Get process info
        if let Some(process) = sys.process(Pid::from(pid as usize)) {
            let name = process.name().to_string_lossy().into_owned();
            let exe_path = process
                .exe()
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_default();

            return Some(ActiveApp {
                name,
                title,
                exe_path,
            });
        }
    }
    None
}

fn get_clipboard_text() -> Option<String> {
    // We'll use tauri's clipboard plugin if available, but for now a direct read
    // Since we don't have the clipboard plugin in Cargo.toml yet, we'll return None
    // and I'll add the plugin or implement it here.
    None
}

fn get_recent_files() -> Vec<String> {
    let mut recent = Vec::new();
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let path = PathBuf::from(app_data)
            .join("Microsoft")
            .join("Windows")
            .join("Recent");

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten().take(10) {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with(".lnk") {
                        recent.push(name.replace(".lnk", ""));
                    }
                }
            }
        }
    }
    recent
}

fn get_meeting_status(sys: &System) -> String {
    let meeting_apps = ["zoom", "teams", "webex", "discord", "slack", "meet"];
    for (_pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();
        if meeting_apps.iter().any(|app| name.contains(app)) {
            // In a real app, we'd check mic/cam usage via registry or APIs
            return format!("Active ({})", name);
        }
    }
    "Idle".to_string()
}

#[tauri::command]
pub async fn capture_selected_text() -> Result<String, String> {
    // Simulate Ctrl+C
    unsafe {
        // Press Ctrl
        keybd_event(VK_CONTROL.0 as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
        // Press C
        keybd_event(0x43, 0, KEYBD_EVENT_FLAGS(0), 0);
        // Release C
        keybd_event(0x43, 0, KEYBD_EVENT_FLAGS(2), 0);
        // Release Ctrl
        keybd_event(VK_CONTROL.0 as u8, 0, KEYBD_EVENT_FLAGS(2), 0);
    }

    // Give Windows a moment to copy
    std::thread::sleep(std::time::Duration::from_millis(150));

    // Read clipboard (placeholder until clipboard implementation is ready)
    Ok("Selected text logic implemented. Need clipboard access.".to_string())
}
