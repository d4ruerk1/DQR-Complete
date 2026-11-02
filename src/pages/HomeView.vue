<script setup lang="ts">
import { ref, computed, useTemplateRef, shallowRef, provide, watch } from 'vue';
import { onClickOutside, refDebounced, tryOnMounted } from '@vueuse/core';
import { randomString } from '@/utils/random-string';
import { GameActionsProvider, GameExecutable, type Game } from '@/types/types';
import IconVerified from '@/components/IconVerified.vue';
import GameExecutables from '@/components/GameExecutables.vue';
import { GameActionsKey } from '@/constants/constants';
import { drqBridge, PresenceActivityKind } from '@/services/drq-bridge';
import { useFetchGameList } from '@/composables/fetch-gamelist';
import { useGlobalState } from '@/composables/app-state';
import { useDetectedApps, waitRpcOutcome } from '@/composables/detect-apps';
import TimedNotification from '@/components/TimedNotification.vue';

const {
    gameDB,
    isLoadingCache,
    isLoadingDiscord,
    fetchGameList,
    isReadyCache,
    isReadyDiscord,
    allFetchDone,
    usingOfflineCache
} = useFetchGameList();
const { addLog } = useGlobalState();

const showDetectedApps = ref(localStorage.getItem("drq.showDetectedApps") !== "0");
if (typeof window !== "undefined") {
    window.addEventListener("drq:pref-change", () => {
        showDetectedApps.value = localStorage.getItem("drq.showDetectedApps") !== "0";
    });
}

// Installed applications & RPC presence
const {
    detectedApps,
    isDetecting,
    activeAppKey,
    spotifyTrack,
    dismissedKeys,
    spotifyAppId,
    spotifySyncPlayback,
    spotifyCustomTitle,
    spotifyCustomArtist,
    setSpotifyConfig,
    detectApps,
    removeDetectedApp,
    restoreDismissedApps,
    startAppPresence,
    stopAppPresence
} = useDetectedApps();

// Spotify quick configuration modal state
const isSpotifyModalOpen = ref(false);
const spotifyModalClientId = ref(spotifyAppId.value);
const spotifyModalSync = ref(spotifySyncPlayback.value);
const spotifyModalTitle = ref(spotifyCustomTitle.value);
const spotifyModalArtist = ref(spotifyCustomArtist.value);

function saveSpotifyQuickConfig() {
    setSpotifyConfig({
        appId: spotifyModalClientId.value,
        syncPlayback: spotifyModalSync.value,
        customTitle: spotifyModalTitle.value,
        customArtist: spotifyModalArtist.value
    });
    isSpotifyModalOpen.value = false;
    addLog('info', 'Configurazione Spotify salvata con successo.');
}

tryOnMounted(async () => {
    await fetchGameList();
    await detectApps();
});

// Search functionality
const searchQuery = shallowRef('');
const debouncedSearchQuery = refDebounced(searchQuery, 300);

let lastFetchTime = 0;
// Quando avvio o cerco qualcosa, aggiorna il file interno che contiene le app supportate da Discord
watch(debouncedSearchQuery, async (val: string | undefined) => {
    if (val && val.trim().length > 0 && Date.now() - lastFetchTime > 5000) {
        lastFetchTime = Date.now();
        try {
            await fetchGameList();
        } catch (_) {}
    }
});

// Installed applications matching the current search query
const appSearchResults = computed(() => {
    const q = debouncedSearchQuery.value?.trim().toLowerCase();
    if (!q) return [];
    return detectedApps.value
        .filter(
            app =>
                app.name.toLowerCase().includes(q) ||
                app.aliases.some(alias => alias.toLowerCase().includes(q))
        )
        .slice(0, 6);
});

const shouldShowNotificationContainer = computed(() => {
    return (
        isLoadingDiscord.value ||
        isLoadingCache.value ||
        isReadyDiscord.value ||
        isReadyCache.value
    );
});

const searchResultContainerRef = useTemplateRef<HTMLElement>(
    'searchResultContainerRef'
);

const searchResultsIsOpen = ref(false);
const isOnSearchResults = ref(false);

// Game status
const currentlyPlaying = ref<string | null>(null);

onClickOutside(searchResultContainerRef, () => {
    searchResultsIsOpen.value = false;
});

