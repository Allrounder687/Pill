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
            println!(
                "[System] Killed process: {:?} (PID: {})",
                process.name(),
                pid
            );
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
pub async fn kill_process_tree(pid: u32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let target_pid = Pid::from(pid as usize);
    let mut to_kill = vec![target_pid];
    let mut i = 0;

    // Breadth-first search for all descendants
    while i < to_kill.len() {
        let current_parent = to_kill[i];
        for (p, proc) in sys.processes() {
            if let Some(parent) = proc.parent() {
                if parent == current_parent {
                    if !to_kill.contains(p) {
                        to_kill.push(*p);
                    }
                }
            }
        }
        i += 1;
    }

    let mut killed_count = 0;
    // Kill in reverse order (children first)
    for p in to_kill.iter().rev() {
        if let Some(proc) = sys.process(*p) {
            proc.kill();
            killed_count += 1;
        }
    }

    println!(
        "[System] Terminated process tree for PID {}. Total processes: {}",
        pid, killed_count
    );
    Ok(true)
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
    use base64::{engine::general_purpose, Engine as _};
    use windows::core::PCWSTR;
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, GetDC, GetDIBits, ReleaseDC, SelectObject, BITMAPINFO,
        BITMAPINFOHEADER, DIB_RGB_COLORS,
    };
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};

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

        let h_icon = shfi.hIcon;
        let mut icon_info = ICONINFO::default();
        if GetIconInfo(h_icon, &mut icon_info).is_err() {
            let _ = DestroyIcon(h_icon);
            return Err("Failed to get icon info".to_string());
        }

        let h_bmp = icon_info.hbmColor;
        let h_dc_screen = GetDC(None);
        let h_dc_mem = CreateCompatibleDC(h_dc_screen);
        let h_old_bmp = SelectObject(h_dc_mem, h_bmp);

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: 48,
                biHeight: -48, // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: 0, // BI_RGB
                ..Default::default()
            },
            ..Default::default()
        };

        let mut buffer = vec![0u8; 48 * 48 * 4];
        let lines = GetDIBits(
            h_dc_mem,
            h_bmp,
            0,
            48,
            Some(buffer.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        // Cleanup
        SelectObject(h_dc_mem, h_old_bmp);
        let _ = DeleteDC(h_dc_mem);
        ReleaseDC(None, h_dc_screen);
        let _ = windows::Win32::Graphics::Gdi::DeleteObject(icon_info.hbmColor);
        let _ = windows::Win32::Graphics::Gdi::DeleteObject(icon_info.hbmMask);
        let _ = DestroyIcon(h_icon);

        if lines == 0 {
            return Err("Failed to get bits".to_string());
        }

        // Buffer is currently in BGRA (standard GDI format)
        // We'll return it as a string prefix identifying the format
        let b64 = general_purpose::STANDARD.encode(&buffer);
        Ok(format!("icon-bgra:{}", b64))
    }
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
