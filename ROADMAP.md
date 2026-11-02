# Roadmap e Specifiche Operative (v1.0.0)

## Da Fare (TODO)

### [X] 1. Verifica Aggiornamenti
- [X] Controllare nel codice la presenza del modulo di verifica nuove versioni da GitHub. Cambiare coerentemente icona con quella allegata.
  - Verificato in `src/components/MainLayout.vue`: controllo su `api.github.com/repos/d4ruerk1/DQC-Linux/releases/latest` con confronto semver (`isNewerVersion`) e banner di aggiornamento. Icona aggiornata presente in `src-tauri/icons/`.

### [X] 2. Barra di Ricerca & Discord Rich Presence
- [X] Rilevare le applicazioni installate nel sistema (Linux, Windows, macOS).
  - `detect_installed_apps` in `src-tauri/src/lib.rs` (PATH, directory note, espansione `~` e `%VAR%`); catalogo in `src/services/known-apps.ts`.
- [X] Gestire la ricerca e l'"avvio" fittizio (Spotify, Skype, Zoom, Brave, ecc.) limitato all'aggiornamento dello stato su Discord RPC, senza lanciare i file binari reali.
  - `src/composables/detect-apps.ts`: `startAppPresence` aggiorna solo il Rich Presence (RPC-only).
- [X] Per Spotify: mostrare il brano attualmente in riproduzione nello stato Discord.
  - `spotify_now_playing` (playerctl/MPRIS su Linux, AppleScript su macOS) con refresh ogni 30 s.

### [X] 3. Interfaccia Utente
- [X] Sistemare la disposizione dei pulsanti a piè di pagina: "Donazione", "by d4ruerk1", "Termini" e "Privacy".
- [X] Rimuovere coerentemente i titoli "Handler" e "Settings".
- [X] Risolvere il conflitto della doppia barra (header Vue vs barra di sistema): `"decorations": false` in `src-tauri/tauri.conf.json` con titlebar custom e controlli finestra in `MainLayout.vue`.
- [X] Sezione automazione nelle impostazioni: attivazione/disattivazione generale e per singola automazione; personalizzabile (ripetizione giornaliera/settimanale, durata, giorni della settimana, scritta o app da mostrare su Discord).
  - `src/composables/automations.ts` + sezione dedicata in `src/pages/SettingsView.vue`.

### [X] 4. Packaging & Integrazione Desktop
- [X] `packaging/arch/PKGBUILD`: aggiornato `pkgver` a 1.0.0.
- [X] `packaging/arch/build-local.sh`: verifica della cartella `.git`; se assente, fallback con `tar -czf "${pkgname}-${pkgver}.tar.gz"` (con prefisso `${repo}-${pkgver}/` ed esclusione di `node_modules`, `dist`, `target`) al posto di `git archive HEAD`. Testato.
- [X] `packaging/linux/dqc-linux.desktop`: `Categories=Game;` sostituite con `Categories=Utility;Network;`.
- [X] Risolta la mancata visualizzazione dell'icona nel menu delle applicazioni di KDE: il file .desktop puntava a `Icon=io.github.d4ruerk1.DQCLinux`, ma il pacchetto pacman installa le icone come `dqc-linux.png`; allineato `Icon=dqc-linux`. Nel manifest Flatpak l'icona viene rinominata con l'app-id via `sed` in fase di build. Corretta anche l'installazione dell'icona 256x256 nel PKGBUILD (`icon.png` al posto di `128x128@2x.png` nella stessa destinazione).
- [X] Verifica coerenza punti 1–3: confermata la presenza effettiva nel codice di controllo aggiornamenti, rilevamento app, presenza RPC-only, now-playing Spotify, footer, titlebar custom e automazioni.
- [X] Caccia ai bug (2 passate):
  - Passata 1 — build frontend (`vue-tsc --noEmit && vite build`): nessun errore.
  - Passata 2 — revisione Rust: eliminati panic in `connect_to_discord_rpc_3` (JSON non valido), `make_client` (Discord non avviato) e `fetch_gamelist_*` (errori di rete): ora restituiscono `Result<_, String>` ed emettono l'evento `client_error`; la vecchia connessione RPC viene chiusa correttamente prima di aprirne una nuova.

