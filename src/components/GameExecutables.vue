<template>
    <div class="text-gray-500 dark:text-gray-400">
        <p v-if="isMac" class="mb-3 text-xs text-gray-500 dark:text-gray-400">
            A small game window opens while playing. Discord on macOS usually only detects apps with a visible window.
        </p>

        <p v-if="isLinux" class="mb-3 text-xs text-gray-500 dark:text-gray-400">
            On Linux a tiny background process (no window) is started; Discord detects it from the process list.
        </p>

        <template v-if="bestExecutable">
            <p class="text-xs mb-2 text-gray-500 dark:text-gray-400">
                Executable selected automatically for your platform
                ({{ currentPlatform }}):
            </p>

            <div
                class="grid grid-cols-[1fr_auto] gap-2 items-center w-full text-xs"
            >
                <!-- Executable name, fades when too long -->
                <div class="relative overflow-hidden">
                    <div
                        class="flex flex-nowrap overflow-x-auto scrollbar-none max-w-full pr-4 fade-right"
                    >
                        <div
                            v-for="(section, i) in splitExecutableName(bestExecutable)"
                            :key="i"
                            class="text-center border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 mr-1 whitespace-nowrap"
                        >
                            <span>{{ section }}</span>
                        </div>
                    </div>
                </div>

                <div class="justify-self-end">
                    <button
                        class="btn"
                        :class="[
                            {
                                'btn-primary':
                                    !gameActions?.isExecutableRunning(bestExecutable),
                                'btn-danger':
                                    gameActions?.isExecutableRunning(bestExecutable)
                            }
                        ]"
                        @click="handleLaunch(bestExecutable)"
                    >
                        {{
                            gameActions?.isExecutableRunning(bestExecutable)
                                ? 'Stop'
                                : 'Play'
                        }}
                    </button>
                </div>
            </div>

            <p
                v-if="usingCrossPlatformFallback"
                class="text-xs mt-2 text-amber-600 dark:text-amber-400"
            >
                No {{ isMac ? 'macOS' : 'Linux' }} executable is registered for
                this game. Using the Windows executable name as a fallback.
            </p>
        </template>

        <p v-else class="text-sm mt-2 text-yellow-500">
            Discord has not registered any launchable executables for this
            game, or there are no executables available for your platform
            ({{ currentPlatform }}).
        </p>
    </div>
</template>

<script setup lang="ts">
import {
    EXECUTABLE_OS,
    GameActionsKey,
    getCurrentOS,
    isMacOS
} from '@/constants/constants';
import {
    GameActionsProvider,
    type Game,
    type GameExecutable
} from '@/types/types';
import { path } from '@tauri-apps/api';
import { computed, inject } from 'vue';

const props = defineProps<{
    game: Game;
}>();

const emit = defineEmits<{
    play: [{ game: Game; executable: GameExecutable }];
    stop: [{ game: Game; executable: GameExecutable }];
    install_and_play: [{ game: Game; executable: GameExecutable }];
}>();

const gameActions = inject<GameActionsProvider>(GameActionsKey);

function isValidPath(name: string) {
    const illegalChars = ['>', '<', ':', '"', '|', '?', '*'];
    return !illegalChars.some(char => name.includes(char));
}

const validExecutables = computed(() =>
    props.game.executables.filter(executable => isValidPath(executable.name))
);

const currentPlatform = getCurrentOS();

const isMac = isMacOS();
const isLinux = currentPlatform === EXECUTABLE_OS.LINUX;

const platformExecutables = computed(() =>
    validExecutables.value.filter(
        executable => executable.os === currentPlatform
    )
);

const usingCrossPlatformFallback = computed(() => {
    return (
        validExecutables.value.length > 0 &&
        platformExecutables.value.length === 0
    );
});

/**
 * Automatically picks the single executable most likely to make Discord
 * detect the game:
 *  1. executables registered for the current platform (fallback: any
 *     platform, Discord matches by process name anyway);
 *  2. prefer the real game binary over launchers/updaters;
 *  3. prefer the shortest path (usually the main binary at the install root).
 */
const bestExecutable = computed<GameExecutable | null>(() => {
    const candidates =
        platformExecutables.value.length > 0
            ? platformExecutables.value
            : validExecutables.value;

    if (candidates.length === 0) {
        return null;
    }

    return [...candidates].sort((a, b) => {
        const launcherScore = Number(a.is_launcher) - Number(b.is_launcher);
        if (launcherScore !== 0) return launcherScore;
        return a.name.length - b.name.length;
    })[0];
});

function splitExecutableName(executable: GameExecutable) {
    const allSections = executable.name.split(/\\|\//);

    const last = executable.name.split(/\\|\//).pop();
    // remove file extension if there was none, just return the last section
    const name = last?.split('.').slice(0, -1).join('.') || last;
    return [...allSections.slice(0, -1), name];
}

function getExecutablePath(executable: GameExecutable) {
    const allSections = executable.name.split(/\\|\//);
    const last = executable.name.split(/\\|\//).pop();
    // remove file extension if there was none, just return the last section
    const name = last?.split('.').slice(0, -1).join('.') || last;
    return [...allSections.slice(0, -1)].join(path.sep());
}

function getFilename(executable: GameExecutable) {
    const last = executable.name.split(/\\|\//).pop();
    // remove file extension if there was none, just return the last section
    return last;
}

function handleLaunch(executable: GameExecutable) {
    if (executable.is_running) {
        emit('stop', {
            game: props.game,
            executable: {
                path: getExecutablePath(executable),
                segments: splitExecutableName(executable).length,
                filename: getFilename(executable),
                ...executable
            }
        });
    } else {
        if (!gameActions?.isGameExecutableInstalled(executable)) {
            emit('install_and_play', {
                game: props.game,
                executable: {
                    path: getExecutablePath(executable),
                    segments: splitExecutableName(executable).length,
                    filename: getFilename(executable),
                    ...executable
                }
            });
        } else {
            emit('play', {
                game: props.game,
                executable: {
                    path: getExecutablePath(executable),
                    segments: splitExecutableName(executable).length,
                    filename: getFilename(executable),
                    ...executable
                }
            });
        }
    }
}
</script>

<style scoped>
.fade-right {
    -webkit-mask-image: linear-gradient(
        to right,
        black 85%,
        transparent 100%
    );
    mask-image: linear-gradient(to right, black 85%, transparent 100%);
}

.scrollbar-none {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.scrollbar-none::-webkit-scrollbar {
    display: none;
}
</style>
