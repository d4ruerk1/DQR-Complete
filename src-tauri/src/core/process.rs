use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[cfg(target_os = "linux")]
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DummyGameSpec {
    pub app_id: i64,
    pub relative_path: String,
    pub binary_name: String,
    pub title: Option<String>,
}

#[cfg(target_os = "linux")]
static SUPERVISED_CHILDREN: OnceCell<Mutex<HashMap<String, Vec<std::process::Child>>>> =
    OnceCell::new();

#[cfg(target_os = "linux")]
fn child_registry() -> &'static Mutex<HashMap<String, Vec<std::process::Child>>> {
    SUPERVISED_CHILDREN.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn is_safe_relative_path(p: &str) -> bool {
    let path = Path::new(p);
    !p.is_empty()
        && !path.is_absolute()
        && path
            .components()
            .all(|c| matches!(c, Component::Normal(_) | Component::CurDir))
}

pub fn games_storage_root(handle: &AppHandle) -> Result<PathBuf, String> {
    #[cfg(target_os = "linux")]
    {
        handle
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("Failed to determine app local data directory: {}", e))
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = handle;
        let current = env::current_exe().unwrap_or_default();
        Ok(current.parent().map(Path::to_path_buf).unwrap_or_default())
    }
}

fn runner_resource_file() -> &'static str {
    #[cfg(target_os = "windows")]
    return "src-win.exe";

    #[cfg(target_os = "linux")]
    return "src-linux";

    #[cfg(target_os = "macos")]
    return "src-darwin";
}

pub fn locate_runner_template(handle: &AppHandle) -> Result<PathBuf, String> {
    let resolved = handle
        .path()
        .resolve(runner_resource_file(), BaseDirectory::Resource);

    let mut lookup: Vec<PathBuf> = Vec::new();
    if let Ok(p) = &resolved {
        lookup.push(p.clone());
    }

    if let Ok(res_dir) = handle.path().resource_dir() {
        lookup.push(res_dir.join(runner_resource_file()));
        lookup.push(res_dir.join("resources").join(runner_resource_file()));
        lookup.push(res_dir.join("data").join(runner_resource_file()));
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(override_path) = env::var("DRQ_RUNNER_PATH") {
            lookup.insert(0, PathBuf::from(override_path));
        }
        lookup.push(PathBuf::from("/usr/lib/drq-complete/src-linux"));
        lookup.push(PathBuf::from("src-tauri/resources/src-linux"));
        lookup.push(PathBuf::from("resources/src-linux"));
        if let Some(exe_dir) = env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf)) {
            lookup.push(exe_dir.join("src-linux"));
            lookup.push(exe_dir.join("data/src-linux"));
            lookup.push(exe_dir.join("resources/src-linux"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        lookup.push(PathBuf::from("src-tauri/resources/src-win.exe"));
        lookup.push(PathBuf::from("resources/src-win.exe"));
        if let Some(exe_dir) = env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf)) {
            lookup.push(exe_dir.join("src-win.exe"));
            lookup.push(exe_dir.join("resources/src-win.exe"));
            lookup.push(exe_dir.join("data/src-win.exe"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        lookup.push(PathBuf::from("src-tauri/resources/src-darwin"));
        lookup.push(PathBuf::from("resources/src-darwin"));
        if let Some(exe_dir) = env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf)) {
            lookup.push(exe_dir.join("src-darwin"));
            lookup.push(exe_dir.join("resources/src-darwin"));
        }
    }

    if let Some(valid) = lookup.into_iter().find(|p| p.is_file()) {
        return Ok(valid);
    }

    resolved.map_err(|e| format!("Failed to locate runner resource: {}", e))
}

fn is_macos_bundle(name: &str) -> bool {
    cfg!(target_os = "macos") && name.ends_with(".app")
}

fn strip_app_extension(name: &str) -> String {
    name.strip_suffix(".app").unwrap_or(name).to_string()
}

fn build_target_dir(base_dir: &Path, relative_path: &str, app_id: i64) -> PathBuf {
    base_dir
        .join("games")
        .join(app_id.to_string())
        .join(relative_path)
}

fn create_macos_bundle(
    bundle_path: &Path,
    bundle_name: &str,
    display_title: &str,
    template_bin: &Path,
) -> Result<PathBuf, String> {
    let bin_name = strip_app_extension(bundle_name);
    let macos_dir = bundle_path.join("Contents/MacOS");
    fs::create_dir_all(&macos_dir)
        .map_err(|e| format!("Failed to construct macOS bundle directory: {}", e))?;

    let destination = macos_dir.join(&bin_name);
    fs::copy(template_bin, &destination)
        .map_err(|e| format!("Failed to copy runner into macOS bundle: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&destination)
            .map_err(|e| format!("Failed to inspect bundle binary metadata: {}", e))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&destination, perms)
            .map_err(|e| format!("Failed to apply execution mode to bundle binary: {}", e))?;
    }

    let plist_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>{display_title}</string>
    <key>CFBundleExecutable</key>
    <string>{bin_name}</string>
    <key>CFBundleIdentifier</key>
    <string>io.github.d4ruerk1.drqcomplete.dummy</string>
    <key>CFBundleName</key>
    <string>{display_title}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
</dict>
</plist>
"#
    );

    fs::write(bundle_path.join("Contents/Info.plist"), plist_content)
        .map_err(|e| format!("Failed to generate Info.plist: {}", e))?;

    Ok(destination)
}

