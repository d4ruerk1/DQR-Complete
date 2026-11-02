<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Pages, useGlobalState } from '@/composables/app-state';
import { useAutoUpdate } from '@/composables/auto-update';
import { getCurrentWindow } from '@tauri-apps/api/window';
import LegalModal from '@/components/LegalModal.vue';

const appState = useGlobalState();
const { page, setPage } = appState;

const isLegalModalOpen = ref(false);
const legalModalTab = ref<'terms' | 'privacy'>('terms');

function openLegalModal(tab: 'terms' | 'privacy') {
  legalModalTab.value = tab;
  isLegalModalOpen.value = true;
}

const appWindow = getCurrentWindow();

function minimizeWindow() {
  appWindow.minimize();
}

function toggleMaximizeWindow() {
  appWindow.toggleMaximize();
}

function closeWindow() {
  appWindow.close();
}

function onTitlebarDoubleClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('a, button, input, select, textarea')) return;
  toggleMaximizeWindow();
}

const {
  status: updateStatus,
  autoUpdateEnabled,
  checkForUpdates,
  latestVersion,
  downloadAndInstall,
  restartApp
} = useAutoUpdate();

interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
}

const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'ar', label: 'Arabo', nativeLabel: 'العربية' },
  { code: 'zh', label: 'Cinese', nativeLabel: '中文' },
  { code: 'fr', label: 'Francese', nativeLabel: 'Français' },
  { code: 'ja', label: 'Giapponese', nativeLabel: '日本語' },
  { code: 'en', label: 'Inglese', nativeLabel: 'English' },
  { code: 'it', label: 'Italiano', nativeLabel: 'Italiano' },
  { code: 'ru', label: 'Russo', nativeLabel: 'Русский' },
  { code: 'es', label: 'Spagnolo', nativeLabel: 'Español' },
  { code: 'de', label: 'Tedesco', nativeLabel: 'Deutsch' }
];

function detectInitialLanguage(): LanguageOption {
  const saved = localStorage.getItem('drq.language');
  if (saved) {
    const found = AVAILABLE_LANGUAGES.find((l) => l.code === saved);
    if (found) return found;
  }
  const browserLang = (
    (typeof navigator !== 'undefined' &&
      (navigator.language || (navigator as any).userLanguage)) ||
    'en'
  ).toLowerCase();
  for (const lang of AVAILABLE_LANGUAGES) {
    if (browserLang.startsWith(lang.code)) {
      return lang;
    }
  }
  return AVAILABLE_LANGUAGES.find((l) => l.code === 'en')!;
}

const currentLanguage = ref<LanguageOption>(detectInitialLanguage());
const isLangMenuOpen = ref(false);

function selectLanguage(lang: LanguageOption) {
  currentLanguage.value = lang;
  localStorage.setItem('drq.language', lang.code);
  isLangMenuOpen.value = false;
  window.dispatchEvent(
    new CustomEvent('drq:lang-change', { detail: lang.code })
  );
}

const isNavDragging = ref(false);

function startNavDrag(targetPage: Pages) {
  isNavDragging.value = true;
  setPage(targetPage);
}

function handleNavPointerEnter(targetPage: Pages, event: PointerEvent) {
  if (event.buttons === 1 || isNavDragging.value) {
    setPage(targetPage);
  }
}

onMounted(() => {
  window.addEventListener('mouseup', () => {
    isNavDragging.value = false;
  });
  window.addEventListener('pointerup', () => {
    isNavDragging.value = false;
  });
  window.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('#lang-selector-container')) {
      isLangMenuOpen.value = false;
    }
  });
  window.addEventListener('drq:open-legal', (e: any) => {
    openLegalModal(e.detail === 'privacy' ? 'privacy' : 'terms');
  });
  if (autoUpdateEnabled.value) {
    checkForUpdates({ quiet: true });
  }
});
</script>

