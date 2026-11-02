# Changelog

All notable changes to DRQ Complete are documented in this file.
Target version: **1.0.0** (preserved in `package.json` and `src-tauri/tauri.conf.json`).

## [1.0.0] - Initial Release

### Added & Changed — CP 8: Cross-Platform Verification, Direct Updater & Release Validation

- **Asymmetric Key Removal & Direct Updater**:
  - Removed minisign public key (`pubkey`) and mandatory signing artifacts (`createUpdaterArtifacts`) from `src-tauri/tauri.conf.json`.
  - Re-implemented `src/composables/auto-update.ts` to query official GitHub releases directly via HTTPS (`releases/latest`) with fallback to `latest.json`, completely removing the dependency on asymmetric key pairs, minisign `.sig` files, and CI signing secrets.
  - Added real-time download progress tracking (streaming byte counters and percentage calculation) with in-app restart capabilities.
  - Updated `scripts/generate-updater-manifest.mjs` to generate key-free release manifests.
  - Allowed `https://objects.githubusercontent.com` in `capabilities/default.json` and CSP for direct asset downloads.
- **Cross-Platform Compilation & Verification**:
  - Validated platform runners across Linux (`src-linux`, `src-linux-rust-sleeper`), Windows 11 (`src-win` C++ Win32 tray application), and macOS (`src-darwin` / `.app` bundle generator).
  - Translated residual non-English comments in `src-win/src/main.rs`.
  - Extended `.github/workflows/release.yml` with full multi-platform matrix: Linux (AppImage, Arch `.pkg.tar.zst`, Flatpak bundle), Windows 11 (`windows-latest`, NSIS `.exe` installer), and macOS (`macos-latest`, DMG bundle).
- **Responsive Display & DPI Scaling Validation**:
  - Validated adaptive Tailwind layout from compact window dimensions (540x480) up to 4K displays with high-DPI scaling (125%, 150%, 200%).
  - Separated draggable titlebar area (`data-tauri-drag-region`) from clickable controls and navigation elements.
- **End-to-End Application Testing**:
  - Validated clean standalone launch, offline catalog persistence (`catalog.json` / `gamelist.json`), update opt-out toggle (`drq.autoupdate.enabled`), and direct GitHub release checks.

### Added & Changed — CP 7: Repository Independence, Governance & Privacy

- **Clean Orphan Git History**: initialized an independent Git repository on
  branch `main` authored by `d4ruerk1 <d4ruerk1@users.noreply.github.com>` with
  remote origin `https://github.com/d4ruerk1/DQR-Complete.git`. All historical
  commits from the prior account/fork are completely eliminated, establishing
  a clean root commit for publishing directly as an original standalone
  repository outside GitHub's fork tree.
- **GitHub Governance & Acceptable Use Adherence**:
  - Added [`GOVERNANCE.md`](GOVERNANCE.md) documenting repository management,
    project independence under maintainer `d4ruerk1`, compliance with GitHub's
    Acceptable Use Policies for local desktop utilities, and complete absence of
    malicious payloads or API abuse.
  - Added [`SECURITY.md`](SECURITY.md) defining the project's vulnerability
    disclosure policy and private reporting channels.
  - Formalized autonomous licensing under Apache License 2.0 with strict
    "AS IS" warranty disclaimers and limitation of liability (Sections 7 & 8),
    coupled with explicit non-affiliation notices for Discord Inc. and GitHub Inc.
- **Data Privacy & GDPR Compliance (D.Lgs. 196/2003)**:
  - Added [`PRIVACY.md`](PRIVACY.md) specifying full adherence to EU GDPR
    (Regulation 2016/679) and Italian Legislative Decree D.Lgs. 196/2003
    (amended by D.Lgs. 101/2018).
  - Absolute zero telemetry, analytics, remote error tracking, or user profiling.
  - Strict local-only persistence: custom client IDs, presence configurations,
    automations, and UI preferences reside exclusively in webview `localStorage`,
    while runtime caches live in the per-user isolated app data directory.
  - Discord Rich Presence operations execute strictly via local system IPC
    sockets (Unix domain sockets / Windows named pipes) on localhost without
    transmitting tokens or credentials over the network.
  - Application footer (`src/components/MainLayout.vue`) and settings About section
    linked directly to `PRIVACY.md`.
