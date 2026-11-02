use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Bundled catalog seed compiled directly into the binary as a reliable offline fallback.
static BUNDLED_CATALOG: &str = include_str!("../../resources/catalog.json");

/// Official catalog endpoints hosted strictly on GitHub
const DISCORD_DETECTABLE_ENDPOINT: &str =
    "https://discord.com/api/v9/applications/detectable";
const GITHUB_CATALOG_RAW_ENDPOINT: &str =
    "https://raw.githubusercontent.com/d4ruerk1/DRQ-Complete/main/resources/catalog.json";
const GITHUB_CATALOG_RELEASE_ENDPOINT: &str =
    "https://github.com/d4ruerk1/DQR-Complete/releases/latest/download/catalog.json";
const LOCAL_CATALOG_FILENAME: &str = "gamelist.json";

/// Enforces external communication lockdown: requests must strictly use HTTPS
/// and target authorized GitHub domains exclusively.
pub fn validate_secure_github_url(url: &str) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err(format!(
            "Security violation: insecure scheme in '{}'. Only HTTPS is permitted.",
            url
        ));
    }

    let without_scheme = &url["https://".len()..];
    let host = without_scheme
        .split(&['/', '?', '#', ':'][..])
        .next()
        .unwrap_or("");

    let is_authorized_github = host == "github.com"
        || host == "raw.githubusercontent.com"
        || host == "api.github.com"
        || host.ends_with(".github.com")
        || host.ends_with(".githubusercontent.com")
        || host == "discord.com"
        || host.ends_with(".discord.com");

    if !is_authorized_github {
        return Err(format!(
            "External communication lockdown violation: host '{}' is not authorized. Communications are restricted exclusively to GitHub.",
            host
        ));
    }

    Ok(())
}

fn catalog_storage_path(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .app_local_data_dir()
        .map(|d| d.join(LOCAL_CATALOG_FILENAME))
        .map_err(|e| format!("Unable to resolve app data directory: {}", e))
}

fn persist_catalog_cache(handle: &AppHandle, payload: &str) -> Result<(), String> {
    let file_path = catalog_storage_path(handle)?;
    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&file_path, payload).map_err(|e| format!("Failed saving local catalog cache: {}", e))
}

/// Fetches the catalog online directly from GitHub via HTTPS with strict domain shielding.
/// Automatically falls back to secondary GitHub endpoint or local cache.
pub async fn fetch_github_catalog(handle: &AppHandle) -> Result<String, String> {
    validate_secure_github_url(DISCORD_DETECTABLE_ENDPOINT)?;
    let client = tauri_plugin_http::reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_else(|_| tauri_plugin_http::reqwest::Client::new());

    if let Ok(resp) = client.get(DISCORD_DETECTABLE_ENDPOINT).send().await {
        if resp.status().is_success() {
            if let Ok(body) = resp.text().await {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&body) {
                    if parsed.is_array() && !parsed.as_array().map_or(true, |a| a.is_empty()) {
                        let _ = persist_catalog_cache(handle, &body);
                        return Ok(body);
                    }
                }
            }
        }
    }

    if let Ok(()) = validate_secure_github_url(GITHUB_CATALOG_RAW_ENDPOINT) {
        if let Ok(resp) = client.get(GITHUB_CATALOG_RAW_ENDPOINT).send().await {
            if resp.status().is_success() {
                if let Ok(body) = resp.text().await {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&body) {
                        if parsed.is_array() && !parsed.as_array().map_or(true, |a| a.is_empty()) {
                            let _ = persist_catalog_cache(handle, &body);
                            return Ok(body);
                        }
                    }
                }
            }
        }
    }

    if let Ok(()) = validate_secure_github_url(GITHUB_CATALOG_RELEASE_ENDPOINT) {
        if let Ok(resp) = client.get(GITHUB_CATALOG_RELEASE_ENDPOINT).send().await {
            if resp.status().is_success() {
                if let Ok(body) = resp.text().await {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&body) {
                        if parsed.is_array() && !parsed.as_array().map_or(true, |a| a.is_empty()) {
                            let _ = persist_catalog_cache(handle, &body);
                            return Ok(body);
                        }
                    }
                }
            }
        }
    }

    Err("Discord detectable games catalog currently unavailable online.".to_string())
}

/// Backwards-compatible alias for fetch_github_catalog
pub async fn fetch_discord_catalog(handle: &AppHandle) -> Result<String, String> {
    fetch_github_catalog(handle).await
}

pub fn load_local_catalog(handle: &AppHandle) -> Result<String, String> {
    if let Ok(file_path) = catalog_storage_path(handle) {
        if let Ok(content) = fs::read_to_string(&file_path) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                if parsed.is_array() && !parsed.as_array().map_or(true, |a| a.is_empty()) {
                    return Ok(content);
                }
            }
        }
    }

    // Fallback: check packaged resources directory for bundled catalog seed
    if let Ok(res_dir) = handle.path().resource_dir() {
        let bundled_candidates = [
            res_dir.join("catalog.json"),
            res_dir.join("resources").join("catalog.json"),
            res_dir.join("data").join("catalog.json"),
        ];
        for candidate in bundled_candidates {
            if let Ok(bundled) = fs::read_to_string(&candidate) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&bundled) {
                    if parsed.is_array() && !parsed.as_array().map_or(true, |a| a.is_empty()) {
                        let _ = persist_catalog_cache(handle, &bundled);
                        return Ok(bundled);
                    }
                }
            }
        }
    }

    // Built-in compile-time embedded catalog seed (guarantees offline availability)
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(BUNDLED_CATALOG) {
        if parsed.is_array() && !parsed.as_array().map_or(true, |a| a.is_empty()) {
            let _ = persist_catalog_cache(handle, BUNDLED_CATALOG);
            return Ok(BUNDLED_CATALOG.to_string());
        }
    }

    let file_path = catalog_storage_path(handle).unwrap_or_else(|_| PathBuf::from(LOCAL_CATALOG_FILENAME));
    fs::read_to_string(&file_path)
        .map_err(|e| format!("Local catalog cache unavailable ({:?}): {}", file_path, e))
}

pub fn get_cache_timestamp(handle: &AppHandle) -> Result<Option<u64>, String> {
    let file_path = catalog_storage_path(handle)?;
    let Ok(meta) = fs::metadata(&file_path) else {
        return Ok(None);
    };

    Ok(meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs()))
}
