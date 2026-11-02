import { createGlobalState } from '@vueuse/core';
import { ref, shallowRef } from 'vue';
import { KNOWN_APPS, type KnownApp } from '@/services/known-apps';
import { drqBridge, PresenceActivityKind, type SpotifyPlaybackInfo } from '@/services/drq-bridge';
import { useGlobalState } from './app-state';

const CUSTOM_APP_ID_STORAGE_KEY = 'drq.presence.customAppId';
const DISMISSED_APPS_STORAGE_KEY = 'drq.dismissedApps';
const SPOTIFY_CLIENT_ID_KEY = 'drq.spotify.clientId';
const SPOTIFY_SYNC_KEY = 'drq.spotify.syncPlayback';
const SPOTIFY_CUSTOM_TITLE_KEY = 'drq.spotify.customTitle';
const SPOTIFY_CUSTOM_ARTIST_KEY = 'drq.spotify.customArtist';

const FALLBACK_LABEL_KEY = 'zoom';
const SPOTIFY_REFRESH_MS = 15_000;
const RPC_CONNECT_TIMEOUT_MS = 10_000;

export type SpotifyTrack = SpotifyPlaybackInfo;

export function waitRpcOutcome(timeoutMs = RPC_CONNECT_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let unlistenConnected: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;

    const cleanup = () => {
      unlistenConnected?.();
      unlistenError?.();
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, timeoutMs);

    drqBridge.onPresenceConnected(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve();
    }).then((unlisten) => {
      if (settled) unlisten();
      else unlistenConnected = unlisten;
    });

    drqBridge.onPresenceError((payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error(payload?.error ?? 'Discord RPC connection failed'));
    }).then((unlisten) => {
      if (settled) unlisten();
      else unlistenError = unlisten;
    });
  });
}

