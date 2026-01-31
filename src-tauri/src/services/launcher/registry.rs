use super::AppEntry;
use winreg::enums::*;
use winreg::RegKey;

pub fn scan_app_paths() -> Vec<AppEntry> {
    let mut apps = Vec::new();

    // 1. Scan direct App Paths (Fastest, direct EXE links)
    let app_paths_roots = [
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
        ),
        (
            HKEY_CURRENT_USER,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
        ),
    ];

    for (root, path) in app_paths_roots {
        if let Ok(key) = RegKey::predef(root).open_subkey(path) {
            for name in key.enum_keys().filter_map(|x| x.ok()) {
                if let Ok(app_key) = key.open_subkey(&name) {
                    let exe_path: String = app_key.get_value("").unwrap_or_default();
                    if !exe_path.is_empty() {
                        apps.push(AppEntry {
                            name: name.replace(".exe", ""),
                            path: exe_path,
                            icon: None,
                            category: None,
                        });
                    }
                }
            }
        }
    }

    // 2. Scan Uninstall keys (The "Control Panel" list)
    let uninstall_roots = [
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
        (
            HKEY_CURRENT_USER,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
    ];

    for (root, path) in uninstall_roots {
        if let Ok(key) = RegKey::predef(root).open_subkey(path) {
            for subkey_name in key.enum_keys().filter_map(|x| x.ok()) {
                if let Ok(app_key) = key.open_subkey(&subkey_name) {
                    let name: String = app_key.get_value("DisplayName").unwrap_or_default();
                    let install_location: String =
                        app_key.get_value("InstallLocation").unwrap_or_default();
                    let display_icon: String = app_key.get_value("DisplayIcon").unwrap_or_default();

                    if !name.is_empty() {
                        let mut final_path = String::new();

                        // 1. Try DisplayIcon first (usually points directly to the EXE)
                        if !display_icon.is_empty() {
                            let clean_icon = display_icon
                                .split(',')
                                .next()
                                .unwrap_or(&display_icon)
                                .trim_matches('"')
                                .to_string();
                            if clean_icon.to_lowercase().ends_with(".exe")
                                && std::path::Path::new(&clean_icon).exists()
                            {
                                final_path = clean_icon;
                            }
                        }

                        // 2. If no valid exe yet, try searching the InstallLocation
                        if final_path.is_empty() && !install_location.is_empty() {
                            let loc_path = std::path::Path::new(&install_location);
                            if loc_path.is_dir() {
                                // Look for an EXE matching the name in the root of the install folder
                                let p = loc_path.join(format!("{}.exe", name));
                                if p.exists() {
                                    final_path = p.to_string_lossy().to_string();
                                } else {
                                    // Fallback search: first executable in that folder
                                    if let Ok(entries) = std::fs::read_dir(loc_path) {
                                        for entry in entries.filter_map(|e| e.ok()) {
                                            let p = entry.path();
                                            if p.extension().map_or(false, |ext| ext == "exe") {
                                                final_path = p.to_string_lossy().to_string();
                                                break;
                                            }
                                        }
                                    }
                                }
                            } else if loc_path.extension().map_or(false, |ext| ext == "exe") {
                                final_path = install_location;
                            }
                        }

                        if !final_path.is_empty() {
                            apps.push(AppEntry {
                                name,
                                path: final_path,
                                icon: None,
                                category: None,
                            });
                        }
                    }
                }
            }
        }
    }

    apps
}