const searchResults = computed(() => {
    const q = debouncedSearchQuery.value?.trim().toLowerCase();
    if (!q) return [];
    const list = gameDB.value || [];
    const res: { item: Game }[] = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.name && item.name.toLowerCase().includes(q)) {
            res.push({ item });
            if (res.length >= 25) break;
            continue;
        }
        if (item.aliases && item.aliases.some((a: string) => a.toLowerCase().includes(q))) {
            res.push({ item });
            if (res.length >= 25) break;
        }
    }
    return res;
});

// Selected games list
const gameList = ref<Game[]>([]);
const selectedGameId = ref<string | null | undefined>(null);

const selectedGame = computed(() => {
    if (!selectedGameId.value) return null;
    return gameList.value.find(g => g.uid === selectedGameId.value) || null;
});

function closeSearchResults() {
    searchResultsIsOpen.value = false;
}
function openSearchResults() {
    searchResultsIsOpen.value = true;
}

// Function to add a game/app to the selected list
function addGameToList(game: Game) {
    if (!gameList.value.some(g => g.id === game.id)) {
        gameList.value.push({
            uid: randomString(),
            ...game
        });
    }
    closeSearchResults();
}

// Function to remove a game/app from the selected list
function removeGameFromList(game: Game) {
    const gameId = game.uid;
    gameList.value = gameList.value.filter(g => g.uid !== gameId);
    if (selectedGame.value?.uid === gameId) {
        selectedGameId.value = null;
    }
}

function selectGame(game: Game) {
    selectedGameId.value = game?.uid;
    searchResultsIsOpen.value = false;
}

function canCreateDummyGame(game: Game | null) {
    if (!game) return false;
    return !game.is_installed;
}

function canPlayGame(game: Game | null) {
    if (!game) return false;
    return (game.is_installed && !game.is_running) ?? false;
}

function isExecutableRunning(executable: GameExecutable) {
    return executable.is_running ?? false;
}
function isGameExecutableInstalled(executable: GameExecutable) {
    return executable.is_installed ?? false;
}

function isGameInstalled(game: Game | null) {
    if (!game) return false;
    return game.is_installed ?? false;
}

// Create a dummy game
async function createDummyGame(game: Game | null, executable: GameExecutable) {
    if (!game) return false;
    const gameUid = game.uid;
    const gameToInstall = gameList.value.find(g => g.uid === gameUid);
    const executableItem = gameToInstall?.executables.find(
        exe => exe.name === executable.name
    );
    if (gameToInstall && executableItem) {
        try {
            await drqBridge.prepareDummyGame({
                appId: Number(gameToInstall.id),
                relativePath: executable.path || '',
                binaryName: executable.filename || '',
                title: gameToInstall.name
            });
        } catch (err) {
            console.warn('Avviso preparazione runner dummy (la presenza RPC partirà comunque):', err);
        }
        gameToInstall.is_installed = true;
        executableItem.is_installed = true;
        return true;
    }
    return false;
}

async function installAndPlay({
    game,
    executable
}: {
    game: Game;
    executable: GameExecutable;
}) {
    if (!game) return;
    await createDummyGame(game, executable);
    await playGame({ game, executable });
}

// Play game function with consistent Discord Rich Presence (RPC) activation
async function playGame({
    game,
    executable
}: {
    game: Game;
    executable: GameExecutable;
}) {
    if (!game) return;
    const gameUid = game.uid;
    try {
        addLog('info', `Avvio Rich Presence per: ${game.name}`);
        currentlyPlaying.value = game.id;
        
        const gameToPlay = gameList.value.find(g => g.uid === gameUid);
        const executableItem = gameToPlay?.executables.find(
            exe => exe.name === executable.name
        );
        if (gameToPlay && executableItem) {
            // 1. Invia la Rich Presence a Discord tramite il client ID del gioco/app
            try {
                const outcome = waitRpcOutcome();
                await drqBridge.setPresence({
                    clientId: String(gameToPlay.id),
                    activityType: PresenceActivityKind.Playing,
                    details: game.name,
                    state: 'In Game',
                    startTime: Math.floor(Date.now() / 1000)
                });
                await outcome;
                addLog('info', `Rich Presence Discord avviata con successo per: ${game.name}`);
            } catch (rpcErr) {
                console.warn('Attenzione Discord RPC:', rpcErr);
                addLog('warning', `Discord RPC: ${String(rpcErr)}`);
            }

            // 2. Avvia anche il processo fittizio locale in background (se supportato)
            try {
                await drqBridge.launchDummyGame({
                    appId: Number(gameToPlay.id),
                    relativePath: executable.path || '',
                    binaryName: executable.filename || '',
                    title: game.name
                });
            } catch (dummyErr) {
                console.warn('Avvio runner secondario ignorato (RPC attiva):', dummyErr);
            }

            gameToPlay.is_running = true;
            executableItem.is_running = true;
        }
    } catch (error) {
        console.error('Failed to launch game:', error);
    }
}

