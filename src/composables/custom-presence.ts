import { createGlobalState } from '@vueuse/core';
import { ref } from 'vue';
import { KNOWN_APPS } from '@/services/known-apps';
import { useDetectedApps, waitRpcOutcome } from '@/composables/detect-apps';
import { useGlobalState } from '@/composables/app-state';
import { drqBridge, PresenceActivityKind } from '@/services/drq-bridge';

const STORAGE_KEY = 'drq.customPresence';

export type PresenceKind = 'playing' | 'listening' | 'watching' | 'competing';

const KIND_MAPPING: Record<PresenceKind, PresenceActivityKind> = {
  playing: PresenceActivityKind.Playing,
  listening: PresenceActivityKind.Listening,
  watching: PresenceActivityKind.Watching,
  competing: PresenceActivityKind.Competing
};

export interface CustomPresenceConfig {
  showAsKey: string;
  text: string;
  subtext: string;
  icon: string;
  kind: PresenceKind;
  durationMinutes: number;
}

export const PRESENCE_LABEL_APPS = KNOWN_APPS.filter((a) => a.discordAppId);

function defaultConfig(): CustomPresenceConfig {
  return {
    showAsKey: PRESENCE_LABEL_APPS[0]?.key ?? '',
    text: '',
    subtext: '',
    icon: '',
    kind: 'playing',
    durationMinutes: 0
  };
}

function loadConfig(): CustomPresenceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    return { ...defaultConfig(), ...(JSON.parse(raw) as Partial<CustomPresenceConfig>) };
  } catch {
    return defaultConfig();
  }
}

export const useCustomPresence = createGlobalState(() => {
  const { addLog } = useGlobalState();
  const { customAppId, stopAppPresence, activeAppKey } = useDetectedApps();

  const config = ref<CustomPresenceConfig>(loadConfig());
  const isCustomPresenceActive = ref(false);

  let stopTimer: ReturnType<typeof setTimeout> | undefined;

  function updateConfig(patch: Partial<CustomPresenceConfig>) {
    config.value = { ...config.value, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value));
  }

  function clearStopTimer() {
    if (stopTimer !== undefined) {
      clearTimeout(stopTimer);
      stopTimer = undefined;
    }
  }

  function effectiveAppId(): string {
    if (customAppId.value) return customAppId.value;
    const label = PRESENCE_LABEL_APPS.find((a) => a.key === config.value.showAsKey);
    return label?.discordAppId ?? '';
  }

  async function startCustomPresence() {
    const appId = effectiveAppId();
    if (!appId) {
      addLog('warning', 'Quick presence: no Discord application ID available.');
      return;
    }

    try {
      const outcome = waitRpcOutcome();
      await drqBridge.setPresence({
        clientId: appId,
        activityType: KIND_MAPPING[config.value.kind],
        details: config.value.text.trim() || undefined,
        state: config.value.subtext.trim() || undefined,
        imageKey: config.value.icon.trim() || undefined,
        startTime: Math.floor(Date.now() / 1000)
      });
      await outcome;

      activeAppKey.value = null;
      isCustomPresenceActive.value = true;
      clearStopTimer();

      const minutes = Math.floor(config.value.durationMinutes);
      if (minutes > 0) {
        stopTimer = setTimeout(() => {
          void stopCustomPresence();
        }, minutes * 60_000);
        addLog('info', `Quick presence started (auto-stops in ${minutes} min).`);
      } else {
        addLog('info', 'Quick presence started (stays up until stopped).');
      }
    } catch (e) {
      isCustomPresenceActive.value = false;
      addLog('error', `Quick presence failed: ${String(e)}. Is Discord running?`);
    }
  }

  async function stopCustomPresence() {
    clearStopTimer();
    try {
      await drqBridge.clearPresence();
      addLog('info', 'Quick presence cleared.');
    } catch (e) {
      addLog('error', `Failed to clear quick presence: ${String(e)}`);
    } finally {
      isCustomPresenceActive.value = false;
    }
  }

  return {
    config,
    isCustomPresenceActive,
    updateConfig,
    startCustomPresence,
    stopCustomPresence,
    stopAppPresence
  };
});
