# Informativa Privacy & Sicurezza dei Dati (Privacy Policy)
**DRQ Complete** — Release 1.0.0  
*Conforme al Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679) e al D.Lgs. 30 giugno 2003, n. 196 (Codice in materia di protezione dei dati personali, coordinato con il D.Lgs. 101/2018).*

---

## 1. Titolare del Progetto & Filosofia di Sviluppo
Il software **DRQ Complete** è un'applicazione open source indipendente sviluppata e mantenuta da **Dav (`d4ruerk1`)** su GitHub: [`https://github.com/d4ruerk1/DQR-Complete`](https://github.com/d4ruerk1/DQR-Complete).

L'architettura del software è concepita secondo il principio fondante della **Privacy by Design e Privacy by Default** (Art. 25 GDPR): l'applicazione non richiede registrazione, non gestisce account centralizzati e non raccoglie dati personali dell'utente.

---

## 2. Assenza Totale di Telemetria e Tracciamento
- **Zero Telemetria:** L'applicazione non include alcun modulo di telemetria, tracciamento, analisi comportamentale, diagnostica remota o raccolta log verso server di terze parti (nessun servizio di terze parti come Google Analytics, Sentry, Mixpanel, Firebase o servizi assimilati).
- **Nessun Tracciamento dell'Attività:** Nessuna informazione circa i giochi avviati, i brani Spotify riprodotti, le automazioni o le sessioni Discord viene monitorata o inviata all'esterno.
- **Nessun Profiling:** Non viene effettuata alcuna profilazione dell'utente o dei suoi dispositivi.

---

## 3. Memorizzazione Strettamente Locale di Credenziali e Dati Utente
Tutti i dati, le impostazioni e le preferenze generati dall'applicazione risiedono **esclusivamente in locale** sul dispositivo dell'utente:
1. **Configurazioni e Token Locali:**
   - I Custom Application ID, le etichette di Rich Presence personalizzate, gli stati configurati e i parametri di automazione sono salvati nello storage webview locale (`localStorage` protetto dal sandboxing dell'applicazione).
   - Nessun token personale, password o credenziale viene scambiato o sincronizzato su cloud.
2. **Directory Dati Locale dell'Applicazione:**
   - I dati di runtime (processi runner temporanei, cache offline del catalogo `gamelist.json`) vengono scritti esclusivamente all'interno della directory applicativa isolata per singolo utente:
     - **Linux:** `~/.local/share/io.github.d4ruerk1.drqcomplete/`
     - **Windows:** `%LOCALAPPDATA%\io.github.d4ruerk1.drqcomplete\`
     - **macOS:** `~/Library/Application Support/io.github.d4ruerk1.drqcomplete/`
3. **Controllo dell'Utente ed Eliminazione (Diritto all'Oblio - Art. 17 GDPR):**
   - L'utente mantiene il pieno e assoluto controllo dei propri dati. La rimozione della cartella dati locale o la cancellazione della cache del browser/webview elimina integralmente ogni informazione senza lasciare tracce residue su server remoti.

---

## 4. Comunicazioni Locali IPC (Inter-Process Communication)
L'interazione con il client desktop di Discord avviene **esclusivamente in locale** tramite socket di comunicazione inter-processo di sistema:
- Socket Unix Domain (`/run/user/<uid>/discord-ipc-0` o `/tmp/discord-ipc-0`) su Linux e macOS.
- Named Pipe di sistema (`\\.\pipe\discord-ipc-0`) su Windows.

Questa interazione opera unicamente sul canale IPC della macchina locale (`127.0.0.1` / IPC locale) senza effettuare alcuna richiesta web remota verso server Discord esterni per le attività di Rich Presence.

---

## 5. Blindatura delle Comunicazioni Esterne (Esclusivamente HTTPS verso GitHub)
Al fine di garantire la massima trasparenza, integrità e riservatezza della navigazione di rete, **tutte le connessioni esterne sono rigorosamente blindate**:
1. **Destinazione Esclusiva:** L'applicazione è vincolata a dialogare direttamente ed **esclusivamente** con i server ufficiali di **GitHub** tramite protocollo cifrato **HTTPS**:
   - Manifest di verifica e aggiornamento release: `https://github.com/d4ruerk1/DQR-Complete/releases/...`
   - Catalogo pubblico dei giochi verificati: `https://raw.githubusercontent.com/d4ruerk1/DQR-Complete/main/resources/catalog.json` (con fallback su release asset GitHub).
2. **Blocco Attivo di Host Terzi (Network Lockdown):**
   - Il backend dell'applicazione e le policy di sicurezza Tauri (Capabilities e Content Security Policy) bloccano a livello architetturale e preventivo qualsiasi tentativo di connessione verso host esterni non appartenenti al dominio GitHub.
   - Nessuna chiamata remota verso server terzi o API di terzi viene permessa.

---

## 6. Diritti dell'Interessato (Artt. 15-22 GDPR)
Poiché l'autore non raccoglie né conserva alcun dato personale identificabile dell'utente su server remoti, l'applicazione garantisce nativamente la tutela dell'interessato:
- **Diritto di Accesso e Portabilità:** Tutti i file di configurazione e log sono in formato standard e leggibile (JSON/testo) direttamente accessibili all'utente sulla sua macchina.
- **Diritto di Cancellazione:** L'eliminazione dei dati locali coincide con la completa cancellazione di qualsivoglia traccia applicativa.

---

## 7. Contatti & Segnalazioni
Per domande, richieste o verifiche relative alla sicurezza e alla privacy del software:
- **Repository Ufficiale:** [https://github.com/d4ruerk1/DQR-Complete](https://github.com/d4ruerk1/DQR-Complete)
- **Maintainer:** Dav (`d4ruerk1`)

