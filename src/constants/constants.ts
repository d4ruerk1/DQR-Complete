import { InjectionKey } from "vue";

export const SUPPORTED_PLATFORMS = {
  WINDOWS: 'win32',
  DARWIN: 'darwin',
  LINUX: 'linux',
  ANDROID: 'android',
  IOS: 'ios',
} as const;

export const EXECUTABLE_OS = SUPPORTED_PLATFORMS;

export const GameActionsKey: InjectionKey<string> = Symbol('GameActionsKey');

export function getCurrentOS(): string {
  const platform =
    (window as any).__TAURI_INTERNALS__?.platform ||
    navigator.platform.toLowerCase();

  if (platform.includes('linux')) return SUPPORTED_PLATFORMS.LINUX;
  if (platform.includes('win')) return SUPPORTED_PLATFORMS.WINDOWS;
  if (platform.includes('mac')) return SUPPORTED_PLATFORMS.DARWIN;

  return SUPPORTED_PLATFORMS.LINUX;
}

export function isMacOS(): boolean {
  return getCurrentOS() === SUPPORTED_PLATFORMS.DARWIN;
}
