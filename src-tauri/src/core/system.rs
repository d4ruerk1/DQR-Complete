use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize)]
pub struct AppDetectionRule {
    pub key: String,
    pub binaries: Vec<String>,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SpotifyPlayback {
    pub artist: String,
    pub title: String,
}

fn expand_template_path(raw: &str) -> PathBuf {
    let mut resolved = raw.to_string();

    // Windows %ENV% expansion
    loop {
        let Some(start) = resolved.find('%') else { break };
        let Some(offset) = resolved[start + 1..].find('%') else { break };
        let end = start + 1 + offset;
        let var_name = &resolved[start + 1..end];
        let val = env::var(var_name).unwrap_or_default();
        resolved = format!("{}{}{}", &resolved[..start], val, &resolved[end + 1..]);
    }

    // Unix ~ home expansion
    if let Some(rest) = resolved.strip_prefix("~/") {
        if let Ok(home) = env::var("HOME").or_else(|_| env::var("USERPROFILE")) {
            resolved = format!("{}/{}", home, rest);
        }
    }

    PathBuf::from(resolved)
}

fn binary_in_path(name: &str) -> bool {
    let mut search_paths: Vec<PathBuf> = env::var_os("PATH")
        .map(|val| env::split_paths(&val).collect())
        .unwrap_or_default();

    #[cfg(target_os = "linux")]
    {
        search_paths.extend([
            PathBuf::from("/usr/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/bin"),
            PathBuf::from("/snap/bin"),
            PathBuf::from("/var/lib/flatpak/exports/bin"),
        ]);
        if let Ok(home) = env::var("HOME") {
            search_paths.push(PathBuf::from(format!("{}/.local/bin", home)));
            search_paths.push(PathBuf::from(format!(
                "{}/.local/share/flatpak/exports/bin",
                home
            )));
        }
    }

    #[cfg(target_os = "macos")]
    {
        search_paths.extend([
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/opt/homebrew/bin"),
        ]);
    }

    search_paths.iter().any(|dir| dir.join(name).is_file())
}

pub fn detect_applications(rules: Vec<AppDetectionRule>) -> Vec<String> {
    let mut matched = Vec::new();
    for rule in rules {
        let found = rule.binaries.iter().any(|b| binary_in_path(b))
            || rule.paths.iter().any(|p| expand_template_path(p).exists());
        if found {
            matched.push(rule.key);
        }
    }
    matched
}

pub fn read_spotify_playback() -> Result<Option<SpotifyPlayback>, String> {
    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("playerctl")
            .args(["-p", "spotify", "metadata", "--format", "{{artist}}\t{{title}}"])
            .output()
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    "playerctl not installed on system".to_string()
                } else {
                    format!("playerctl error: {}", e)
                }
            })?;

        if !output.status.success() {
            return Ok(None);
        }

        let raw = String::from_utf8_lossy(&output.stdout);
        let mut segments = raw.trim_end().splitn(2, '\t');
        let artist = segments.next().unwrap_or("").trim().to_string();
        let title = segments.next().unwrap_or("").trim().to_string();

        if title.is_empty() {
            Ok(None)
        } else {
            Ok(Some(SpotifyPlayback { artist, title }))
        }
    }

    #[cfg(target_os = "macos")]
    {
        let script = r#"if application "Spotify" is running then
    tell application "Spotify"
        if player state is playing or player state is paused then
            return (get artist of current track) & tab & (get name of current track)
        end if
    end tell
end if"#;
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("osascript failed: {}", e))?;

        if !output.status.success() {
            return Ok(None);
        }

        let raw = String::from_utf8_lossy(&output.stdout);
        let mut segments = raw.trim_end().splitn(2, '\t');
        let artist = segments.next().unwrap_or("").trim().to_string();
        let title = segments.next().unwrap_or("").trim().to_string();

        if title.is_empty() {
            Ok(None)
        } else {
            Ok(Some(SpotifyPlayback { artist, title }))
        }
    }

    #[cfg(target_os = "windows")]
    {
        Ok(None)
    }
}