pub fn provision_dummy_environment(
    handle: &AppHandle,
    spec: &DummyGameSpec,
) -> Result<String, String> {
    if !is_safe_relative_path(&spec.relative_path) || !is_safe_relative_path(&spec.binary_name) {
        return Err(format!(
            "Rejected insecure relative path parameters: {} / {}",
            spec.relative_path, spec.binary_name
        ));
    }

    let storage_dir = games_storage_root(handle)?;
    let target_folder = build_target_dir(&storage_dir, &spec.relative_path, spec.app_id);

    fs::create_dir_all(&target_folder)
        .map_err(|e| format!("Could not initialize game destination folder: {}", e))?;

    let template = locate_runner_template(handle)?;

    if is_macos_bundle(&spec.binary_name) {
        let bundle_dest = target_folder.join(&spec.binary_name);
        let title = spec
            .title
            .as_deref()
            .filter(|t| !t.is_empty())
            .unwrap_or(&spec.binary_name);
        let final_bin = create_macos_bundle(&bundle_dest, &spec.binary_name, title, &template)?;
        return Ok(format!("macOS bundle generated: {:?}", final_bin));
    }

    let final_dest = target_folder.join(&spec.binary_name);
    fs::copy(&template, &final_dest)
        .map_err(|e| format!("Failed copying dummy binary: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(&final_dest)
            .map_err(|e| format!("Failed to read metadata: {}", e))?
            .permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&final_dest, permissions)
            .map_err(|e| format!("Failed setting file permissions: {}", e))?;
    }

    Ok(format!("Dummy executable provisioned at: {:?}", final_dest))
}

pub fn launch_dummy_process(handle: &AppHandle, spec: &DummyGameSpec) -> Result<String, String> {
    if !is_safe_relative_path(&spec.relative_path) || !is_safe_relative_path(&spec.binary_name) {
        return Err("Insecure path argument rejected".to_string());
    }

    let storage_dir = games_storage_root(handle)?;
    let target_folder = build_target_dir(&storage_dir, &spec.relative_path, spec.app_id);
    let title = spec.title.as_deref().unwrap_or(&spec.binary_name);

    if is_macos_bundle(&spec.binary_name) {
        #[cfg(target_os = "macos")]
        {
            let bundle_path = target_folder.join(&spec.binary_name);
            let mut open_cmd = std::process::Command::new("open");
            open_cmd
                .arg("-n")
                .arg("-g")
                .arg("-a")
                .arg(&bundle_path)
                .arg("--args")
                .arg("--title")
                .arg(title);
            open_cmd
                .spawn()
                .map_err(|e| format!("Failed launching macOS bundle: {}", e))?;
            return Ok("Bundle opened successfully".to_string());
        }
        #[cfg(not(target_os = "macos"))]
        {
            return Err("macOS bundle execution requires macOS host".to_string());
        }
    }

    let exec_path = target_folder.join(&spec.binary_name);
    let mut command = std::process::Command::new(&exec_path);
    command.args(["--title", title]).current_dir(&target_folder);

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }

    #[cfg(target_os = "linux")]
    {
        command
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());

        match command.spawn() {
            Ok(child) => {
                child_registry()
                    .lock()
                    .unwrap()
                    .entry(spec.binary_name.clone())
                    .or_default()
                    .push(child);
                Ok("Process spawned and registered".to_string())
            }
            Err(e) => Err(format!(
                "Failed to spawn runner binary {:?}: {}",
                exec_path, e
            )),
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        match command.spawn() {
            Ok(_) => Ok("Process spawned successfully".to_string()),
            Err(e) => Err(format!("Failed starting executable: {}", e)),
        }
    }
}

pub fn stop_dummy_process(binary_name: &str) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let tracked = child_registry()
            .lock()
            .unwrap()
            .remove(binary_name)
            .unwrap_or_default();
        for mut child in tracked {
            let _ = child.kill();
            let _ = child.wait();
        }
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("taskkill")
            .arg("/F")
            .arg("/IM")
            .arg(binary_name)
            .output()
            .map_err(|e| format!("Taskkill invocation failed: {}", e))?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!(
                "Failed stopping process {}: {}",
                binary_name,
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    #[cfg(target_os = "macos")]
    {
        let proc_name = strip_app_extension(binary_name);
        let output = std::process::Command::new("pkill")
            .arg("-x")
            .arg(&proc_name)
            .output()
            .map_err(|e| format!("Pkill failed: {}", e))?;
        if output.status.success() || output.status.code() == Some(1) {
            Ok(())
        } else {
            Err(format!(
                "Failed stopping process {}: {}",
                binary_name,
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }
}
