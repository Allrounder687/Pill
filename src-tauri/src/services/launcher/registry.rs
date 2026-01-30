use super::AppEntry;
use winreg::enums::*;
use winreg::RegKey;

pub fn scan_app_paths() -> Vec<AppEntry> {
    let mut apps = Vec::new();
    let roots = [
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
        ),
        (
            HKEY_CURRENT_USER,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
        ),
    ];

    for (root, path) in roots {
        if let Ok(key) = RegKey::predef(root).open_subkey(path) {
            for name in key.enum_keys().filter_map(|x| x.ok()) {
                if let Ok(app_key) = key.open_subkey(&name) {
                    let exe_path: String = app_key.get_value("").unwrap_or_default();
                    if !exe_path.is_empty() {
                        apps.push(AppEntry {
                            name: name.replace(".exe", ""),
                            path: exe_path,
                            icon: None,
                        });
                    }
                }
            }
        }
    }
    apps
}