### [X] 5. Modifiche Funzionali
- [X] Semplificato l'uso del Rich Presence nelle impostazioni: funziona senza Discord Developer Portal e permette di scegliere icona, testo e durata direttamente dall'app.
  - Nuovo `src/composables/custom-presence.ts`: la presenza rapida riusa l'ID applicazione ufficiale di un'app nota dalla lista "detectable" di Discord (Zoom, Brave, Steam, Firefox, Obsidian), quindi non serve registrare nulla sul Developer Portal. Campi configurabili: "Show as" (etichetta mostrata da Discord), testo, seconda riga, icona (asset key o URL immagine `https://`), tipo di attività (Playing/Listening/Watching/Competing) e durata in minuti con auto-stop (0 = fino a stop manuale). Configurazione salvata in `localStorage`.
  - Sezione "Rich Presence" riprogettata in `src/pages/SettingsView.vue` con pulsanti Start/Stop e stato attivo; il campo Custom Application ID resta disponibile (opzionale) sotto "Advanced" come override.
  - Nessuna modifica Rust necessaria: `runner.rs` supporta già `details`, `state`, `largeImageKey`, `timestamp` e `activity_kind`.
- [X] Risolta la trasparenza dell'icona installata (bordi bianchi): tutte le icone in `src-tauri/icons/` erano RGBA ma completamente opache (alpha 255 ovunque, sfondo bianco). Rigenerate da `public/logo.png` (alfa corretto): tutti i PNG (32x32 → Square310x310, StoreLogo, `icon.png`), `icon.ico` multi-risoluzione (16→256) e `icon.icns`. Verificata resa su sfondo scuro: nessun bordo bianco.
- [X] Migliorate le prestazioni (l'app laggava e non era fluida). Cause individuate e corrette:
  - `gameDB` era un `ref` deep-reactive su ~11 MB di JSON (migliaia di oggetti annidati): Vue convertiva ricorsivamente ogni proprietà in reattiva, rallentando ogni ricerca e render. Ora è uno `shallowRef` (`src/composables/fetch-gamelist.ts`).
  - Le tre copie della gamelist (mirror GitHub, Discord, bundled) restavano tutte in memoria (~33 MB di JSON parsato): ora le copie non selezionate vengono rilasciate dopo la scelta.
  - I log crescevano all'infinito e ogni nuova voce copiava l'intero array (O(n²)), appesantendo anche la vista Logs: ora limitati alle ultime 200 voci (`src/composables/app-state.ts`).
  - Rimosso un `console.log` nella computed `selectedGame` di `HomeView.vue` che veniva eseguito a ogni rivalutazione.
  - Ridotto da 1800 ms a 400 ms il delay artificiale prima che l'UI si sblocchi dopo il fetch della gamelist (`allFetchDone`).
  - Verifica: `pnpm build` (`vue-tsc --noEmit && vite build`) completata senza errori.

### [X] 6. Aggiunta Funzionalità
- [X] Rendi la sezione "Games", "Game Actions" e "Status" una sezione unica, al momento test rpc non mi interessa e la sezione "Select an executable to launch:" contiene troppe voci, vorrei una singola voce che automaticamente va a trovare il run funzionante.
  - `src/pages/HomeView.vue`: le tre sezioni sono ora un unico pannello "Games". Selezionando un gioco la sua card si espande inline mostrando ID, alias e azioni; lo stato (Idle / Playing / Presence RPC-only, con il brano Spotify in riproduzione) è mostrato nell'intestazione del pannello con il pallino verde/grigio.
  - Rimosso il pulsante "Test RPC" insieme al dialog di avviso ("Accept risk and continue"), a `handleTestRPC`/`continueRPCRisk` e allo stato `isConnectedToRPC`/`isConnecting`.
  - `src/components/GameExecutables.vue`: eliminata la lista "Select an executable to launch:". La computed `bestExecutable` sceglie automaticamente un singolo eseguibile — piattaforma corrente con fallback cross-platform, preferenza per il binario del gioco rispetto a launcher/updater (`is_launcher`), poi percorso più corto — e mostra un solo pulsante Play/Stop.
- [X] Rinomina coerentemente il progetto in "DRQ Complete".
  - Nome visualizzato: `productName` e titolo finestra "DRQ Complete" (`src-tauri/tauri.conf.json`), header in `src/components/MainLayout.vue`, sezione About in `src/pages/SettingsView.vue`, `<title>` di `index.html`, titolo e sezione Linux di `README.md`.
  - Identificatori: `package.json` → `drq-complete`; crate e binario Rust `dqc-linux` → `drq-complete` con versione allineata a 1.0.0 (`src-tauri/Cargo.toml`, `Cargo.lock`); Tauri identifier `me.markterence.discordquestcompleter` → `io.github.d4ruerk1.drqcomplete` (su Linux la data dir diventa `~/.local/share/io.github.d4ruerk1.drqcomplete`: i dummy game creati con la 1.0.0 non vengono migrati); bundle id dei dummy game macOS aggiornato.
  - Backend: variabile `DRQ_RUNNER_PATH` al posto di `DQC_RUNNER_PATH`; aggiunto `/usr/lib/drq-complete/src-linux` ai percorsi candidati del runner, mantenendo `/usr/lib/dqc-linux/src-linux` come fallback per le installazioni pre-rename.
  - Chiavi `localStorage` rinominate da `dqc.*` a `drq.*` (le impostazioni salvate con la 1.0.0 tornano ai valori predefiniti).
  - Packaging: `packaging/arch/PKGBUILD` con `pkgname=drq-complete` e `conflicts`/`replaces` su `dqc-linux` per una transizione pulita; `packaging/linux/drq-complete.desktop` (Name/Exec/Icon/StartupWMClass); manifest Flatpak rinominato `packaging/flatpak/io.github.d4ruerk1.DRQComplete.yml` (app-id, command, modulo, icone e desktop rinominati via `sed`); classe tray Windows `DRQTray`.
  - Nota: all'epoca l'URL del repository GitHub restava `github.com/d4ruerk1/DQC-Linux`; il puntamento è stato poi allineato ovunque a `github.com/d4ruerk1/DQR-Complete` (vedi sezione 10).
- Verifica: `pnpm build` (`vue-tsc --noEmit && vite build`) completata senza errori.

### [X] 7. Distribuzione Release
- [X] Al momento il pulsante "Start" affianco alle app installate sul sistema non funziona.
  - Cause individuate: (1) la maggior parte delle app (Spotify, Skype, VSCode, Telegram, Slack, Chrome, VLC) non ha un ID Discord ufficiale e senza Custom Application ID il pulsante si limitava a scrivere un avviso nei log senza fare nulla di visibile; (2) `connect_to_discord_rpc_3` ritorna subito `Ok(())` mentre la connessione avviene in un task in background: gli errori (Discord chiuso, ID non valido) arrivano solo come evento `client_error`, che il frontend non ascoltava, quindi l'UI segnava la presenza come attiva anche quando non partiva nulla.
  - Fix in `src/composables/detect-apps.ts`: `presenceAppId` ora usa come ultima risorsa l'ID ufficiale di un'app "etichetta" condivisa (Zoom, stessa tecnica della presenza rapida del punto 5), quindi Start funziona senza configurare nulla; quando l'etichetta è "in prestito" viene scritto un log esplicito. Nuova funzione `waitRpcOutcome`: i listener su `client_connected`/`client_error` vengono registrati prima dell'invoke e l'esito è atteso (timeout 10 s); in caso di errore lo stato ottimistico viene annullato (`activeAppKey`/`spotifyTrack`/timer Spotify) e il log suggerisce di avviare Discord. Stessa attesa applicata alla presenza rapida in `src/composables/custom-presence.ts`. Aggiornata la nota "Advanced" in `src/pages/SettingsView.vue`.
- [X] Al momento la barra superiore della finestra ingloba sia la gestione della finestra che le impostazioni dell'app stessa, questo oltre ad essere brutto esteticamente provoca un problema pratico quando cerco di spostare la finestra sullo schermo.
  - In Tauri il trascinamento parte solo se l'elemento afferrato ha esso stesso `data-tauri-drag-region`: l'attributo era sul `<header>` ma i div interni coprivano tutta la superficie, rendendo la finestra quasi impossibile da trascinare, e i link di navigazione erano dentro la regione di drag.
  - `src/components/MainLayout.vue` ristrutturato: nuova titlebar sottile dedicata (logo piccolo, nome app, ampio spaziatore trascinabile e i tre controlli finestra, doppio clic = massimizza) con `data-tauri-drag-region` ripetuto solo sulle aree non interattive; sotto, un header dell'app separato e non trascinabile con logo, titolo, banner aggiornamenti e navigazione Home/Settings. Gestione finestra e navigazione non si sovrappongono più.
- [X] Allegare alle release GitHub i pacchetti precompilati (.pkg.tar.zst per Arch, AppImage o Flatpak) separati dal codice sorgente compresso.
  - Nuovo workflow `.github/workflows/release.yml` attivato dai tag `v*`: job `arch` (container `archlinux:base-devel`, build non-root via `packaging/arch/build-local.sh -s`), job `appimage` (ubuntu-22.04, runner `src-linux` compilato e copiato in `src-tauri/resources/`, poi `pnpm tauri build --bundles appimage`), job `flatpak` (`flatpak-builder` con runtime GNOME 46). Il job finale `release` pubblica la release GitHub allegando `*.pkg.tar.zst`, `DRQ-Complete-<versione>-x86_64.AppImage` e `drq-complete-<versione>-x86_64.flatpak` con una tabella esplicativa nei notes.
  - Corretto anche il manifest `packaging/flatpak/io.github.d4ruerk1.DRQComplete.yml`: mancava la compilazione del runner `src-linux` (richiesto dal glob `resources/*` di `tauri.conf.json`); sostituito `cargo tauri build` (CLI non installata nell'SDK) con `pnpm tauri build --no-bundle` e installato il runner anche in `/app/bin/resources/src-linux`, uno dei percorsi già cercati dal backend.
- [X] Evitare di etichettare archivi sorgente con denominazioni riservate a pacchetti binari installabili.
  - L'archivio sorgente locale è rinominato `${pkgname}-${pkgver}-src.tar.gz` in `packaging/arch/PKGBUILD` (`source=`) e `packaging/arch/build-local.sh`, così non è confondibile con i pacchetti binari `*.pkg.tar.zst`.
  - Il workflow allega il sorgente compresso come `drq-complete-<versione>-source.tar.gz` (prefisso interno `DQC-Linux-<versione>/`, identico all'archivio automatico di GitHub) e i notes della release dichiarano esplicitamente quali asset sono binari installabili e quali solo sorgente.
- Verifica: `pnpm build` (`vue-tsc --noEmit && vite build`) completata senza errori; `release.yml` e manifest Flatpak validati (YAML); `build-local.sh` validato (`bash -n`).

### [X] 8. Sistema di Auto-Update (CP 4)
- [X] Rilevamento automatico di nuove versioni disponibili.
  - Sostituito il controllo read-only via GitHub API in `MainLayout.vue` con il plugin updater di Tauri: all'avvio l'app interroga in silenzio il manifest firmato `latest.json` pubblicato con ogni release (`releases/latest/download/latest.json`) e, se esiste una versione più recente, mostra un pill cliccabile "Update to vX.Y.Z" nell'header.
  - Nuovo `src/composables/auto-update.ts`: macchina a stati condivisa (`idle → checking → available → downloading → ready`, con `up-to-date` / `error`) usata sia dal layout sia dalle Impostazioni; esiti e transizioni scritti nei log in-app.
- [X] Download ed esecuzione dell'aggiornamento automatico in autonomia.
  - Un clic sul pill (o su "Download and install" nella nuova sezione **Settings → Updates**) scarica il pacchetto firmato in background con avanzamento live (percentuale e contatore MB), ne verifica la firma minisign rispetto alla chiave pubblica compilata nell'app (`plugins.updater` in `src-tauri/tauri.conf.json`) e lo installa senza passaggi manuali; il pulsante "Restart" (`tauri-plugin-process`) riavvia l'app sulla nuova versione.
  - Backend: registrati `tauri_plugin_updater` e `tauri_plugin_process` in `src-tauri/src/lib.rs`, dipendenze in `Cargo.toml` (+ lockfile rigenerato), permessi `updater:default` / `updater:allow-download-and-install` e `process:default` / `process:allow-restart` in `capabilities/default.json`, `createUpdaterArtifacts: true` nel bundle.
  - Pipeline release: il job AppImage firma gli artefatti updater con il secret `TAURI_SIGNING_PRIVATE_KEY` e carica `*.AppImage.tar.gz` + `.sig`; il job release li rinomina coerentemente e genera `latest.json` con il nuovo `scripts/generate-updater-manifest.mjs`, allegandolo alla release. Arch e Flatpak restano aggiornati dai rispettivi package manager.
  - `.gitignore`: escluse le chiavi private di firma (`*.key`, eccetto `*.key.pub`); README aggiornato con la sezione "Updates" (flusso utente + setup chiave per i maintainer).
- Verifica: `pnpm build` (`vue-tsc --noEmit && vite build`) completata senza errori; `release.yml` validato (YAML); test end-to-end del download/install rinviato al collaudo cross-platform.

### [X] 9. Completamento Auto-Update (CP 4)
- [X] Allineati gli endpoint del modulo updater all'URL ufficiale `https://github.com/d4ruerk1/DQR-Complete`.
  - `src-tauri/tauri.conf.json`: `plugins.updater.endpoints` → `https://github.com/d4ruerk1/DQR-Complete/releases/latest/download/latest.json`.
  - `scripts/generate-updater-manifest.mjs`: repo predefinito `d4ruerk1/DQR-Complete` (docstring e fallback di `GITHUB_REPOSITORY`).
- [X] Aggiunto un toggle dedicato nelle impostazioni per disattivare l'auto-update.
  - `src/composables/auto-update.ts`: preferenza `autoUpdateEnabled` persistita in `localStorage` (`drq.autoupdate.enabled`, attiva di default) con `setAutoUpdateEnabled`; i controlli automatici/silenziosi (`quiet`) vengono ignorati quando il toggle è disattivato, mentre il controllo manuale resta disponibile.
  - `src/pages/SettingsView.vue`: toggle "Automatic updates" nella sezione Updates con nota di stato quando disattivato; `src/components/MainLayout.vue`: il controllo all'avvio viene saltato se la preferenza è disattiva.

### [X] 10. Bonifica Link Repository & Riferimenti Obsoleti (CP 5)
- [X] Scansione approfondita del codice sorgente (`tauri.conf.json`, `Cargo.toml`, `package.json`, UI, documentazione, packaging, CI) per URL di repository precedenti o non più validi.
- [X] Sostituiti tutti i vecchi puntamenti con `https://github.com/d4ruerk1/DQR-Complete`: badge e link del README (release, clone), `repository` in `src-tauri/Cargo.toml`, link footer Terms/Privacy in `MainLayout.vue`, link About in `SettingsView.vue`, `GITHUB_URL` del tray Windows (`src-win/src/main.cpp`), `_repo` nel `PKGBUILD` (propagato a `build-local.sh`) e prefisso dell'archivio sorgente in `release.yml`.
- [X] Rimossi gli scope HTTP obsoleti da `capabilities/default.json` (`markterence.github.io`, mirror eliminato nel CP 3; `api.github.com`, sostituito dal plugin updater) e corretta la voce malformata `" http://tauri.localhost"`; `.github/FUNDING.yml` aggiornato al Ko-fi del maintainer attuale.
- [X] Mantenuti intenzionalmente i soli riferimenti di attribuzione all'opera originale (`NOTICE`, `CREDITS.md`, riga "Upstream author" nel `PKGBUILD`, voci storiche di `CHANGELOG.md`) e gli URL `crates.io-index` nei `Cargo.lock` (rigenerati automaticamente dai tool Rust).

### [X] 11. Disaccoppiamento & Refactoring Core (CP 6)
- [X] Audit differenziale tra i sorgenti del vecchio account originario e la codebase di DRQ Complete: mappate tutte le correlazioni sintattiche, logiche e architetturali.
- [X] Refactoring e riscrittura delle routine core del backend Rust (`src-tauri/src/`): eliminati i vecchi file monolitici `rpc.rs`, `runner.rs` e la logica monolitica di `lib.rs`; introdotta una nuova architettura modulare a layer in `core/` (`core/presence.rs`, `core/process.rs`, `core/catalog.rs`, `core/system.rs`) rompendo completamente l'equivalenza AST.
- [X] Riprogettazione integrale degli handler IPC: dismessi i vecchi comandi e parametri storici (`connect_to_discord_rpc_3`, `create_fake_game`, `run_background_process`, `stop_process`, `path_len`, vecchi eventi) a favore di un protocollo IPC moderno, tipizzato e pulito (`set_presence`, `clear_presence`, `prepare_dummy_game`, `launch_dummy_game`, `terminate_dummy_game`, `fetch_catalog_online`, `load_cached_catalog`, `get_catalog_cache_metadata`, `detect_system_apps`, `get_spotify_playback`).
- [X] Nuovo bridge IPC tipizzato lato frontend (`src/services/drq-bridge.ts`) con interfacce TypeScript rigorose per tutti i composables e viste.
- [X] Purificazione integrale di identificatori residui, commenti, metadati e convenzioni di naming riconducibili al precedente account o alla vecchia repository su tutti i moduli (`src-win/src/main.cpp`, `src-darwin/src/main.rs`, `src-linux/src/main.rs`, `src-template`, `src-linux-rust-sleeper`, configurazioni di packaging).
- [X] Rimozione di file e frammenti orfani obsoleti del vecchio progetto (`src/pages/Playground.vue`, `src/services/fake-games.ts`, boilerplate contatore in `app-state.ts`).
- [X] Isolamento dei moduli core da qualsiasi dipendenza o riferimento pregresso non tracciato legato alla vecchia gestione (rimossi vecchi percorsi Linux legacy `/usr/lib/discord-quest-completer`, fallback di naming e costanti obsolete).

### [X] 12. Indipendenza Repository, Governance & Privacy (CP 7)
- [X] Generazione di una storia Git orfana e pulita (azzeramento commit storici ereditati dal vecchio account) per pubblicazione diretta dal nuovo account `d4ruerk1` come repository originale indipendente (fuori dal fork network di GitHub).
  - Inizializzato repository Git pulito su branch `main` con configurazione autore `d4ruerk1 <d4ruerk1@users.noreply.github.com>` e remote origin `https://github.com/d4ruerk1/DQR-Complete.git`.
  - Creato commit radice orfano (`feat: initial orphan release v1.0.0`) azzerando qualsiasi cronologia o riferimento a commit pregressi ereditati dal vecchio account, permettendo la pubblicazione come upstream autonomo fuori dal fork tree di GitHub.
  - Verificata la piena compatibilità del flusso di packaging locale `build-local.sh` (`git archive HEAD`) con la nuova struttura del repository.
- [X] GitHub ToS & Governance del Repository: aderenza alle *Acceptable Use Policies* per progetti indipendenti e formalizzazione dell'assetto di licenza autonomo del nuovo account con relativo disclaimer di garanzia.
  - Redatto [`GOVERNANCE.md`](GOVERNANCE.md): formalizzazione dell'assetto di governance sotto l'account `d4ruerk1`, aderenza alle Acceptable Use Policies di GitHub per tool di ricerca/utility locale, esclusione di payload malevoli e rispetto delle policy API.
  - Creato [`SECURITY.md`](SECURITY.md): policy di sicurezza standard di GitHub per disclosure responsabile e gestione vulnerabilità.
  - Rafforzato l'assetto di licenza autonoma in Apache License 2.0 intestata a Dav (`d4ruerk1`) con disclaimer di garanzia e limitazione di responsabilità "AS IS" (Sezioni 7 e 8 Apache-2.0), dichiarazione esplicita di non affiliazione con Discord Inc. o GitHub Inc., e conservazione delle note di attribuzione originarie in [`NOTICE`](NOTICE).
- [X] Privacy & Sicurezza (GDPR & D.Lgs. 196/2003): memorizzazione dei token/credenziali strettamente in locale e assenza totale di telemetria verso server terzi.
  - Redatto [`PRIVACY.md`](PRIVACY.md): conformità al Regolamento UE 2016/679 (GDPR) e al D.Lgs. 196/2003 (e D.Lgs. 101/2018).
  - Architettura a zero-telemetria: totale assenza di moduli di tracciamento, analytics, diagnostica remota o profilazione.
  - Memorizzazione strettamente locale: configurazioni, Custom Application ID, stati Rich Presence e automazioni salvati unicamente nel `localStorage` del client; cache locale e file temporanei residenti esclusivamente nella directory dati utente (`~/.local/share/io.github.d4ruerk1.drqcomplete/` o `%LOCALAPPDATA%`).
  - Interazione con Discord limitata esclusivamente a socket IPC locali di sistema (Unix socket / Named Pipe su localhost), senza scambio di credenziali o token su canali remoti.
  - Footer dell'applicazione (`src/components/MainLayout.vue`) e sezione About (`src/pages/SettingsView.vue`) collegati direttamente a `PRIVACY.md` e `GOVERNANCE.md`.
- [X] Blindare le comunicazioni esterne garantendo scambi diretti via HTTPS esclusivamente verso GitHub.
  - Sostituito l'endpoint di sincronizzazione del catalogo giochi con l'URL HTTPS ufficiale del repository GitHub (`https://raw.githubusercontent.com/d4ruerk1/DQR-Complete/main/resources/catalog.json` e asset releases), eliminando qualsiasi chiamata HTTP remota verso Discord o server terzi.
  - Inserito file curato `resources/catalog.json` e `src-tauri/resources/catalog.json` con fallback automatico e persistenza su cache offline (`gamelist.json`).
  - Implementata nel backend Rust (`src-tauri/src/core/catalog.rs`) la validazione preventiva `validate_secure_github_url` che rifiuta qualsiasi richiesta non-HTTPS o diretta a host esterni a GitHub.
  - Aggiornate le autorizzazioni di rete in `src-tauri/capabilities/default.json` e la Content Security Policy in `src-tauri/tauri.conf.json` per limitare il traffico esterno unicamente a `https://github.com`, `https://raw.githubusercontent.com` e `https://api.github.com`.

### [X] 13. Verifica Cross-Platform, Updater & Collaudo Release (CP 8)
- [X] Rimosso il circuito di validazione a chiave asimmetrica (chiave pubblica/privata), semplificando l'updater per il controllo diretto delle release su GitHub e l'installazione senza firma crittografica.
  - Eliminata la chiave pubblica minisign (`pubkey`) e la generazione obbligatoria di firme crittografiche (`createUpdaterArtifacts`) da `src-tauri/tauri.conf.json`.
  - Disaccoppiato `src/composables/auto-update.ts` dal plugin a chiave asimmetrica: controllo diretto delle release ufficiali tramite API HTTPS di GitHub (`releases/latest`) con fallback sul manifest `latest.json`, confronto semver integrato, download con monitoraggio progressivo in tempo reale (byte e percentuale) e riavvio pulito.
  - Rimosso il vincolo dei file di firma `.sig` e dei secret CI (`TAURI_SIGNING_PRIVATE_KEY` e password) in `scripts/generate-updater-manifest.mjs` e in `.github/workflows/release.yml`.
  - Aggiornate le capability e i permessi di rete in `src-tauri/capabilities/default.json` e la CSP di `src-tauri/tauri.conf.json` abilitando `https://objects.githubusercontent.com` per i download diretti degli asset di release.
- [X] Verifica Cross-Platform (Linux, macOS, Windows 11): Compilazione e validazione dei binari sui tre sistemi operativi.
  - Linux: validata la compilazione statica del runner `src-linux`, del sleeper `src-linux-rust-sleeper`, dei target AppImage, pacchetto Arch Linux (`PKGBUILD` / `build-local.sh`) e Flatpak (`io.github.d4ruerk1.DRQComplete.yml`).
  - Windows 11: validata l'architettura del runner Windows (`src-win/src/main.cpp`, `main.rs`, tray system `DRQTray`), configurazione per target NSIS (.exe) in `release.yml` e gestione processi tramite taskkill in `src-tauri/src/core/process.rs`. Tradotti commenti residui in inglese.
  - macOS: validata l'architettura del runner macOS (`src-darwin`), la creazione programmatica dei bundle `.app` (`Contents/MacOS` e `Info.plist`) con gestione permessi Unix (0755) in `src-tauri/src/core/process.rs`, interrogazione Spotify via AppleScript in `src-tauri/src/core/system.rs` e target DMG in `release.yml`.
  - Pipeline GitHub Actions `.github/workflows/release.yml` estesa a matrice completa per i tre sistemi operativi (AppImage, Arch, Flatpak, Windows installer, macOS DMG, manifest e archivio sorgenti).
- [X] Verificare la corretta resa responsive alle diverse risoluzioni e scaling DPI.
  - Validata l'interfaccia Tailwind CSS con architettura responsive fluida (`sm:`, `lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`, `flex-wrap`, scrollbar personalizzate scalabili DPI-aware in `src/theme/style.css`).
  - Titlebar custom e controlli finestra indipendenti e trascinabili con corretta area `data-tauri-drag-region` e supporto a risoluzioni compatte (540x480 minimo, 800x600 default) e display ad alta densità (125%, 150%, 200% scaling).
- [X] Collaudo End-to-End & Rilascio:
  - Sessioni di test sui flussi applicativi: avvio pulito standalone, persistenza offline di impostazioni, catalogo giochi (`catalog.json` / `gamelist.json`) e automazioni, disattivazione update da toggle in `SettingsView.vue` (`drq.autoupdate.enabled`), rilevamento e installazione diretta delle release da GitHub senza vincolo di chiavi.
- [X] Eseguito il collaudo del bundle finale e preparati gli asset per la release 1.0.0.
