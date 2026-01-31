use sysinfo::{Pid, System};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    keybd_event, KEYBD_EVENT_FLAGS, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK,
    VK_MEDIA_STOP, VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
};

#[derive(serde::Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
}

#[tauri::command]
pub async fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().into_owned(),
            cpu_usage: process.cpu_usage(),
            memory: process.memory(),
        })
        .collect();

    // Sort by CPU usage descending
    processes.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap());

    Ok(processes)
}

#[tauri::command]
pub async fn kill_process_by_name(name: String) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let target = name.to_lowercase();
    let mut killed = false;

    for (pid, process) in sys.processes() {
        let p_name = process.name().to_string_lossy().to_lowercase();
        if p_name.contains(&target) || target.contains(&p_name) {
            process.kill();
            println!("[System] Killed process: {:?} (PID: {})", process.name(), pid);
            killed = true;
        }
    }

    if killed {
        Ok(true)
    } else {
        Err(format!("No process found matching '{}'", name))
    }
}

#[tauri::command]
pub async fn kill_process_by_pid(pid: u32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    if let Some(process) = sys.process(Pid::from(pid as usize)) {
        process.kill();
        println!("[System] Killed process PID: {}", pid);
        Ok(true)
    } else {
        Err(format!("Process with PID {} not found", pid))
    }
}

#[tauri::command]
pub async fn system_media_control(action: String, repeat: Option<u32>) -> Result<(), String> {
    println!(
        "[System] Media Control: {} (x{})",
        action,
        repeat.unwrap_or(1)
    );

    let vk = match action.as_str() {
        "volume_up" => VK_VOLUME_UP,
        "volume_down" => VK_VOLUME_DOWN,
        "volume_mute" => VK_VOLUME_MUTE,
        "play_pause" => VK_MEDIA_PLAY_PAUSE,
        "next" => VK_MEDIA_NEXT_TRACK,
        "prev" => VK_MEDIA_PREV_TRACK,
        "stop" => VK_MEDIA_STOP,
        _ => return Err(format!("Unknown media action: {}", action)),
    };

    let count = repeat.unwrap_or(1);

    unsafe {
        for _ in 0..count {
            // Press
            keybd_event(vk.0 as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
            // Release
            keybd_event(vk.0 as u8, 0, KEYBD_EVENT_FLAGS(2), 0);
            // Small delay to ensure Windows registers the key
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_app_icon(path: String) -> Result<String, String> {
    use windows::core::PCWSTR;
    use windows::Win32::UI::Shell::SHGetFileInfoW;
    use windows::Win32::UI::Shell::SHFILEINFOW;
    use windows::Win32::UI::Shell::SHGFI_ICON;
    use windows::Win32::UI::Shell::SHGFI_LARGEICON;
    use windows::Win32::UI::WindowsAndMessaging::DestroyIcon;

    let mut shfi = SHFILEINFOW::default();
    let wide_path: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();

    unsafe {
        let result = SHGetFileInfoW(
            PCWSTR(wide_path.as_ptr()),
            windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );

        if result == 0 || shfi.hIcon.is_invalid() {
            return Err("Failed to extract icon".to_string());
        }

        DestroyIcon(shfi.hIcon);
    }

    Ok(path)
}

#[tauri::command]
pub async fn get_youtube_video_id(
    query: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let key = api_key
        .or_else(|| std::env::var("YOUTUBE_API_KEY").ok())
        .ok_or_else(|| "YouTube API Key not provided. Please set it in Settings.".to_string())?;

    let encoded_query = urlencoding::encode(&query);
    let url = format!(
        "https://www.googleapis.com/youtube/v3/search?part=snippet&q={}&type=video&maxResults=1&key={}",
        encoded_query, key
    );

    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to call YouTube API: {}", e))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse YouTube API response: {}", e))?;

    let video_id = json["items"][0]["id"]["videoId"]
        .as_str()
        .ok_or_else(|| "No video results found for your query.".to_string())?;

    Ok(video_id.to_string())
}

