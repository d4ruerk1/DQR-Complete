import { Game } from '@/types/types';
import { tryOnMounted, useAsyncState } from '@vueuse/core';
import { ref, shallowRef, watch } from 'vue';
import { message } from '@tauri-apps/plugin-dialog';
import { drqBridge } from '@/services/drq-bridge';
import { useGlobalState } from './app-state';

export function useFetchGameList() {
  const { addLog } = useGlobalState();

  async function fetchGameListFromGitHub() {
    addLog('Recupero catalogo applicazioni supportate direttamente da Discord via HTTPS...');
    return await drqBridge.fetchCatalogOnline();
  }

  async function loadGameListCache() {
    addLog('Caricamento catalogo memorizzato nella cache locale (modalità offline)...');
    return await drqBridge.loadCachedCatalog();
  }

  const {
    state: gameListOnline,
    error: errorOnline,
    isReady: isReadyOnline,
    execute: executeOnline,
    isLoading: isLoadingOnline
  } = useAsyncState(fetchGameListFromGitHub, [], {
    immediate: false,
    resetOnExecute: true,
  });

  const {
    state: cachedGameList,
    error: errorCache,
    isReady: isReadyCache,
    execute: executeCache,
    isLoading: isLoadingCache
  } = useAsyncState(loadGameListCache, [], {
    immediate: false,
    resetOnExecute: true,
  });

  const fetchError = ref<string | null>(null);
  const usingOfflineCache = ref(false);
  const gameDB = shallowRef<Game[]>([]);
  const allFetchDone = ref(false);

  function isValidGameList(data: any): boolean {
    return Array.isArray(data) && data[0] && 'aliases' in data[0] && 'name' in data[0] && 'executables' in data[0];
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  async function fetchGameList() {
    allFetchDone.value = false;
    usingOfflineCache.value = false;
    fetchError.value = null;
    addLog('Fetching catalog...');

    await executeOnline();

    const onlineListUsable =
      !errorOnline.value &&
      gameListOnline.value &&
      gameListOnline.value.length > 0 &&
      isValidGameList(gameListOnline.value);

    if (!onlineListUsable) {
      addLog('error', 'Online catalog from GitHub unavailable; falling back to local cache.');
      await executeCache();
      const cacheUsable =
        !errorCache.value &&
        cachedGameList.value &&
        cachedGameList.value.length > 0 &&
        isValidGameList(cachedGameList.value);

      if (!cacheUsable) {
        fetchError.value = 'Error fetching catalog from GitHub and no local cache is available.';
        addLog('error', 'No cached catalog available.');
      }
    }

    if (gameListOnline.value && gameListOnline.value.length > 0 && isValidGameList(gameListOnline.value)) {
      gameDB.value = (gameListOnline.value as Game[]) || [];
      addLog(`Using catalog fetched from GitHub repository. ${gameDB.value.length} entries.`);
    } else if (cachedGameList.value && cachedGameList.value.length > 0 && isValidGameList(cachedGameList.value)) {
      gameDB.value = (cachedGameList.value as Game[]) || [];
      usingOfflineCache.value = true;
      addLog(`Offline mode: using locally cached catalog. ${gameDB.value.length} entries.`);
    }

    if (fetchError.value) {
      await message(
        'There was an error fetching the catalog from GitHub, and no local cache is available. ' +
        'Please check your network connection. ' + fetchError.value,
        {
          title: 'Catalog Fetch Error',
          kind: 'error',
          buttons: {
            ok: 'OK'
          }
        }
      );
    }

    // Release redundant copies from memory to preserve performance
    if (gameListOnline.value !== gameDB.value) gameListOnline.value = [];
    if (cachedGameList.value !== gameDB.value) cachedGameList.value = [];

    timeoutId = setTimeout(() => {
      allFetchDone.value = true;
    }, 400);
  }

  watch(allFetchDone, (newVal) => {
    if (newVal && timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  tryOnMounted(async () => {
    await fetchGameList();
  });

  return {
    gameListFromDiscord: gameListOnline,
    cachedGameList,
    fetchError,
    isReadyDiscord: isReadyOnline,
    isReadyCache,
    gameDB,
    fetchGameList,
    isLoadingDiscord: isLoadingOnline,
    isLoadingCache,
    allFetchDone,
    usingOfflineCache
  };
}
