use windows::Win32::UI::Input::KeyboardAndMouse::{
    keybd_event, KEYBD_EVENT_FLAGS, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK,
    VK_MEDIA_STOP, VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
};

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
