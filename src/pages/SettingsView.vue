<script setup lang="ts">
import { ref } from "vue";
import { useDetectedApps } from "@/composables/detect-apps";
import {
  useAutomations,
  type Automation,
  type AutomationRepeat,
  type AutomationTarget
} from "@/composables/automations";
import { KNOWN_APPS } from "@/services/known-apps";
import { useAutoUpdate } from "@/composables/auto-update";

const {
  status: updateStatus,
  autoUpdateEnabled,
  setAutoUpdateEnabled,
  checkForUpdates
} = useAutoUpdate();

const {
  automationsEnabled,
  automations,
  activeAutomationId,
  setAutomationsEnabled,
  addAutomation,
  updateAutomation,
  removeAutomation,
  toggleManualAutomation
} = useAutomations();

const {
  spotifyAppId,
  spotifySyncPlayback,
  spotifyCustomTitle,
  spotifyCustomArtist,
  setSpotifyConfig,
  dismissedKeys,
  restoreDismissedApps
} = useDetectedApps();

const spotifyAppIdInput = ref(spotifyAppId.value);
const spotifyTitleInput = ref(spotifyCustomTitle.value);
const spotifyArtistInput = ref(spotifyCustomArtist.value);

function saveSpotifyConfig() {
  setSpotifyConfig({
    appId: spotifyAppIdInput.value,
    customTitle: spotifyTitleInput.value,
    customArtist: spotifyArtistInput.value
  });
}

function toggleSpotifySync() {
  setSpotifyConfig({
    syncPlayback: !spotifySyncPlayback.value
  });
}

const showDetectedApps = ref(localStorage.getItem("drq.showDetectedApps") !== "0");
function onToggleDetectedApps(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  showDetectedApps.value = checked;
  localStorage.setItem("drq.showDetectedApps", checked ? "1" : "0");
  window.dispatchEvent(new Event("drq:pref-change"));
}

const weekDays = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mer", value: 3 },
  { label: "Gio", value: 4 },
  { label: "Ven", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Dom", value: 0 }
];

function patchAutomation(automation: Automation, patch: Partial<Automation>) {
  updateAutomation({ ...automation, ...patch });
}

function toggleAutomationDay(automation: Automation, day: number) {
  const days = automation.days.includes(day)
    ? automation.days.filter((d) => d !== day)
    : [...automation.days, day].sort((a, b) => a - b);
  patchAutomation(automation, { days });
}

function onMasterToggle() {
  setAutomationsEnabled(!automationsEnabled.value);
}

function onAutomationEnabled(automation: Automation, event: Event) {
  patchAutomation(automation, {
    enabled: (event.target as HTMLInputElement).checked
  });
}

function onTextInput(
  automation: Automation,
  key: "name" | "customText" | "specificDate",
  event: Event
) {
  const value = (event.target as HTMLInputElement).value;
  patchAutomation(automation, { [key]: value });
}

function onSelectInput(
  automation: Automation,
  key: "target" | "appKey" | "repeat" | "scheduleMode",
  event: Event
) {
  const value = (event.target as HTMLSelectElement).value;
  patchAutomation(automation, { [key]: value as any });
}

function onStartTimeInput(automation: Automation, event: Event) {
  patchAutomation(automation, {
    startTime: (event.target as HTMLInputElement).value
  });
}

function onDurationInput(automation: Automation, event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value, 10);
  if (!Number.isNaN(value) && value > 0) {
    patchAutomation(automation, { durationMinutes: value });
  }
}