// Stop playing
async function stopPlaying({
    game,
    executable
}: {
    game: Game;
    executable: GameExecutable;
}) {
    if (!game) return;
    const gameUid = game.uid;
    currentlyPlaying.value = null;

    const gameToPlay = gameList.value.find(g => g.uid === gameUid);
    const executableItem = gameToPlay?.executables.find(
        exe => exe.name === executable.name
    );
    if (gameToPlay && executableItem) {
        try {
            await drqBridge.clearPresence();
            addLog('info', `Rich Presence Discord rimossa per: ${game.name}`);
        } catch (rpcErr) {
            console.warn('Errore clearPresence:', rpcErr);
        }

        if (executable.filename) {
            try {
                await drqBridge.terminateDummyGame(executable.filename);
                addLog('info', `Processo terminato: ${executable.name}`);
            } catch (error) {
                console.error('Failed to stop game process:', error);
            }
        }

        gameToPlay.is_running = false;
        executableItem.is_running = false;
    }
}

function handleSearchBlur() {
    setTimeout(() => {
        if (!isOnSearchResults.value) {
            searchResultsIsOpen.value = false;
        }
    }, 200);
}

provide<GameActionsProvider>(GameActionsKey, {
    canPlayGame,
    isGameInstalled,
    isExecutableRunning,
    isGameExecutableInstalled
});
</script>

