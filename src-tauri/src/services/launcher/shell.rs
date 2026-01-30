use std::os::windows::process::CommandExt;
use std::process::Command;
// use windows::core::*;
// use windows::Win32::UI::Shell::*;

pub fn launch_uwp(app_id: &str) -> std::result::Result<(), String> {
    println!("[Shell] Launching via protocol: {}", app_id);

    // Check if it's already a full protocol or needs shell:appsFolder
    let command_str = if app_id.contains(':') && !app_id.contains('\\') {
        app_id.to_string()
    } else {
        format!("shell:appsFolder\\{}", app_id)
    };

    Command::new("cmd")
        .args(&["/C", "start", "", &command_str])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// In a full implementation, this would use IShellFolder to enumerate
/// the virtual Applications folder (FOLDERID_AppsFolder).
pub fn _get_start_apps() -> Vec<super::AppEntry> {
    Vec::new()
}