export const useDetectedApps = createGlobalState(() => {
  const { addLog } = useGlobalState();

  const detectedApps = shallowRef<KnownApp[]>([]);
  const isDetecting = ref(false);
  const activeAppKey = ref<string | null>(null);
  const spotifyTrack = ref<SpotifyTrack | null>(null);

  // Dismissed (removed) applications
  const dismissedKeys = ref<string[]>(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(DISMISSED_APPS_STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    })()
  );

  const customAppId = ref(
    localStorage.getItem(CUSTOM_APP_ID_STORAGE_KEY) ?? ''
  );

  // Spotify configuration state
  const spotifyAppId = ref(
    localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) || '1021481123471183882'
  );
  const spotifySyncPlayback = ref(
    localStorage.getItem(SPOTIFY_SYNC_KEY) !== '0'
  );
  const spotifyCustomTitle = ref(
    localStorage.getItem(SPOTIFY_CUSTOM_TITLE_KEY) || ''
  );
  const spotifyCustomArtist = ref(
    localStorage.getItem(SPOTIFY_CUSTOM_ARTIST_KEY) || ''
  );

  let spotifyTimer: ReturnType<typeof setInterval> | undefined;

  function setCustomAppId(id: string) {
    customAppId.value = id.trim();
    localStorage.setItem(CUSTOM_APP_ID_STORAGE_KEY, customAppId.value);
  }

  function setSpotifyConfig(config: {
    appId?: string;
    syncPlayback?: boolean;
    customTitle?: string;
    customArtist?: string;
  }) {
    if (config.appId !== undefined) {
      spotifyAppId.value = config.appId.trim();
      localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, spotifyAppId.value);
    }
    if (config.syncPlayback !== undefined) {
      spotifySyncPlayback.value = config.syncPlayback;
      localStorage.setItem(SPOTIFY_SYNC_KEY, config.syncPlayback ? '1' : '0');
    }
    if (config.customTitle !== undefined) {
      spotifyCustomTitle.value = config.customTitle.trim();
      localStorage.setItem(SPOTIFY_CUSTOM_TITLE_KEY, spotifyCustomTitle.value);
    }
    if (config.customArtist !== undefined) {
      spotifyCustomArtist.value = config.customArtist.trim();
      localStorage.setItem(SPOTIFY_CUSTOM_ARTIST_KEY, spotifyCustomArtist.value);
    }
  }

  function fallbackLabelApp(): KnownApp | undefined {
    return KNOWN_APPS.find((a) => a.key === FALLBACK_LABEL_KEY);
  }

  function presenceAppId(app: KnownApp): string {
    if (app.key === 'spotify') {
      return spotifyAppId.value || app.discordAppId || customAppId.value || '1021481123471183882';
    }
    return (
      app.discordAppId ||
      customAppId.value ||
      fallbackLabelApp()?.discordAppId ||
      ''
    );
  }

  async function detectApps() {
    isDetecting.value = true;
    try {
      const hints = KNOWN_APPS.map((a) => ({
        key: a.key,
        binaries: a.hints.binaries,
        paths: a.hints.paths
      }));
      const matchedKeys = await drqBridge.detectSystemApps(hints);
      
      // Only keep apps that are matched, not dismissed by user, and actually usable on Discord
      detectedApps.value = KNOWN_APPS.filter(
        (a) =>
          matchedKeys.includes(a.key) &&
          !dismissedKeys.value.includes(a.key) &&
          Boolean(presenceAppId(a))
      );
      addLog(
        'info',
        `Rilevate ${detectedApps.value.length} applicazioni utilizzabili su Discord.`
      );
    } catch (e) {
      addLog('error', `Rilevamento applicazioni fallito: ${String(e)}`);
    } finally {
      isDetecting.value = false;
    }
  }

  function removeDetectedApp(key: string) {
    if (!dismissedKeys.value.includes(key)) {
      dismissedKeys.value = [...dismissedKeys.value, key];
      localStorage.setItem(DISMISSED_APPS_STORAGE_KEY, JSON.stringify(dismissedKeys.value));
    }
    if (activeAppKey.value === key) {
      void stopAppPresence();
    }
    detectedApps.value = detectedApps.value.filter((a) => a.key !== key);
    addLog('info', `Applicazione rimossa dall'elenco rilevate.`);
  }

  function restoreDismissedApps() {
    dismissedKeys.value = [];
    localStorage.removeItem(DISMISSED_APPS_STORAGE_KEY);
    void detectApps();
  }

  async function fetchSpotifyTrack(): Promise<SpotifyTrack | null> {
    try {
      return await drqBridge.getSpotifyPlayback();
    } catch (e) {
      addLog('warning', `Impossibile leggere la riproduzione Spotify: ${String(e)}`);
      return null;
    }
  }

  function clearSpotifyTimer() {
    if (spotifyTimer !== undefined) {
      clearInterval(spotifyTimer);
      spotifyTimer = undefined;
    }
  }

  async function pushAppActivity(app: KnownApp) {
    const activityKind =
      app.presence === 'listening'
        ? PresenceActivityKind.Listening
        : PresenceActivityKind.Playing;

    let details =
      app.presence === 'listening'
        ? `In ascolto su ${app.name}`
        : `Utilizzo di ${app.name}`;
    let state: string | undefined = undefined;

    if (app.spotify) {
      if (spotifySyncPlayback.value) {
        const track = await fetchSpotifyTrack();
        spotifyTrack.value = track;
        if (track && track.title) {
          details = track.title;
          state = track.artist ? `di ${track.artist}` : 'Spotify';
        } else if (spotifyCustomTitle.value) {
          details = spotifyCustomTitle.value;
          state = spotifyCustomArtist.value ? `di ${spotifyCustomArtist.value}` : 'Spotify';
        }
      } else if (spotifyCustomTitle.value) {
        details = spotifyCustomTitle.value;
        state = spotifyCustomArtist.value ? `di ${spotifyCustomArtist.value}` : 'Spotify';
      }
    }

    await drqBridge.setPresence({
      clientId: presenceAppId(app),
      activityType: activityKind,
      details,
      state,
      startTime: Math.floor(Date.now() / 1000)
    });
  }

  async function startAppPresence(app: KnownApp) {
    const appId = presenceAppId(app);
    if (!appId) {
      addLog(
        'warning',
        `Nessun Discord Application ID per ${app.name}. ` +
          'Configura l\'ID nelle Impostazioni.'
      );
      return;
    }

    try {
      addLog('info', `Avvio Rich Presence per ${app.name}...`);
      const outcome = waitRpcOutcome();
      await pushAppActivity(app);
      await outcome;
      activeAppKey.value = app.key;

      if (app.spotify) {
        clearSpotifyTimer();
        spotifyTimer = setInterval(() => {
          pushAppActivity(app).catch((e) =>
            addLog('error', `Aggiornamento Spotify fallito: ${String(e)}`)
          );
        }, SPOTIFY_REFRESH_MS);
      }
      addLog(
        'info',
        `Rich Presence Discord attiva per ${app.name}.`
      );
    } catch (e) {
      clearSpotifyTimer();
      activeAppKey.value = null;
      spotifyTrack.value = null;
      addLog(
        'error',
        `Avvio presenza fallito per ${app.name}: ${String(e)}. Discord è aperto?`
      );
    }
  }

  async function stopAppPresence() {
    clearSpotifyTimer();
    try {
      await drqBridge.clearPresence();
      addLog('info', 'Rich Presence Discord terminata.');
    } catch (e) {
      addLog('error', `Errore cancellazione presenza: ${String(e)}`);
    } finally {
      activeAppKey.value = null;
      spotifyTrack.value = null;
    }
  }

  return {
    detectedApps,
    isDetecting,
    activeAppKey,
    spotifyTrack,
    dismissedKeys,
    customAppId,
    spotifyAppId,
    spotifySyncPlayback,
    spotifyCustomTitle,
    spotifyCustomArtist,
    setCustomAppId,
    setSpotifyConfig,
    detectApps,
    removeDetectedApp,
    restoreDismissedApps,
    presenceAppId,
    startAppPresence,
    stopAppPresence
  };
});