<template>
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <!-- Fetch status toasts -->
        <Transition
            enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
            leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"
            enter-from-class="opacity-0 translate-y-2 ease-in-out"
            enter-to-class="opacity-100 translate-y-0 ease-in-out"
        >
            <div
                class="pointer-events-none fixed top-24 right-4 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2"
                v-if="shouldShowNotificationContainer && !allFetchDone"
            >
                <Transition
                    enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
                    leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"
                    enter-from-class="opacity-0 translate-y-2 ease-in-out"
                    enter-to-class="opacity-100 translate-y-0 ease-in-out"
                >
                    <div
                        v-if="isLoadingDiscord"
                        class="card px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                        Aggiornamento catalogo da Discord...
                        <span
                            class="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"
                        ></span>
                    </div>
                </Transition>
                <TimedNotification
                    :is-ready="isReadyDiscord"
                    :duration="1500"
                    container-class="card px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                >
                    Catalogo Discord aggiornato
                    <span class="text-green-400">✓</span>
                </TimedNotification>

                <Transition
                    enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
                    leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"
                    enter-from-class="opacity-0 translate-y-2 ease-in-out"
                    enter-to-class="opacity-100 translate-y-0 ease-in-out"
                >
                    <div
                        v-if="isLoadingCache"
                        class="card px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                        Caricamento catalogo locale (offline)...
                        <span
                            class="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"
                        ></span>
                    </div>
                </Transition>
                <TimedNotification
                    :is-ready="isReadyCache"
                    :duration="1500"
                    container-class="card px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                >
                    Catalogo locale caricato
                    <span class="text-green-400">✓</span>
                </TimedNotification>
            </div>
        </Transition>

        <!-- Search Bar -->
        <div class="mb-6">
            <div class="relative" ref="searchResultContainerRef">
                <div class="relative">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cerca giochi o applicazioni supportate da Discord..."
                        class="input pl-9 pr-4"
                        @focus="openSearchResults"
                        @blur="handleSearchBlur"
                    />
                </div>
                <div
                    v-if="searchResultsIsOpen"
                    @click="isOnSearchResults = true"
                    class="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
                >
                    <div v-if="searchResults.length > 0">
                        <div
                            v-for="game in searchResults"
                            :key="game.item.id"
                            class="border-b border-gray-200 p-3 last:border-b-0 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            <div
                                class="flex flex-wrap items-center justify-between gap-2"
                            >
                                <div class="min-w-0">
                                    <div
                                        class="font-medium break-words text-gray-800 dark:text-white"
                                    >
                                        {{ game.item.name }}
                                    </div>
                                    <div
                                        class="text-sm text-gray-500 dark:text-gray-400"
                                    >
                                        ID: {{ game.item.id }}
                                    </div>
                                    <div
                                        v-if="game.item.executables && game.item.executables.length > 0"
                                        class="text-xs text-gray-500 dark:text-gray-400"
                                    >
                                        Eseguibili:
                                        <ul class="list-inside list-disc">
                                            <li
                                                v-for="exe in game.item.executables"
                                                :key="exe.name"
                                                class="text-gray-500 dark:text-gray-400"
                                            >
                                                <span class="font-mono">
                                                    {{ exe.name }} ({{ exe.os }})
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <button
                                    @click="addGameToList(game.item)"
                                    class="btn btn-primary shrink-0"
                                >
                                    Aggiungi ad Applicazioni
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- Detected applications matching the query -->
                    <div v-if="appSearchResults.length > 0">
                        <div
                            class="border-t border-gray-200 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:border-gray-700 dark:text-gray-500"
                        >
                            Applicazioni rilevate (Rich Presence)
                        </div>
                        <div
                            v-for="app in appSearchResults"
                            :key="app.key"
                            class="border-b border-gray-200 p-3 last:border-b-0 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            <div
                                class="flex flex-wrap items-center justify-between gap-2"
                            >
                                <div class="min-w-0">
                                    <div
                                        class="font-medium break-words text-gray-800 dark:text-white"
                                    >
                                        {{ app.name }}
                                    </div>
                                    <div
                                        v-if="
                                            activeAppKey === app.key &&
                                            app.spotify &&
                                            spotifyTrack
                                        "
                                        class="text-xs text-green-500 dark:text-green-400"
                                    >
                                        {{ spotifyTrack.title }} — {{ spotifyTrack.artist }}
                                    </div>
                                </div>
                                <button
                                    v-if="activeAppKey !== app.key"
                                    @click="startAppPresence(app)"
                                    class="btn shrink-0 bg-violet-600 text-white hover:bg-violet-500"
                                >
                                    Avvia presenza
                                </button>
                                <button
                                    v-else
                                    @click="stopAppPresence()"
                                    class="btn btn-danger shrink-0"
                                >
                                    Ferma
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- Empty help -->
                    <div
                        v-if="searchResults.length === 0 && appSearchResults.length === 0"
                        class="p-3 text-gray-500 dark:text-gray-400 text-xs"
                    >
                        Cerca qualsiasi gioco o applicazione supportata da Discord per nome. <br />
                        Clicca "Aggiungi ad Applicazioni" per gestirla nell'elenco sottostante.
                    </div>
                </div>
            </div>
        </div>

        <!-- Unified Applications section: "Applicazioni rilevate" integrata dentro la sezione "Applicazioni" (ex Giochi) -->
        <div class="w-full">
            <section class="card card-pad min-w-0">
                <div
                    class="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 bg-white py-2 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800/80"
                >
                    <!-- Titolo rinominato da Giochi in Applicazioni -->
                    <h2 class="section-title">Applicazioni</h2>

                    <!-- Offline badge -->
                    <span
                        v-if="usingOfflineCache"
                        class="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400"
                        title="Il catalogo è attualmente caricato dalla cache offline."
                    >
                        Cache offline
                    </span>

                    <!-- Status indicator -->
                    <div
                        class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                        <span
                            class="inline-block h-3 w-3 rounded-full shadow-sm"
                            :class="{
                                'bg-green-500 shadow-green-400':
                                    currentlyPlaying !== null || activeAppKey !== null,
                                'bg-gray-400':
                                    currentlyPlaying === null && activeAppKey === null
                            }"
                        ></span>
                        <template v-if="activeAppKey">
                            In esecuzione:
                            <span class="text-green-500 font-medium">{{
                                detectedApps.find(a => a.key === activeAppKey)?.name || activeAppKey
                            }}</span>
                            <template v-if="spotifyTrack">
                                &mdash;
                                <span class="text-green-500">
                                    {{ spotifyTrack.title }} &mdash; {{ spotifyTrack.artist }}
                                </span>
                            </template>
                        </template>
                        <template v-else-if="currentlyPlaying">
                            In esecuzione:
                            <span class="text-green-500 font-medium">{{
                                gameList.find(g => g.id === currentlyPlaying)?.name
                            }}</span>
                        </template>
                        <template v-else>Inattivo</template>
                    </div>
                </div>

                <!-- ZONA APPLICAZIONI RILEVATE INTEGRATA (Pulsanti SENZA SLIDER, rimovibili) -->
                <div
                    v-if="showDetectedApps && (detectedApps.length > 0 || dismissedKeys.length > 0)"
                    class="mb-5 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-950/40"
                >
                    <div class="mb-2.5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Applicazioni rilevate
                            </span>
                            <span class="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-500 dark:text-indigo-400">
                                {{ detectedApps.length }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button
                                v-if="dismissedKeys.length > 0"
                                @click="restoreDismissedApps"
                                class="cursor-pointer text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                title="Ripristina le applicazioni rilevate rimosse"
                            >
                                Ripristina rimosse ({{ dismissedKeys.length }})
                            </button>
                            <button
                                @click="detectApps()"
                                :disabled="isDetecting"
                                class="btn btn-ghost btn-xs text-xs"
                            >
                                {{ isDetecting ? "Scansione..." : "Aggiorna rilevate" }}
                            </button>
                        </div>
                    </div>

                    <!-- Pulsanti senza slider: flex wrap ordinato di pulsanti -->
                    <div v-if="detectedApps.length > 0" class="flex flex-wrap gap-2 pt-1">
                        <div
                            v-for="app in detectedApps"
                            :key="app.key"
                            class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all text-xs"
                            :class="
                                activeAppKey === app.key
                                    ? 'border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100 ring-1 ring-violet-500/30'
                                    : 'border-gray-200 bg-white text-gray-800 dark:border-gray-700/80 dark:bg-gray-800/80 dark:text-gray-200'
                            "
                        >
                            <!-- Nome app -->
                            <span class="font-medium truncate max-w-[130px]">{{ app.name }}</span>
                            <span
                                v-if="app.key === 'spotify' && activeAppKey === 'spotify' && spotifyTrack"
                                class="text-[11px] text-green-500 max-w-[120px] truncate"
                                :title="`${spotifyTrack.title} — ${spotifyTrack.artist}`"
                            >
                                ({{ spotifyTrack.title }})
                            </span>

                            <!-- Pulsante Avvia / Ferma -->
                            <button
                                v-if="activeAppKey !== app.key"
                                @click="startAppPresence(app)"
                                class="btn btn-xs btn-primary text-[11px] px-2 py-0.5 rounded-md"
                            >
                                Avvia
                            </button>
                            <button
                                v-else
                                @click="stopAppPresence()"
                                class="btn btn-xs btn-error text-[11px] px-2 py-0.5 rounded-md"
                            >
                                Ferma
                            </button>

                            <!-- Ingranaggio configurazione coerente Spotify -->
                            <button
                                v-if="app.key === 'spotify'"
                                @click="isSpotifyModalOpen = true"
                                title="Configura Spotify"
                                class="cursor-pointer p-0.5 text-gray-400 hover:text-green-500 transition-colors"
                            >
                                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                                </svg>
                            </button>

                            <!-- Pulsante per rimuovere l'app rilevata -->
                            <button
                                @click.stop="removeDetectedApp(app.key)"
                                title="Rimuovi da rilevate"
                                class="cursor-pointer p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div v-else class="text-xs text-gray-400 py-1">
                        Tutte le applicazioni rilevate sono state rimosse. Clicca su "Ripristina rimosse" per riattivarle.
                    </div>
                </div>

                <!-- Elenco Applicazioni Selezionate -->
                <div class="mb-3 flex items-center justify-between">
                    <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Applicazioni selezionate ({{ gameList.length }})
                    </span>
                </div>

                <div
                    v-if="gameList.length === 0"
                    class="py-8 text-center text-gray-500 dark:text-gray-400 text-xs"
                >
                    Nessuna applicazione selezionata. Cerca e aggiungi giochi o applicazioni dalla barra di ricerca.
                </div>
                <div v-else class="space-y-3">
                    <div
                        v-for="game in gameList"
                        :key="game.uid"
                        class="cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors duration-200 ease-in-out hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800/60"
                        :class="[
                            {
                                'bg-gray-100 ring-1 ring-violet-500/40 shadow-[0px_0px_8px_2px_#8e51ff50] dark:bg-gray-800/60':
                                    selectedGame?.uid === game.uid
                            }
                        ]"
                        @click="selectGame(game)"
                    >
                        <div
                            class="flex flex-wrap items-center justify-between gap-2"
                        >
                            <div class="flex min-w-0 items-center gap-1.5">
                                <div
                                    class="font-medium break-words text-gray-800 dark:text-white"
                                >
                                    {{ game.name }}
                                </div>
                                <div class="relative inline-flex items-center">
                                    <div
                                        class="absolute h-2 w-2 rounded-full bg-white"
                                        style="
                                            left: 50%;
                                            top: 50%;
                                            transform: translate(-50%, -50%);
                                        "
                                    ></div>
                                    <div class="relative inline-block">
                                        <IconVerified
                                            class="h-5 w-5 text-indigo-500 dark:text-indigo-400"
                                        ></IconVerified>
                                    </div>
                                </div>
                                <div
                                    class="ml-2 text-xs font-medium text-green-500 dark:text-green-400"
                                    v-if="game.is_running"
                                >
                                    ● In esecuzione su Discord
                                </div>
                            </div>
                            <button
                                @click.stop="removeGameFromList(game)"
                                class="btn btn-sm text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                v-if="!game.is_running"
                            >
                                Rimuovi
                            </button>
                        </div>

                        <!-- Actions for the selected game -->
                        <div
                            v-if="selectedGame?.uid === game.uid"
                            class="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700"
                            @click.stop
                        >
                            <div
                                class="mb-3 text-xs break-all text-gray-500 dark:text-gray-400"
                            >
                                <strong>ID Discord:</strong> {{ game.id }}
                                <template
                                    v-if="game.aliases && game.aliases.length > 0"
                                >
                                    <br />
                                    <strong>Alias:</strong>
                                    <span
                                        v-for="(alias, i) in game.aliases"
                                        :key="alias"
                                        class="font-mono"
                                    >
                                        {{ alias }}<template v-if="i < game.aliases.length - 1">, </template>
                                    </span>
                                </template>
                            </div>

                            <GameExecutables
                                :game="game"
                                @play="playGame"
                                @stop="stopPlaying"
                                @install_and_play="installAndPlay"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Modal configurazione rapida Spotify -->
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="isSpotifyModalOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                @click.self="isSpotifyModalOpen = false"
            >
                <div
                    class="card flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
                >
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
                        <div class="flex items-center gap-2">
                            <span class="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                            <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                                Configurazione Spotify Discord
                            </h3>
                        </div>
                        <button
                            @click="isSpotifyModalOpen = false"
                            class="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            title="Chiudi"
                        >
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="mt-4 space-y-4 text-xs">
                        <div>
                            <label class="block font-medium text-gray-700 dark:text-gray-300">
                                Discord Client ID
                            </label>
                            <input
                                type="text"
                                v-model="spotifyModalClientId"
                                class="input input-sm mt-1 w-full"
                                placeholder="1021481123471183882"
                            />
                            <p class="text-[11px] text-gray-400 mt-1">
                                Client ID dell'applicazione Discord configurata per Spotify RPC.
                            </p>
                        </div>

                        <div class="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">Rileva automaticamente brano</span>
                                <p class="text-[11px] text-gray-400">Legge artista e traccia dal player Spotify in esecuzione</p>
                            </div>
                            <input
                                type="checkbox"
                                v-model="spotifyModalSync"
                                class="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                            />
                        </div>

                        <div v-if="!spotifyModalSync" class="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div>
                                <label class="block font-medium text-gray-700 dark:text-gray-300">Titolo personalizzato</label>
                                <input
                                    type="text"
                                    v-model="spotifyModalTitle"
                                    class="input input-sm mt-1 w-full"
                                    placeholder="Nome del brano"
                                />
                            </div>
                            <div>
                                <label class="block font-medium text-gray-700 dark:text-gray-300">Artista personalizzato</label>
                                <input
                                    type="text"
                                    v-model="spotifyModalArtist"
                                    class="input input-sm mt-1 w-full"
                                    placeholder="Nome dell'artista"
                                />
                            </div>
                        </div>

                        <div class="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <button
                                @click="saveSpotifyQuickConfig"
                                class="btn btn-sm btn-primary text-xs"
                            >
                                Salva modifiche
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
