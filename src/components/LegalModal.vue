<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    initialTab?: 'terms' | 'privacy';
  }>(),
  {
    initialTab: 'terms'
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const currentTab = ref<'terms' | 'privacy'>(props.initialTab);

watch(
  () => props.initialTab,
  (newTab) => {
    currentTab.value = newTab;
  }
);

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none"
      @click="onBackdropClick"
    >
      <div
        class="card flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <!-- Modal Header with Tab Switcher & Close "X" Button -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800"
        >
          <div class="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              class="cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
              :class="
                currentTab === 'terms'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              "
              @click="currentTab = 'terms'"
            >
              Termini di Utilizzo
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
              :class="
                currentTab === 'privacy'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              "
              @click="currentTab = 'privacy'"
            >
              Informativa Privacy
            </button>
          </div>

          <!-- Pulsante di chiusura "X" (Nessun pulsante 'Chiudi' in calce) -->
          <button
            type="button"
            title="Chiudi"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            @click="emit('close')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable Document Body with Legal Compliance Verification -->
        <div
          class="flex-1 overflow-y-auto p-5 text-xs leading-relaxed text-gray-700 select-text dark:text-gray-300"
        >
          <!-- Sezione Termini di Utilizzo -->
          <div v-if="currentTab === 'terms'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                Termini e Condizioni di Utilizzo (Terms of Service)
              </h3>
              <p class="text-[11px] text-gray-400">
                DRQ Complete — Software Open Source (Licenza Apache 2.0)
              </p>
            </div>

            <div class="rounded-lg bg-gray-50 p-3 text-[11px] border border-gray-200 dark:bg-gray-800/40 dark:border-gray-700/60">
              <strong>Sintesi di conformità legale:</strong> DRQ Complete è uno strumento desktop per la simulazione fittizia locale di processi e l'impostazione dello stato di Rich Presence Discord via IPC locale. Non modifica file di terze parti, non bypassa misure DRM e non viola la sicurezza delle piattaforme.
            </div>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                1. Licenza d'Uso e Titolarità
              </h4>
              <p>
                Il software è distribuito sotto licenza open source <strong>Apache License 2.0</strong> intestata a Dav (<code>d4ruerk1</code>). L'utente è libero di esaminare il codice sorgente, compilarlo ed eseguirlo in conformità alle condizioni stabilite dalla predetta licenza.
              </p>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                2. Esclusione di Garanzia ("AS IS")
              </h4>
              <p>
                Ai sensi degli Articoli 7 e 8 della Licenza Apache 2.0, l'applicazione e i relativi binari sono forniti <strong>"NELLO STATO IN CUI SI TROVANO" ("AS IS")</strong>, senza alcuna garanzia esplicita o implicita, comprese, a titolo esemplificativo, garanzie di commerciabilità, idoneità per uno scopo particolare, assenza di errori, bachi o interruzioni.
              </p>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                3. Limitazione di Responsabilità
              </h4>
              <p>
                In nessun caso l'autore, i manutentori o i contributori potranno essere ritenuti responsabili per qualsivoglia danno diretto, indiretto, incidentale, speciale, punitivo o consequenziale derivante dall'uso o dall'impossibilità di usare il presente software, ivi inclusi, a titolo indicativo, interruzioni di servizio, mancato conseguimento di ricompense promozionali o provvedimenti adottati da servizi terzi sugli account dell'utente.
              </p>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                4. Dichiarazione di Non Affiliazione
              </h4>
              <p>
                <strong>DRQ Complete</strong> è un progetto indipendente e <strong>non è affiliato, approvato, sponsorizzato né collegato a Discord Inc., Spotify AB, GitHub Inc.</strong> o alle rispettive controllate. Tutti i marchi, i loghi e i nomi commerciali citati appartengono ai rispettivi legittimi proprietari.
              </p>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                5. Responsabilità dell'Utente
              </h4>
              <p>
                L'utente assume la totale ed esclusiva responsabilità per la conformità del proprio operato ai Termini di Servizio di Discord, alle Developer Policy e ai regolamenti delle piattaforme di gioco o streaming audio utilizzate.
              </p>
            </section>
          </div>

          <!-- Sezione Informativa sulla Privacy -->
          <div v-else class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                Informativa sulla Privacy e Trattamento dei Dati
              </h3>
              <p class="text-[11px] text-gray-400">
                Conforme al Regolamento Generale UE 2016/679 (GDPR) e al D.Lgs. 196/2003 (modificato dal D.Lgs. 101/2018)
              </p>
            </div>

            <div class="rounded-lg bg-green-500/10 p-3 text-[11px] text-green-700 dark:text-green-300 border border-green-500/20">
              <strong>Privacy by Design & by Default (Art. 25 GDPR):</strong> Questa applicazione non raccoglie dati personali, non richiede registrazione account e non effettua alcuna telemetria verso server remoti.
            </div>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                1. Zero Telemetria e Nessun Profiling
              </h4>
              <p>
                L'applicazione non include tracker, strumenti di analisi diagnostica o moduli di telemetria (assenza di Google Analytics, Sentry, Mixpanel, Firebase o servizi equivalenti). Nessuna informazione circa le applicazioni avviate, i brani riprodotti o le sessioni Discord viene monitorata o memorizzata su server remoti.
              </p>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                2. Conservazione Strettamente Locale
              </h4>
              <p>
                Tutte le configurazioni (ID applicazione personalizzati, parametri Spotify, preferenze e automazioni) risiedono <strong>esclusivamente in locale</strong> sul dispositivo dell'utente all'interno dello storage isolato del client (<code>localStorage</code>) e nella directory locale utente (<code>~/.local/share/io.github.d4ruerk1.drqcomplete/</code> o <code>%LOCALAPPDATA%</code>).
              </p>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                3. Comunicazioni IPC e Chiamate di Rete Blindate
              </h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>
                  <strong>Discord Rich Presence:</strong> comunica unicamente via socket IPC di sistema locale (Unix domain socket o named pipe Windows) su <code>localhost</code>, senza trasmettere token di autenticazione all'esterno.
                </li>
                <li>
                  <strong>Connessioni HTTPS Esterne:</strong> le uniche richieste di rete in uscita sono strettamente limitate all'aggiornamento del catalogo pubblico delle applicazioni supportate da Discord (<code>https://discord.com/api/v9/applications/detectable</code>) e alle release GitHub per la verifica degli aggiornamenti.
                </li>
              </ul>
            </section>

            <section class="space-y-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                4. Diritti dell'Interessato (Artt. 15-22 GDPR) e Diritto all'Oblio
              </h4>
              <p>
                L'utente mantiene il pieno e assoluto controllo dei propri dati. La semplice disinstallazione dell'applicazione o la cancellazione dei dati locali comporta l'eliminazione definitiva e integrale di qualsivoglia preferenza o log, senza lasciare residui su cloud o server terzi.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

