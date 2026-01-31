use super::{registry, AppEntry};
use std::collections::HashSet;
use std::path::PathBuf;
use walkdir::WalkDir;

fn clean_app_name(name: &str) -> String {
    name.replace(".exe", "")
        .replace("_x64", "")
        .replace("_x86", "")
        .replace("-x64", "")
        .replace(" (x64)", "")
        .replace(" (x86)", "")
        .trim()
        .to_string()
}

fn is_noise(name: &str, _path: &str) -> bool {
    let name_lower = name.to_lowercase();

    let noise_keywords = [
        "uninstall",
        "redist",
        "setup",
        "vcredist",
        "dxsetup",
        "touchup",
        "crashhandler",
        "unins000",
        "unitycrashhandler",
        "report",
        "crashpad",
        "util",
        "handler",
        "helper",
        "worker",
        "overlay",
        "browser",
        "telemetry",
        "proxy",
        "debug",
        "sdk",
        "tools",
        "manager",
        "service",
        "identity",
    ];

    // Special whitelist for popular games/apps that might contain noise words
    let whitelist = ["football manager", "manager of", "sdk game", "midnightpad"];

    let is_noise_word = noise_keywords.iter().any(|&k| name_lower.contains(k));
    let is_whitelisted = whitelist.iter().any(|&w| name_lower.contains(w));

    is_noise_word && !is_whitelisted
}

pub fn scan_all() -> Vec<AppEntry> {
    let mut apps: Vec<AppEntry> = Vec::new();
    let mut seen_paths: HashSet<String> = HashSet::new();
    let mut seen_names: HashSet<String> = HashSet::new();

    // 1. Registry Scan with filtering
    for mut app in registry::scan_app_paths() {
        app.name = clean_app_name(&app.name);
        let name_lower = app.name.to_lowercase();
        let path_lower = app.path.to_lowercase();

        if is_noise(&app.name, &app.path) {
            continue;
        }

        if !seen_paths.contains(&path_lower) && !seen_names.contains(&name_lower) {
            seen_paths.insert(path_lower);
            seen_names.insert(name_lower);
            apps.push(app);
        }
    }

    // 2. Drive Scan Roots
    let mut roots = vec![
        PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"),
        dirs_2::config_dir()
            .unwrap_or_default()
            .join(r"Microsoft\Windows\Start Menu\Programs"),
    ];

    if let Ok(drives) = get_all_drives() {
        for drive in drives {
            let drive_path = PathBuf::from(&drive);
            let common_game_roots = [
                "Games",
                "XboxGames",
                "Epic Games",
                "GOG Games",
                "SteamLibrary/steamapps/common",
                "Program Files/Steam/steamapps/common",
                "Program Files (x86)/Steam/steamapps/common",
            ];
            for sub in common_game_roots {
                let p = drive_path.join(sub);
                if p.exists() {
                    roots.push(p);
                }
            }
        }
    }

    for root in roots {
        if !root.exists() {
            continue;
        }

        let root_str = root.to_string_lossy().to_lowercase();
        let is_game_lib = root_str.contains("games")
            || root_str.contains("steamapps")
            || root_str.contains("xbox");

        for entry in WalkDir::new(root)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");

            if ext == "lnk" || ext == "exe" {
                let raw_name = path.file_stem().unwrap().to_string_lossy().to_string();
                let name = clean_app_name(&raw_name);
                let path_str = path.to_string_lossy().to_string();

                if is_noise(&name, &path_str) {
                    continue;
                }

                if ext == "exe" {
                    let size = entry.metadata().ok().map(|m| m.len()).unwrap_or(0);
                    // Special case for MidnightPad - allow its small EXE but block others
                    if size < 3_500_000 && !name.to_lowercase().contains("midnight") {
                        continue;
                    }
                }

                let name_lower = name.to_lowercase();
                let path_lower = path_str.to_lowercase();

                if !seen_paths.contains(&path_lower) && !seen_names.contains(&name_lower) {
                    let is_launcher = name_lower.contains("launcher")
                        || name_lower == "steam"
                        || name_lower == "epic games"
                        || name_lower == "riot client"
                        || name_lower.contains("client");

                    let is_in_game_lib = is_game_lib
                        || path_lower.contains("steamapps")
                        || path_lower.contains("games")
                        || path_lower.contains("xbox");

                    let category = if is_launcher {
                        Some("launcher".to_string())
                    } else if is_in_game_lib {
                        Some("game".to_string())
                    } else {
                        None
                    };

                    apps.push(AppEntry {
                        name,
                        path: path_str,
                        icon: None,
                        category,
                    });
                    seen_paths.insert(path_lower);
                    seen_names.insert(name_lower);
                }
            }
        }
    }

    apps
}

fn get_all_drives() -> Result<Vec<String>, String> {
    use std::process::Command;
    let output = Command::new("wmic")
        .args(&["logicaldisk", "get", "name"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let drives = stdout
        .lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.trim().to_string() + "\\")
        .collect();
    Ok(drives)
}

// Internal helper for directories since 'dirs' crate might not be available
mod dirs_2 {
    use std::path::PathBuf;
    pub fn config_dir() -> Option<PathBuf> {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }
}
