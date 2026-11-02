import { createGlobalState } from '@vueuse/core';
import { ShallowRef, shallowRef } from 'vue';

export const Pages = {
  HOME: 'home',
  LOGS: 'logs',
  SETTINGS: 'settings',
} as const;

export type Pages = typeof Pages[keyof typeof Pages];

export interface AppLogObject {
  type: 'info' | 'error' | 'warning' | 'debug';
  message: string;
  timestamp: Date;
}

export interface UseGlobalStateReturn {
  page: ShallowRef<Pages>;
  setPage: (newPage: Pages) => void;
  logs: ShallowRef<AppLogObject[]>;
  addLog: {
    (type: 'info' | 'error' | 'warning' | 'debug', newLog: string): void;
    (newLog: string): void;
  };
  clearLogs: () => void;
}

// Cap the in-memory log entries to avoid performance degradation
const MAX_LOGS = 200;

export const useGlobalState = createGlobalState(() => {
  const page = shallowRef<Pages>(Pages.HOME);
  const logs = shallowRef<AppLogObject[]>([]);

  function setPage(newPage: Pages) {
    page.value = newPage;
  }

  function addLog(type: string | 'info' | 'error' | 'warning' | 'debug', newLog?: string) {
    if (!newLog) {
      newLog = type;
      type = 'info';
    }
    const entry: AppLogObject = {
      type: type as 'info' | 'error' | 'warning' | 'debug',
      message: newLog,
      timestamp: new Date()
    };
    const next = [...logs.value, entry];
    logs.value = next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
  }

  function clearLogs() {
    logs.value = [];
  }

  return {
    page,
    setPage,
    logs,
    addLog,
    clearLogs
  } as UseGlobalStateReturn;
});