<template>
  <div
    class="flex h-dvh flex-col overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100"
  >
    <!-- Slim window titlebar -->
    <div
      data-tauri-drag-region
      class="relative flex h-9 shrink-0 select-none items-center justify-between border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      @dblclick="onTitlebarDoubleClick"
    >
      <div data-tauri-drag-region class="flex h-full items-center gap-2 pl-3">
        <img
          data-tauri-drag-region
          src="/logo.png"
          alt=""
          class="h-4 w-4 rounded"
        />
      </div>

      <div
        data-tauri-drag-region
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          data-tauri-drag-region
          class="pointer-events-auto text-xs font-semibold text-gray-500 dark:text-gray-400"
        >
          DRQ Complete
        </span>
      </div>

      <div class="flex h-full items-center">
        <button
          type="button"
          title="Minimize"
          class="flex h-full w-11 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          @click="minimizeWindow"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          title="Maximize"
          class="flex h-full w-11 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          @click="toggleMaximizeWindow"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          title="Close"
          class="flex h-full w-11 items-center justify-center text-gray-500 transition-colors hover:bg-red-500 hover:text-white dark:text-gray-400 dark:hover:bg-red-600"
          @click="closeWindow"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- App header -->
    <header
      class="z-40 shrink-0 border-b border-gray-200/80 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
    >
      <div
        class="relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-2 sm:px-6"
      >
        <!-- Nav: Home / Settings / Logs with fluid mouse drag/swipe -->
        <nav>
          <div
            class="flex select-none items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800"
            @pointerdown="isNavDragging = true"
          >
            <button
              type="button"
              class="cursor-pointer select-none rounded-full px-4 py-1 text-sm font-medium transition-colors"
              :class="
                page === Pages.HOME
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              "
              @pointerdown="startNavDrag(Pages.HOME)"
              @pointerenter="handleNavPointerEnter(Pages.HOME, $event)"
              @click="setPage(Pages.HOME)"
            >
              Home
            </button>
            <button
              type="button"
              class="cursor-pointer select-none rounded-full px-4 py-1 text-sm font-medium transition-colors"
              :class="
                page === Pages.SETTINGS
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              "
              @pointerdown="startNavDrag(Pages.SETTINGS)"
              @pointerenter="handleNavPointerEnter(Pages.SETTINGS, $event)"
              @click="setPage(Pages.SETTINGS)"
            >
              Settings
            </button>
            <button
              type="button"
              class="cursor-pointer select-none rounded-full px-4 py-1 text-sm font-medium transition-colors"
              :class="
                page === Pages.LOGS
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              "
              @pointerdown="startNavDrag(Pages.LOGS)"
              @pointerenter="handleNavPointerEnter(Pages.LOGS, $event)"
              @click="setPage(Pages.LOGS)"
            >
              Logs
            </button>
          </div>
        </nav>

        <!-- Right header controls: Language + Updates -->
        <div class="absolute right-4 flex items-center gap-2 sm:right-6">
          <div id="lang-selector-container" class="relative">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              @click.stop="isLangMenuOpen = !isLangMenuOpen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                />
              </svg>
              <span>{{ currentLanguage.label }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3 text-gray-400 transition-transform"
                :class="{ 'rotate-180': isLangMenuOpen }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </button>

            <div
              v-if="isLangMenuOpen"
              class="absolute right-0 z-50 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <button
                v-for="l in AVAILABLE_LANGUAGES"
                :key="l.code"
                type="button"
                class="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                :class="
                  currentLanguage.code === l.code
                    ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300'
                "
                @click="selectLanguage(l)"
              >
                <span>{{ l.label }}</span>
                <span class="text-[10px] font-normal text-gray-400">{{
                  l.nativeLabel
                }}</span>
              </button>
            </div>
          </div>

          <button
            v-if="updateStatus === 'available'"
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-500"
            @click="downloadAndInstall"
          >
            <span>v{{ latestVersion }}</span>
          </button>
          <span
            v-else-if="updateStatus === 'downloading'"
            class="flex items-center gap-1.5 rounded-full bg-violet-600/80 px-3 py-1 text-xs font-medium text-white"
          >
            Updating…
          </span>
          <button
            v-else-if="updateStatus === 'ready'"
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-500"
            @click="restartApp"
          >
            <span>Riavvia</span>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto">
      <slot></slot>
    </main>

    <footer
      class="shrink-0 border-t border-gray-200 bg-white py-2 dark:border-gray-800 dark:bg-gray-900"
    >
      <div
        class="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-1.5 px-4 text-xs text-gray-500 sm:px-6 dark:text-gray-400"
      >
        <div class="text-center">
          <span>&copy; 2026 by d4ruerk1</span>
        </div>
        <div class="grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div class="flex min-w-0 items-center justify-end gap-3">
            <button
              type="button"
              class="cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-500 dark:hover:text-indigo-400"
              @click="openLegalModal('terms')"
            >
              Termini di Utilizzo
            </button>
            <span class="text-gray-300 dark:text-gray-600">&bull;</span>
          </div>

          <a
            href="https://ko-fi.com/d4ruerk1"
            target="_blank"
            class="flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors hover:text-amber-500 dark:hover:text-amber-400"
          >
            <span>Donate</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          </a>

          <div class="flex min-w-0 items-center justify-start gap-3">
            <span class="text-gray-300 dark:text-gray-600">&bull;</span>
            <button
              type="button"
              class="cursor-pointer whitespace-nowrap transition-colors hover:text-indigo-500 dark:hover:text-indigo-400"
              @click="openLegalModal('privacy')"
            >
              Privacy
            </button>
          </div>
        </div>
      </div>
    </footer>

    <!-- Legal Modal for Terms of Use & Privacy Policy (con chiusura solo con 'X') -->
    <LegalModal
      :is-open="isLegalModalOpen"
      :initial-tab="legalModalTab"
      @close="isLegalModalOpen = false"
    />
  </div>
</template>
