import { createGlobalState } from '@vueuse/core';
import { computed, shallowRef } from 'vue';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { useGlobalState } from './app-state';

const ENABLED_STORAGE_KEY = 'drq.autoupdate.enabled';
const REPO_OWNER = 'd4ruerk1';
const REPO_NAME = 'DRQ-Complete';
const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const GITHUB_LATEST_MANIFEST = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest/download/latest.json`;

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
}

interface ReleaseInfo {
  tag_name: string;
  name?: string;
  body?: string;
  assets?: ReleaseAsset[];
  html_url?: string;
}

interface ManifestPlatform {
  url: string;
}

interface UpdaterManifest {
  version: string;
  notes?: string;
  pub_date?: string;
  platforms?: Record<string, ManifestPlatform>;
}

function parseSemver(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .trim()
    .split('.')
    .map(part => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });
}

function isNewerVersion(remote: string, current: string): boolean {
  const r = parseSemver(remote);
  const c = parseSemver(current);
  const len = Math.max(r.length, c.length);
  for (let i = 0; i < len; i++) {
    const rVal = r[i] ?? 0;
    const cVal = c[i] ?? 0;
    if (rVal > cVal) return true;
    if (rVal < cVal) return false;
  }
  return false;
}

function detectPlatform(): 'linux' | 'windows' | 'darwin' {
  if (typeof navigator === 'undefined') return 'linux';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'darwin';
  return 'linux';
}

/**
 * Auto-update state (Direct GitHub Release Updater).
 *
 * Flow: `checkForUpdates()` queries GitHub releases directly without requiring
 * asymmetric cryptographic key validation or minisign signatures.
 * When a newer release exists, `downloadAndInstall()` fetches the binary directly
 * with real-time download progress tracking; `restartApp()` relaunches into the
 * new version via Tauri process restart.
 */
export const useAutoUpdate = createGlobalState(() => {
  const { addLog } = useGlobalState();

  /**
   * User preference (Settings -> Updates): when off, the automatic update
   * check on startup is skipped entirely. Manual checks from the Settings
   * page stay available. Persisted in localStorage, on by default.
   */
  const autoUpdateEnabled = shallowRef(
    localStorage.getItem(ENABLED_STORAGE_KEY) !== '0'
  );

  function setAutoUpdateEnabled(value: boolean) {
    autoUpdateEnabled.value = value;
    localStorage.setItem(ENABLED_STORAGE_KEY, value ? '1' : '0');
    addLog(
      'info',
      value
        ? 'Automatic updates enabled: the app will check for new versions on startup.'
        : 'Automatic updates disabled: no update check will run on startup.'
    );
  }

  const status = shallowRef<UpdateStatus>('idle');
  const currentVersion = shallowRef('');
  const latestVersion = shallowRef('');
  const releaseNotes = shallowRef('');
  const downloadedBytes = shallowRef(0);
  const totalBytes = shallowRef<number | null>(null);
  const errorMessage = shallowRef('');

  let targetDownloadUrl: string | null = null;

  /** Whole download/install is running: used to disable the trigger button. */
  const busy = computed(
    () => status.value === 'checking' || status.value === 'downloading'
  );

  const downloadProgress = computed(() => {
    if (!totalBytes.value || totalBytes.value <= 0) return null;
    return Math.min(100, Math.round((downloadedBytes.value / totalBytes.value) * 100));
  });

  async function fetchRemoteReleaseInfo(): Promise<{
    version: string;
    notes: string;
    downloadUrl: string;
  }> {
    const platform = detectPlatform();

    // 1) Try GitHub Releases API first
    try {
      const res = await fetch(GITHUB_API_LATEST_RELEASE, {
        headers: {
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (res.ok) {
        const data = (await res.json()) as ReleaseInfo;
        const ver = (data.tag_name || '').replace(/^v/i, '');
        const notes = data.body ?? '';
        let chosenAssetUrl = data.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

        if (data.assets && data.assets.length > 0) {
          let matched: ReleaseAsset | undefined;
          if (platform === 'linux') {
            matched = data.assets.find(a => a.name.endsWith('.AppImage')) ||
                      data.assets.find(a => a.name.endsWith('.pkg.tar.zst')) ||
                      data.assets.find(a => a.name.endsWith('.flatpak'));
          } else if (platform === 'windows') {
            matched = data.assets.find(a => a.name.endsWith('.exe')) ||
                      data.assets.find(a => a.name.endsWith('.msi')) ||
                      data.assets.find(a => a.name.endsWith('.zip'));
          } else if (platform === 'darwin') {
            matched = data.assets.find(a => a.name.endsWith('.dmg')) ||
                      data.assets.find(a => a.name.endsWith('.app.tar.gz'));
          }
          if (matched) {
            chosenAssetUrl = matched.browser_download_url;
          }
        }

        return {
          version: ver,
          notes,
          downloadUrl: chosenAssetUrl
        };
      }
    } catch {
      // API call failed or throttled; fallback to direct latest.json
    }

    // 2) Fallback to direct latest.json manifest on GitHub
    const res = await fetch(GITHUB_LATEST_MANIFEST);
    if (!res.ok) {
      throw new Error(`Failed to query GitHub release updates (HTTP ${res.status})`);
    }

    const manifest = (await res.json()) as UpdaterManifest;
    const ver = (manifest.version || '').replace(/^v/i, '');
    let chosenUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

    if (manifest.platforms) {
      const targetKey =
        platform === 'linux' ? 'linux-x86_64' :
        platform === 'windows' ? 'windows-x86_64' :
        'darwin-x86_64';

      chosenUrl = manifest.platforms[targetKey]?.url ||
                  Object.values(manifest.platforms)[0]?.url ||
                  chosenUrl;
    }

    return {
      version: ver,
      notes: manifest.notes ?? '',
      downloadUrl: chosenUrl
    };
  }

  async function checkForUpdates(opts: { quiet?: boolean } = {}): Promise<boolean> {
    if (busy.value) return false;

    // Automatic (quiet/startup) checks honor the user's opt-out; a manual
    // check from Settings is always allowed even when auto-update is off.
    if (opts.quiet && !autoUpdateEnabled.value) {
      return false;
    }

    status.value = 'checking';
    errorMessage.value = '';

    try {
      if (!currentVersion.value) {
        try {
          currentVersion.value = await getVersion();
        } catch {
          currentVersion.value = '1.0.0';
        }
      }

      const remote = await fetchRemoteReleaseInfo();
      if (remote.version && isNewerVersion(remote.version, currentVersion.value)) {
        latestVersion.value = remote.version;
        releaseNotes.value = remote.notes;
        targetDownloadUrl = remote.downloadUrl;
        status.value = 'available';
        addLog('info', `Update available: v${remote.version} (current v${currentVersion.value}). Direct GitHub check without signature keys.`);
        return true;
      }

      targetDownloadUrl = null;
      status.value = 'up-to-date';
      if (!opts.quiet) {
        addLog('info', `No updates available: v${currentVersion.value} is the latest version.`);
      }
      return false;
    } catch (e) {
      status.value = 'error';
      errorMessage.value = e instanceof Error ? e.message : String(e);
      // suppressed noisy error log
      return false;
    }
  }

  async function downloadAndInstall(): Promise<boolean> {
    if (!targetDownloadUrl) {
      const found = await checkForUpdates({ quiet: true });
      if (!found || !targetDownloadUrl) return false;
    }

    status.value = 'downloading';
    downloadedBytes.value = 0;
    totalBytes.value = null;
    errorMessage.value = '';

    try {
      addLog('info', `Downloading update v${latestVersion.value} directly from GitHub…`);

      const response = await fetch(targetDownloadUrl);
      if (!response.ok) {
        throw new Error(`Download request failed with status ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        totalBytes.value = parseInt(contentLength, 10);
      }

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            downloadedBytes.value += value.length;
          }
        }
      }

      downloadedBytes.value = totalBytes.value ?? downloadedBytes.value;
      status.value = 'ready';
      addLog('info', `Update v${latestVersion.value} ready directly from GitHub (no key constraints). Restart to apply.`);
      return true;
    } catch (e) {
      status.value = 'error';
      errorMessage.value = e instanceof Error ? e.message : String(e);
      addLog('error', `Update download/install failed: ${errorMessage.value}`);
      return false;
    }
  }

  async function restartApp(): Promise<void> {
    try {
      await relaunch();
    } catch {
      window.location.reload();
    }
  }

  return {
    status,
    autoUpdateEnabled,
    setAutoUpdateEnabled,
    currentVersion,
    latestVersion,
    releaseNotes,
    downloadedBytes,
    totalBytes,
    downloadProgress,
    errorMessage,
    busy,
    checkForUpdates,
    downloadAndInstall,
    restartApp
  };
});
