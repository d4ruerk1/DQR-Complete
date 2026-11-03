use std::path::PathBuf;

fn main() {
    // Get the target OS
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let mut resource_path = PathBuf::from("resources");

    match target_os.as_str() {
        "windows" => {
            resource_path.push("src-win.exe");
            if !resource_path.exists() {
                let _ = std::process::Command::new("cargo")
                    .args(["build", "--release", "--manifest-path", "../src-win/Cargo.toml"])
                    .status();
                let _ = std::fs::create_dir_all("resources");
                let _ = std::fs::copy("../src-win/target/release/src-win.exe", &resource_path);
            }
        }
        "linux" => {
            resource_path.push("src-linux");
            if !resource_path.exists() {
                let _ = std::process::Command::new("cargo")
                    .args(["build", "--release", "--manifest-path", "../src-linux/Cargo.toml"])
                    .status();
                let _ = std::fs::create_dir_all("resources");
                let _ = std::fs::copy("../src-linux/target/release/src-linux", &resource_path);
            }
        }
        "macos" => {
            resource_path.push("src-darwin");
            if !resource_path.exists() {
                let _ = std::process::Command::new("cargo")
                    .args(["build", "--release", "--manifest-path", "../src-darwin/Cargo.toml"])
                    .status();
                let _ = std::fs::create_dir_all("resources");
                let _ = std::fs::copy("../src-darwin/target/release/src-darwin", &resource_path);
            }
        }
        _ => return,
    }

    // Build the Tauri application (after ensuring resources are present)
    tauri_build::build();

    // Tell cargo to rerun if the resource file changes
    if resource_path.exists() {
        println!("cargo:rerun-if-changed={}", resource_path.display());
    } else {
        eprintln!("Warning: Platform runner not found at {}", resource_path.display());
    }
}