function onToggleSchedule(automation: Automation, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  patchAutomation(automation, { scheduled: checked });
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
    <!-- Preferenze generali -->
    <section class="card card-pad mb-6">
      <h2 class="section-title mb-2">Preferenze</h2>
      <p class="section-desc mb-4">Configura i moduli visibili e gestisci le applicazioni rilevate.</p>
      
      <div class="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
        <div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Mostra Applicazioni rilevate nella sezione Applicazioni</span>
          <p class="text-xs text-gray-500 dark:text-gray-400">Visualizza i pulsanti rapidi delle applicazioni rilevate nella home</p>
        </div>
        <input
          type="checkbox"
          :checked="showDetectedApps"
          @change="onToggleDetectedApps"
          class="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
        />
      </div>

      <div
        v-if="dismissedKeys.length > 0"
        class="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4"
      >
        <div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Applicazioni rilevate rimosse</span>
          <p class="text-xs text-gray-500 dark:text-gray-400">Hai nascosto {{ dismissedKeys.length }} applicazione/i dall'elenco</p>
        </div>
        <button
          type="button"
          class="btn btn-xs btn-primary text-xs"
          @click="restoreDismissedApps"
        >
          Ripristina tutte
        </button>
      </div>
    </section>

    <!-- Configurazione Spotify (coerentemente configurabile) -->
    <section class="card card-pad mb-6">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h2 class="section-title">Configurazione Spotify</h2>
          <p class="section-desc mt-0.5">
            Configura coerentemente Discord Rich Presence per Spotify (Client ID, riproduzione automatica e testi).
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
            Spotify RPC
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
        <label class="block text-sm">
          <span class="input-label">Discord Client ID per Spotify</span>
          <input
            type="text"
            v-model="spotifyAppIdInput"
            @change="saveSpotifyConfig"
            class="input input-sm mt-1"
            placeholder="1021481123471183882"
          />
          <span class="text-[11px] text-gray-400 mt-1 block">ID applicazione Discord per lo stato 'In ascolto' (predefinito funzionante).</span>
        </label>

        <div class="flex flex-col justify-between">
          <div class="flex items-center justify-between pt-1">
            <div class="pr-3">
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Sincronizza brano in riproduzione</span>
              <p class="text-xs text-gray-400">Rileva automaticamente artista e brano dal player Spotify (playerctl / AppleScript)</p>
            </div>
            <!-- Slide switch per sync Spotify -->
            <button
              type="button"
              role="switch"
              :aria-checked="spotifySyncPlayback"
              @click="toggleSpotifySync"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="spotifySyncPlayback ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="spotifySyncPlayback ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>

        <label class="block text-sm" v-if="!spotifySyncPlayback">
          <span class="input-label">Titolo brano alternativo</span>
          <input
            type="text"
            v-model="spotifyTitleInput"
            @change="saveSpotifyConfig"
            class="input input-sm mt-1"
            placeholder="es. Canzone in ascolto"
          />
        </label>

        <label class="block text-sm" v-if="!spotifySyncPlayback">
          <span class="input-label">Artista alternativo</span>
          <input
            type="text"
            v-model="spotifyArtistInput"
            @change="saveSpotifyConfig"
            class="input input-sm mt-1"
            placeholder="es. Artista preferito"
          />
        </label>
      </div>
    </section>

    <!-- Automazioni (Pulsante slide switch) -->
    <section class="card card-pad mb-6">
      <div class="flex items-center justify-between mb-2">
        <h2 class="section-title">Automazioni</h2>
        <div class="flex items-center gap-3 select-none">
          <span class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ automationsEnabled ? 'Automazioni attive' : 'Automazioni disattive' }}
          </span>
          <!-- Slide Switch per Automazioni -->
          <button
            type="button"
            role="switch"
            :aria-checked="automationsEnabled"
            @click="onMasterToggle"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="automationsEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'"
            title="Attiva/disattiva tutte le automazioni"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="automationsEnabled ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>
      <p class="section-desc mb-4">
        Attiva le presenze direttamente con un click oppure imposta una pianificazione oraria con calendario.
      </p>

      <div v-if="automations.length === 0" class="section-desc mb-4">
        Nessuna automazione configurata.
      </div>

      <div
        v-for="automation in automations"
        :key="automation.id"
        class="border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4 transition-colors bg-white dark:bg-gray-900/60"
        :class="{
          'opacity-60': !automationsEnabled || !automation.enabled,
          'border-indigo-500/80 shadow-sm shadow-indigo-500/10': activeAutomationId === automation.id
        }"
      >
        <!-- Riga titolo / avvio / eliminazione -->
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="checkbox"
            :checked="automation.enabled"
            :disabled="!automationsEnabled"
            @change="onAutomationEnabled(automation, $event)"
            class="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
            title="Abilita automazione"
          />
          <input
            type="text"
            :value="automation.name"
            @change="onTextInput(automation, 'name', $event)"
            class="input input-sm flex-grow min-w-[140px]"
            placeholder="Nome automazione"
          />
          <button
            type="button"
            class="btn btn-xs rounded-lg px-3 py-1.5 font-medium transition-colors"
            :class="
              activeAutomationId === automation.id
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            "
            @click="toggleManualAutomation(automation.id)"
          >
            {{ activeAutomationId === automation.id ? 'Ferma' : 'Avvia ora' }}
          </button>
          <button
            type="button"
            class="btn btn-xs btn-ghost text-red-500 hover:text-red-400 hover:bg-red-500/10"
            @click="removeAutomation(automation.id)"
          >
            Elimina
          </button>
        </div>

        <!-- Selezione target presenza -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label class="block text-sm">
            <span class="input-label">Mostra su Discord</span>
            <select
              :value="automation.target"
              @change="onSelectInput(automation, 'target', $event)"
              class="input input-sm"
            >
              <option value="app">Applicazione supportata</option>
              <option value="text">Testo personalizzato</option>
            </select>
          </label>
          <label v-if="automation.target === 'app'" class="block text-sm">
            <span class="input-label">Applicazione</span>
            <select
              :value="automation.appKey"
              @change="onSelectInput(automation, 'appKey', $event)"
              class="input input-sm"
            >
              <option v-for="app in KNOWN_APPS" :key="app.key" :value="app.key">{{ app.name }}</option>
            </select>
          </label>
          <label v-else class="block text-sm">
            <span class="input-label">Testo</span>
            <input
              type="text"
              :value="automation.customText"
              @change="onTextInput(automation, 'customText', $event)"
              class="input input-sm"
              placeholder="es. In studio / Coding"
            />
          </label>
        </div>

        <!-- Sezione orario e calendario opzionale -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-950/40 p-3">
          <div class="flex items-center justify-between">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                :checked="automation.scheduled"
                @change="onToggleSchedule(automation, $event)"
                class="h-4 w-4 accent-indigo-600 rounded"
              />
              <span class="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Pianificazione oraria automatica
              </span>
            </label>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ automation.scheduled ? 'Schedulazione attiva' : 'Avvio sempre manuale' }}
            </span>
          </div>

          <div v-if="automation.scheduled" class="mt-3 space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label class="block text-sm">
                <span class="input-label">Modalità ripetizione</span>
                <select
                  :value="automation.scheduleMode || 'daily'"
                  @change="onSelectInput(automation, 'scheduleMode', $event)"
                  class="input input-sm"
                >
                  <option value="daily">Ogni giorno</option>
                  <option value="weekly">Giorni della settimana</option>
                  <option value="specific_date">Data specifica (Calendario)</option>
                </select>
              </label>
              <label class="block text-sm">
                <span class="input-label">Ora inizio</span>
                <input
                  type="time"
                  :value="automation.startTime"
                  @change="onStartTimeInput(automation, $event)"
                  class="input input-sm"
                />
              </label>
              <label class="block text-sm">
                <span class="input-label">Durata (minuti)</span>
                <input
                  type="number"
                  min="1"
                  :value="automation.durationMinutes"
                  @change="onDurationInput(automation, $event)"
                  class="input input-sm"
                />
              </label>
            </div>

            <!-- Calendario per data specifica -->
            <div v-if="automation.scheduleMode === 'specific_date'" class="pt-1">
              <label class="block text-sm">
                <span class="input-label">Seleziona data dal calendario</span>
                <input
                  type="date"
                  :value="automation.specificDate"
                  @change="onTextInput(automation, 'specificDate', $event)"
                  class="input input-sm max-w-xs"
                />
              </label>
            </div>

            <!-- Giorni specifici della settimana -->
            <div v-if="automation.scheduleMode === 'weekly'" class="flex flex-wrap gap-1.5 pt-1">
              <button
                v-for="d in weekDays"
                :key="d.value"
                type="button"
                class="px-2.5 py-1 text-xs rounded-full border transition-colors"
                :class="
                  automation.days.includes(d.value)
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                "
                @click="toggleAutomationDay(automation, d.value)"
              >
                {{ d.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm"
        @click="addAutomation()"
      >
        + Nuova automazione
      </button>
    </section>

    <!-- Sezione Aggiornamenti (Pulsante slide switch) -->
    <section class="card card-pad">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-gray-900 sm:text-lg dark:text-white">Aggiornamenti</h3>
          <p class="text-xs text-gray-400 mt-0.5">Versione v1.0.0</p>
        </div>
        <div class="flex items-center gap-4">
          <!-- Slide Switch per Aggiornamenti Automatici -->
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Aggiornamenti automatici</span>
            <button
              type="button"
              role="switch"
              :aria-checked="autoUpdateEnabled"
              @click="setAutoUpdateEnabled(!autoUpdateEnabled)"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="autoUpdateEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'"
              title="Attiva/disattiva aggiornamenti automatici"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="autoUpdateEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 shadow-sm"
            @click="checkForUpdates()"
          >
            Verifica aggiornamenti
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
