use super::{registry, AppEntry};
use std::collections::HashSet;
use std::path::PathBuf;
use walkdir::WalkDir;

pub fn scan_all() -> Vec<AppEntry> {
    let mut apps = registry::scan_app_paths();
    let mut seen_paths: HashSet<String> = apps.iter().map(|a| a.path.to_lowercase()).collect();

    // Scan Start Menu folders
    let roots = [
        PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"),
        dirs_2::config_dir()
            .unwrap_or_default()
            .join(r"Microsoft\Windows\Start Menu\Programs"),
    ];

    for root in roots {
        if !root.exists() {
            continue;
        }
        for entry in WalkDir::new(root)
            .max_depth(5)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.path().extension().map_or(false, |ext| ext == "lnk") {
                let name = entry
                    .path()
                    .file_stem()
                    .unwrap()
                    .to_string_lossy()
                    .to_string();
                let path = entry.path().to_string_lossy().to_string();

                if !seen_paths.contains(&path.to_lowercase()) {
                    apps.push(AppEntry {
                        name,
                        path: path.clone(),
                        icon: None,
                    });
                    seen_paths.insert(path.to_lowercase());
                }
            }
        }
    }

    apps
}

// Internal helper for directories since 'dirs' crate might not be available
mod dirs_2 {
    use std::path::PathBuf;
    pub fn config_dir() -> Option<PathBuf> {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }
}
