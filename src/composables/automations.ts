import { createGlobalState } from '@vueuse/core';
import { ref, shallowRef } from 'vue';
import { nanoid } from 'nanoid';
import { KNOWN_APPS } from '@/services/known-apps';
import { useDetectedApps } from '@/composables/detect-apps';
import { useGlobalState } from '@/composables/app-state';
import { drqBridge, PresenceActivityKind } from '@/services/drq-bridge';

const ENABLED_STORAGE_KEY = 'drq.automations.enabled';
const LIST_STORAGE_KEY = 'drq.automations.list';
/** How often the scheduler checks whether an automation window starts/ends. */
const TICK_MS = 15_000;

export type AutomationRepeat = 'daily' | 'weekly';
export type AutomationTarget = 'app' | 'text';

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  target: AutomationTarget;
  appKey: string;
  customText: string;
  scheduled: boolean;
  scheduleMode: 'daily' | 'weekly' | 'specific_date';
  specificDate?: string;
  startTime: string;
  durationMinutes: number;
  repeat: AutomationRepeat;
  days: number[];
}

export function createDefaultAutomation(): Automation {
  return {
    id: `auto-${nanoid(8)}`,
    name: 'Nuova automazione',
    enabled: true,
    target: 'app',
    appKey: KNOWN_APPS[0]?.key ?? '',
    customText: '',
    scheduled: false,
    scheduleMode: 'daily',
    specificDate: new Date().toISOString().slice(0, 10),
    startTime: '18:00',
    durationMinutes: 60,
    repeat: 'daily',
    days: [1, 2, 3, 4, 5]
  };
}

function loadAutomations(): Automation[] {
  try {
    const raw = localStorage.getItem(LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Automation>[];
    if (!Array.isArray(parsed)) return [];
    // Merge with defaults so older saved entries keep working after updates.
    return parsed.map((p) => ({ ...createDefaultAutomation(), ...p }));
  } catch {
    return [];
  }
}

export const useAutomations = createGlobalState(() => {
  const { addLog } = useGlobalState();
  const { customAppId, startAppPresence, stopAppPresence } = useDetectedApps();

  /** Global master switch for every automation. */
  const automationsEnabled = ref(
    localStorage.getItem(ENABLED_STORAGE_KEY) === '1'
  );
  const automations = shallowRef<Automation[]>(loadAutomations());

  /** Automation currently driving the Discord presence, if any. */
  const activeAutomationId = ref<string | null>(null);

  function persist() {
    localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(automations.value));
  }

  function setAutomationsEnabled(value: boolean) {
    automationsEnabled.value = value;
    localStorage.setItem(ENABLED_STORAGE_KEY, value ? '1' : '0');
    if (!value) {
      void deactivate();
    }
    addLog('info', `Automations ${value ? 'enabled' : 'disabled'}.`);
  }

  function addAutomation() {
    automations.value = [...automations.value, createDefaultAutomation()];
    persist();
  }

  function updateAutomation(updated: Automation) {
    automations.value = automations.value.map((a) =>
      a.id === updated.id ? updated : a
    );
    persist();
  }

  function removeAutomation(id: string) {
    if (activeAutomationId.value === id) {
      void deactivate();
    }
    automations.value = automations.value.filter((a) => a.id !== id);
    persist();
  }

  function dayMatches(a: Automation, day: number): boolean {
    return a.repeat === 'daily' || a.days.includes(day);
  }

  function isWithinWindow(a: Automation, now: Date): boolean {
    if (!a.scheduled) return false;
    if (a.scheduleMode === 'specific_date') {
      const today = now.toISOString().slice(0, 10);
      if (a.specificDate && a.specificDate !== today) return false;
    }
    const [h, m] = a.startTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const duration = Math.max(1, Math.floor(a.durationMinutes));
    const endMin = startMin + duration;
    const day = now.getDay();

    const matchesDay = a.scheduleMode === 'specific_date' ? true : a.scheduleMode === 'weekly' ? a.days.includes(day) : true;

    if (endMin < 24 * 60) {
      return matchesDay && nowMin >= startMin && nowMin < endMin;
    }
    const wrappedEnd = endMin % (24 * 60);
    if (nowMin >= startMin) return matchesDay;
    if (nowMin < wrappedEnd) {
      const prevDay = (day + 6) % 7;
      return a.scheduleMode === 'specific_date' ? true : a.scheduleMode === 'weekly' ? a.days.includes(prevDay) : true;
    }
    return false;
  }

  async function activate(a: Automation) {
    try {
      if (a.target === 'app') {
        const app = KNOWN_APPS.find((k) => k.key === a.appKey);
        if (!app) {
          addLog('warning', `Automation "${a.name}": unknown app "${a.appKey}".`);
          return;
        }
        await startAppPresence(app);
      } else {
        const appId = customAppId.value;
        if (!appId) {
          addLog(
            'warning',
            `Automation "${a.name}": set a custom Discord application ID ` +
              'to show custom text on Discord.'
          );
          return;
        }
        await drqBridge.setPresence({
          clientId: appId,
          activityType: PresenceActivityKind.Playing,
          details: a.customText.trim() || a.name
        });
      }
      activeAutomationId.value = a.id;
      addLog('info', `Automation "${a.name}" activated.`);
    } catch (e) {
      addLog('error', `Automation "${a.name}" failed: ${String(e)}`);
    }
  }

  async function deactivate() {
    if (!activeAutomationId.value) return;
    activeAutomationId.value = null;
    await stopAppPresence();
    addLog('info', 'Automation window ended, Discord status cleared.');
  }

  function tick() {
    if (!automationsEnabled.value) return;
    const now = new Date();
    const due = automations.value.find(
      (a) => a.enabled && isWithinWindow(a, now)
    );
    if (due) {
      if (activeAutomationId.value !== due.id) {
        void activate(due);
      }
    } else if (activeAutomationId.value) {
      void deactivate();
    }
  }

  // Start the scheduler once for the whole app lifetime.
  setInterval(tick, TICK_MS);
  // First check shortly after startup, so an already-open window activates.
  setTimeout(tick, 3_000);

  async function toggleManualAutomation(id: string) {
    if (activeAutomationId.value === id) {
      await deactivate();
    } else {
      const a = automations.value.find((item) => item.id === id);
      if (a) {
        await activate(a);
      }
    }
  }

  return {
    automationsEnabled,
    automations,
    activeAutomationId,
    toggleManualAutomation,
    setAutomationsEnabled,
    addAutomation,
    updateAutomation,
    removeAutomation
  };
});