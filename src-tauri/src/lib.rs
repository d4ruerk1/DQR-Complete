use tauri::{AppHandle, Emitter};

pub mod core;

use crate::core::catalog;
use crate::core::presence::{self, PresencePayload};
use crate::core::process::{self, DummyGameSpec};
use crate::core::system::{self, AppDetectionRule, SpotifyPlayback};

const EVT_PRESENCE_CONNECTING: &str = "drq:presence-connecting";
const EVT_PRESENCE_CONNECTED: &str = "drq:presence-connected";
const EVT_PRESENCE_DISCONNECTED: &str = "drq:presence-disconnected";
const EVT_PRESENCE_ERROR: &str = "drq:presence-error";

#[tauri::command]
async fn set_presence(handle: AppHandle, payload: PresencePayload) -> Result<(), String> {
    let _ = handle.emit(
        EVT_PRESENCE_CONNECTING,
        serde_json::json!({ "client_id": &payload.client_id }),
    );

    match presence::activate_presence(payload.clone()).await {
        Ok(_) => {
            let _ = handle.emit(
                EVT_PRESENCE_CONNECTED,
                serde_json::json!({ "client_id": payload.client_id }),
            );
            Ok(())
        }
        Err(err) => {
            let _ = handle.emit(
                EVT_PRESENCE_ERROR,
                serde_json::json!({ "error": &err }),
            );
            Err(err)
        }
    }
}

#[tauri::command]
async fn clear_presence(handle: AppHandle) -> Result<(), String> {
    presence::deactivate_presence().await?;
    let _ = handle.emit(EVT_PRESENCE_DISCONNECTED, serde_json::json!({}));
    Ok(())
}

#[tauri::command]
fn prepare_dummy_game(handle: AppHandle, spec: DummyGameSpec) -> Result<String, String> {
    process::provision_dummy_environment(&handle, &spec)
}

#[tauri::command]
fn launch_dummy_game(handle: AppHandle, spec: DummyGameSpec) -> Result<String, String> {
    process::launch_dummy_process(&handle, &spec)
}

#[tauri::command]
fn terminate_dummy_game(binary_name: String) -> Result<(), String> {
    process::stop_dummy_process(&binary_name)
}

#[tauri::command]
async fn fetch_catalog_online(handle: AppHandle) -> Result<String, String> {
    catalog::fetch_discord_catalog(&handle).await
}

#[tauri::command]
fn load_cached_catalog(handle: AppHandle) -> Result<String, String> {
    catalog::load_local_catalog(&handle)
}

#[tauri::command]
fn get_catalog_cache_metadata(handle: AppHandle) -> Result<Option<u64>, String> {
    catalog::get_cache_timestamp(&handle)
}

#[tauri::command]
fn detect_system_apps(rules: Vec<AppDetectionRule>) -> Result<Vec<String>, String> {
    Ok(system::detect_applications(rules))
}

#[tauri::command]
fn get_spotify_playback() -> Result<Option<SpotifyPlayback>, String> {
    system::read_spotify_playback()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            set_presence,
            clear_presence,
            prepare_dummy_game,
            launch_dummy_game,
            terminate_dummy_game,
            fetch_catalog_online,
            load_cached_catalog,
            get_catalog_cache_metadata,
            detect_system_apps,
            get_spotify_playback,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DRQ Complete application");
}