- **Network Lockdown to GitHub HTTPS Exclusively**:
  - Catalog synchronization moved to official GitHub HTTPS endpoints
    (`https://raw.githubusercontent.com/d4ruerk1/DQR-Complete/main/resources/catalog.json`
    and release assets), eliminating all remote HTTP calls to `discord.com` or third parties.
  - Introduced `validate_secure_github_url` in `src-tauri/src/core/catalog.rs`
    actively blocking any outgoing HTTP request with a non-HTTPS scheme or
    directed outside authorized GitHub domains.
  - Network capabilities in `src-tauri/capabilities/default.json` and CSP in
    `src-tauri/tauri.conf.json` restricted strictly to GitHub HTTPS and localhost IPC.
  - Curated fallback catalog added to `resources/catalog.json` and
    `src-tauri/resources/catalog.json`.

### Added — CP 4: Auto-Update System

- **Automatic update detection**: the app now uses the Tauri updater plugin
  (`tauri-plugin-updater` + `@tauri-apps/plugin-updater`) instead of the
  read-only GitHub API banner. On startup it silently queries the signed
  `latest.json` manifest published with every GitHub release
  (`releases/latest/download/latest.json`) and, when a newer version exists,
  shows an actionable "Update to vX.Y.Z" pill in the header.
- **Autonomous download & install**: one click on the pill (or the
  "Download and install" button in the new **Settings → Updates** section)
  downloads the signed update package in the background — with live progress
  (percentage and MB counters) — verifies its minisign signature against the
  public key compiled into the app, and installs it without any manual step.
  A "Restart" action (`tauri-plugin-process`) relaunches the app into the new
  version. Manual "Check for updates" with clear up-to-date / error states is
  available in Settings; all transitions are written to the in-app logs.
- **Update configuration**: `plugins.updater` added to
  `src-tauri/tauri.conf.json` (public key + GitHub endpoint),
  `bundle.createUpdaterArtifacts` enabled, `updater:default` /
  `updater:allow-download-and-install` and `process:default` /
  `process:allow-restart` added to `capabilities/default.json`; plugins
  registered in `src-tauri/src/lib.rs`.
- **Release pipeline**: the AppImage job in `.github/workflows/release.yml`
  now signs the updater artifacts using the `TAURI_SIGNING_PRIVATE_KEY`
  repository secret and uploads `*.AppImage.tar.gz` + `.sig`; the release job
  renames them coherently, generates `latest.json` via the new
  `scripts/generate-updater-manifest.mjs` and attaches everything to the
  GitHub release. Arch and Flatpak builds intentionally keep updating through
  their package managers.
- New frontend module `src/composables/auto-update.ts` centralizes the
  update state machine (checking → available → downloading → ready →
  up-to-date / error) shared by `MainLayout.vue` and `SettingsView.vue`.
- Docs: `README.md` gained an "Updates" section (user flow + maintainer
  signing-key setup); `.gitignore` now excludes private signing keys
  (`*.key`). Version target preserved at **1.0.0** in all build and
  configuration files.

### Changed — CP 4 completion & CP 5: Repository Link Cleanup

- **Updater endpoints aligned to the official repository**: the updater
  endpoint in `src-tauri/tauri.conf.json` and the default `--repo` in
  `scripts/generate-updater-manifest.mjs` now point to
  `https://github.com/d4ruerk1/DQR-Complete` (previously `d4ruerk1/DQC-Linux`).
- **Auto-update opt-out**: new **Automatic updates** toggle in
  **Settings → Updates** (persisted as `drq.autoupdate.enabled`, on by
  default). When disabled, the silent startup check is skipped entirely;
  manual "Check for updates" remains available.
- **Repository link sweep**: every stale pointer to the previous repository
  name was replaced with `https://github.com/d4ruerk1/DQR-Complete`:
  README badges/links/clone instructions, `src-tauri/Cargo.toml`
  (`repository`), the footer Terms/Privacy links in `MainLayout.vue`, the
  About link in `SettingsView.vue`, the Windows runner tray URL
  (`src-win/src/main.cpp`), the Arch `PKGBUILD` (`_repo`) and the
  source-archive prefix in the release workflow.
- **Permissions cleanup**: removed the obsolete HTTP scopes
  `https://markterence.github.io` (mirror dropped in CP 3) and
  `https://api.github.com` (replaced by the updater plugin) from
  `capabilities/default.json`, and fixed a malformed `tauri.localhost`
  entry; `.github/FUNDING.yml` now points to the current maintainer's Ko-fi.

### Changed — CP 3: Data Management & Offline Cache

- **Bundled game list removed**: the ~11 MB `src/assets/gamelist.json`
  snapshot is no longer shipped in the app bundle. The local file is now
  generated coherently on the first launch instead.
