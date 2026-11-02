# DQR-Complete

**Fake Discord Rich Presence for Linux, Windows & macOS**

[![Release](https://img.shields.io/badge/release-v1.0.0-blue.svg)](https://github.com/d4ruerk1/DQR-Complete/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)]()

Lightweight, modern cross-platform Discord Rich Presence customizer built with Tauri v2, Vue 3, TypeScript, and native Rust IPC runners.

---

## Features

- **Rich Presence Customization**: Custom state, details, timestamps, assets, and buttons.
- **Cross-Platform Runners**: Native Rust background sleepers for Linux, Windows, and macOS.
- **Modern UI**: Clean and responsive desktop interface built with Vue 3 and Tailwind CSS.
- **Low Footprint**: Minimal CPU and RAM utilization.

## Getting Started

Scarica l'ultima build per la tua piattaforma dalla sezione [Releases](https://github.com/d4ruerk1/DQR-Complete/releases).

### Sviluppo locale

```bash
pnpm install
pnpm tauri dev
```

### Build di produzione

```bash
pnpm tauri build
```

## Project Structure

- `src/` — Interfaccia utente Vue 3 e componenti
- `src-tauri/` — Backend Tauri e logica IPC
- `src-linux/`, `src-win/`, `src-darwin/` — Runner nativi Rust
- `packaging/` — Script di build e release bundle

## License

Distribuito sotto licenza [Apache-2.0](LICENSE).

