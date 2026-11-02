#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";
const isDarwin = process.platform === "darwin";
const isLinux = process.platform === "linux";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: isWindows, cwd });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const resourcesDir = path.resolve("src-tauri/resources");
fs.mkdirSync(resourcesDir, { recursive: true });

if (isWindows) {
  run("cargo", ["build", "--release"], path.resolve("src-win"));
  fs.copyFileSync(
    path.resolve("src-win/target/release/src-win.exe"),
    path.join(resourcesDir, "src-win.exe")
  );
} else if (isDarwin) {
  run("cargo", ["build", "--release"], path.resolve("src-darwin"));
  fs.copyFileSync(
    path.resolve("src-darwin/target/release/src-darwin"),
    path.join(resourcesDir, "src-darwin")
  );
} else if (isLinux) {
  run("cargo", ["build", "--release"], path.resolve("src-linux"));
  fs.copyFileSync(
    path.resolve("src-linux/target/release/src-linux"),
    path.join(resourcesDir, "src-linux")
  );
} else {
  console.error(`Unsupported platform for runner sync: ${process.platform}`);
  process.exit(1);
}
