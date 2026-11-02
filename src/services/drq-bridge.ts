import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Game } from '@/types/types';

export enum PresenceActivityKind {
  Playing = 0,
  Listening = 2,
  Watching = 3,
  Competing = 5
}

export interface SetPresenceParams {
  clientId: string;
  state?: string;
  details?: string;
  activityType?: PresenceActivityKind;
  startTime?: number;
  imageKey?: string;
  imageText?: string;
}

export interface DummyGameSpec {
  appId: number;
  relativePath: string;
  binaryName: string;
  title?: string;
}

export interface AppDetectionHint {
  key: string;
  binaries: string[];
  paths: string[];
}

export interface SpotifyPlaybackInfo {
  artist: string;
  title: string;
}

export const DRQ_EVENTS = {
  CONNECTING: 'drq:presence-connecting',
  CONNECTED: 'drq:presence-connected',
  DISCONNECTED: 'drq:presence-disconnected',
  ERROR: 'drq:presence-error'
} as const;

export class DrqBridge {
  async setPresence(params: SetPresenceParams): Promise<void> {
    await invoke('set_presence', {
      payload: {
        client_id: params.clientId,
        state: params.state ?? null,
        details: params.details ?? null,
        activity_type: params.activityType ?? PresenceActivityKind.Playing,
        start_time: params.startTime ?? null,
        image_key: params.imageKey ?? null,
        image_text: params.imageText ?? null
      }
    });
  }

  async clearPresence(): Promise<void> {
    await invoke('clear_presence');
  }

  async prepareDummyGame(spec: DummyGameSpec): Promise<string> {
    return await invoke<string>('prepare_dummy_game', {
      spec: {
        app_id: spec.appId,
        relative_path: spec.relativePath,
        binary_name: spec.binaryName,
        title: spec.title ?? null
      }
    });
  }

  async launchDummyGame(spec: DummyGameSpec): Promise<string> {
    return await invoke<string>('launch_dummy_game', {
      spec: {
        app_id: spec.appId,
        relative_path: spec.relativePath,
        binary_name: spec.binaryName,
        title: spec.title ?? null
      }
    });
  }

  async terminateDummyGame(binaryName: string): Promise<void> {
    await invoke('terminate_dummy_game', {
      binaryName: binaryName,
      binary_name: binaryName
    });
  }

  async fetchCatalogOnline(): Promise<Game[]> {
    const raw = await invoke<string>('fetch_catalog_online');
    return JSON.parse(raw) as Game[];
  }

  async loadCachedCatalog(): Promise<Game[]> {
    const raw = await invoke<string>('load_cached_catalog');
    return JSON.parse(raw) as Game[];
  }

  async getCatalogCacheMetadata(): Promise<number | null> {
    return await invoke<number | null>('get_catalog_cache_metadata');
  }

  async detectSystemApps(rules: AppDetectionHint[]): Promise<string[]> {
    return await invoke<string[]>('detect_system_apps', {
      rules
    });
  }

  async getSpotifyPlayback(): Promise<SpotifyPlaybackInfo | null> {
    return await invoke<SpotifyPlaybackInfo | null>('get_spotify_playback');
  }

  onPresenceConnected(callback: (payload: { client_id: string }) => void): Promise<UnlistenFn> {
    return listen(DRQ_EVENTS.CONNECTED, (evt) => callback(evt.payload as any));
  }

  onPresenceError(callback: (payload: { error: string }) => void): Promise<UnlistenFn> {
    return listen(DRQ_EVENTS.ERROR, (evt) => callback(evt.payload as any));
  }
}

export const drqBridge = new DrqBridge();
