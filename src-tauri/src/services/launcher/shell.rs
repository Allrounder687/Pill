use std::os::windows::process::CommandExt;
use std::process::Command;
// use windows::core::*;
// use windows::Win32::UI::Shell::*;

pub fn launch_uwp(app_id: &str) -> std::result::Result<(), String> {
    println!("[Shell] Launching via protocol: {}", app_id);

    // Check if it's a protocol, a system command, or has arguments
    let is_protocol = app_id.contains(':');
    let has_args = app_id.contains(' ');
    let is_system = app_id.ends_with(".msc") || app_id.ends_with(".exe");

    let command_str = if is_protocol || has_args || is_system {
        app_id.to_string()
    } else {
        format!("shell:appsFolder\\{}", app_id)
    };

    let mut cmd = Command::new("cmd");
    // If it has spaces (arguments) and isn't a protocol, run it directly via cmd /C
    // Otherwise use 'start' which handles protocols and AppIDs better
    if has_args && !is_protocol {
        cmd.args(&["/C", &command_str]);
    } else {
        cmd.args(&["/C", "start", "", &command_str]);
    }

    cmd.creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// In a full implementation, this would use IShellFolder to enumerate
/// the virtual Applications folder (FOLDERID_AppsFolder).
pub fn _get_start_apps() -> Vec<super::AppEntry> {
    Vec::new()
}
