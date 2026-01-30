mod services;
use services::launcher;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_window(
    app_handle: tauri::AppHandle,
    label: String,
    title: String,
    url: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&label) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    let window_builder =
        tauri::WebviewWindowBuilder::new(&app_handle, &label, tauri::WebviewUrl::App(url.into()))
            .title(title)
            .inner_size(width, height)
            .decorations(label == "settings")
            .transparent(label != "settings")
            .center();

    match window_builder.build() {
        Ok(window) => {
            let _ = window.show();
            let _ = window.set_focus();

            #[cfg(target_os = "macos")]
            let _ = apply_vibrancy(&window, NSVisualEffectMaterial::AppearanceBased, None, None);
            Ok(())
        }
        Err(e) => Err(format!("Failed to build window: {}", e)),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(move |app| {
            // 1. Create Tray Menu
            let quit_i = MenuItem::with_id(app, "quit", "Quit Jarvis", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Jarvis", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // 2. Setup Tray Icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::DoubleClick {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 3. Init Services
            launcher::init(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_window,
            launcher::get_apps,
            launcher::launch_app,
            services::system::system_media_control
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: win_event,
                ..
            } = event
            {
                if let tauri::WindowEvent::CloseRequested { api, .. } = win_event {
                    if label == "main" {
                        let _ = app_handle.get_webview_window("main").unwrap().hide();
                        api.prevent_close();
                    }
                }
            }
        });
}