- **Direct Discord fetch, no intermediate filters**: the GitHub mirror
  (`markterence.github.io/discord-quest-completer/detectable.json`) and the
  `fetch_gamelist_gh_mirror` command were removed; the game list is fetched
  straight from Discord's public detectable-applications endpoint
  (`GET /api/applications/detectable`).
- **Offline cache**: every successful fetch is validated (JSON array) and
  persisted by the backend to `gamelist.json` in the per-user app data
  folder; new `load_gamelist_cache` and `gamelist_cache_timestamp` commands
  serve it back. When the Discord fetch fails, the app automatically falls
  back to the cached copy, shows an "Offline cache" badge in the Games
  panel header, and — only when no cache exists yet (first launch without
  internet) — shows an error dialog explaining how to generate it.
- `src/composables/fetch-gamelist.ts` rewritten around the two sources
  (Discord live + local cache); `src/services/fake-games.ts` now reads the
  cache instead of the deleted bundled JSON; fetch-status toasts in
  `HomeView.vue` updated accordingly.

### Changed — CP 2: Rebranding, Documentation & Apache 2.0 Transition

- **`README.md` fully rewritten**: the project documentation now stands on its
  own (features, installation, uninstall, how-it-works, development setup and
  disclaimer written for DRQ Complete), with no dependency on the upstream
  repository's readme. Upstream references were reduced to the single
  attribution note required for license compliance.
- **License adopted: Apache 2.0.** `LICENSE` now contains the full Apache
  License 2.0 text. A new Apache-style `NOTICE` file preserves the original
  MIT copyright and license text of the original work, as required; the old
  `NOTICE.md` was removed. Portions of the codebase remain MIT-licensed per
  `NOTICE`; all new and modified portions are Apache-2.0.
- **Badges and license notes aligned to Apache-2.0** in `README.md`
  (license badge, license section); upstream sponsor/stargazer badges removed.
- **License metadata aligned across build files**: `package.json`
  (`"license": "Apache-2.0"`), `src-tauri/Cargo.toml` and
  `src-linux/Cargo.toml` (`license = "Apache-2.0"`), `packaging/arch/PKGBUILD`
  (`license=('Apache-2.0')`, installs `LICENSE` + `NOTICE`).
- **UI links aligned**: the app footer's "Privacy" link now points to `NOTICE`;
  the runner tray link and crate `repository` fields point to this repository.
- `CREDITS.md` trimmed to the essential attribution; version target preserved
  at **1.0.0** in all build and configuration files.

### Changed — CP 1: UI/UX Redesign & Responsiveness

- **Design system**: introduced shared component classes in `src/theme/style.css`
  (`.btn` / `.btn-primary` / `.btn-danger` / `.btn-ghost`, `.input`, `.card`,
  `.section-title`, `.section-desc`) so every page uses the same buttons,
  form controls and surfaces. The file now imports Tailwind CSS v4, which
  previously was not loaded at all.
- **Layout (`MainLayout.vue`)**: the header now wraps gracefully on narrow
  windows; navigation became a segmented pill control (Home / Settings) that
  stays readable at any width; the update banner is a compact pill with a
  download icon; the titlebar and footer were restyled for visual coherence
  (unified borders, background, spacing).
- **Home (`HomeView.vue`)**: fetch-status notifications moved from an
  absolute top-left overlay to a fixed toast stack in the top-right corner
  that never shifts the page layout; the search bar gained a leading search
  icon and a docked "Refetch Game List" button; content uses a fluid
  `max-w-6xl` container — with detected applications present, games and apps
  sit side by side on wide windows and stack vertically on narrow ones;
  game rows and search results wrap instead of overflowing.
- **Settings (`SettingsView.vue`)**: all sections use the shared card and
  form-control classes; forms keep their responsive grids (`sm:` breakpoints)
  so fields stack on small windows.
- **Window constraints (`tauri.conf.json`)**: added `minWidth: 540` and
  `minHeight: 480` so the responsive layout can never be squashed past its
  designed breakpoints; the window stays freely resizable above that.
- Minor: unified buttons in `GameExecutables.vue` and `GameCard.vue` with the
  shared button classes; consistent focus-visible rings for keyboard
  navigation; slim theme-aware scrollbars.

### Verified

- `pnpm build` (`vue-tsc --noEmit && vite build`) passes with no type errors.
- Rendered preview checked at 1280×800, 800×600 and 560×520 viewports:
  layout stays coherent, no overflow, navigation and panels reflow correctly.
