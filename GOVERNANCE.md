# Governance, Policies & Repository Independence
**DRQ Complete** — Release 1.0.0  
*Repository Ufficiale:* [`https://github.com/d4ruerk1/DQR-Complete`](https://github.com/d4ruerk1/DQR-Complete)  
*Maintainer Ufficiale:* **Dav (`d4ruerk1`)**

---

## 1. Assetto di Governance & Indipendenza Architetturale
Il progetto **DRQ Complete** è un'iniziativa software open source autonoma e indipendente, gestita sotto la titolarità e direzione tecnica dell'account **`d4ruerk1`**.

1. **Autonomia dal Vecchio Account e Rete di Fork:**
   - Il repository `https://github.com/d4ruerk1/DQR-Complete` è pubblicato come repository **originale e indipendente**, al di fuori di qualsiasi fork network di GitHub.
   - La storia dei commit è stata azzerata e rigenerata con un commit iniziale orfano (*clean orphan history*), eliminando ogni correlazione di commit o ramo storico con il vecchio account, formalizzando una netta separazione di titolarità.
2. **Architettura Indipendente:**
   - La codebase ha subito un processo integrale di disaccoppiamento e refactoring dei moduli core (`core/presence.rs`, `core/process.rs`, `core/catalog.rs`, `core/system.rs`), rompendo l'equivalenza AST e rendendo il progetto un'opera derivata architetturalmente autonoma.
3. **Titolarità e Decision Making:**
   - La roadmap, le release, il ciclo di vita delle versioni e la revisione delle contribuzioni sono affidate in via esclusiva al maintainer `d4ruerk1`.

---

## 2. Aderenza alle GitHub Acceptable Use Policies
Il repository e i relativi binari sono sviluppati nel pieno rispetto dei **Termini di Servizio di GitHub** e delle relative **Acceptable Use Policies**:

1. **Natura del Software (Educational & Research Utility):**
   - DRQ Complete è uno strumento di ricerca ed utilità desktop che opera simulando processi fittizi locali e interfacciandosi unicamente tramite il protocollo standard Discord Rich Presence (IPC locale).
   - Il software **non** costituisce malware, spyware o strumento di attacco; **non** contiene payload malevoli, né funzionalità di offuscamento ingannevole; **non** effettua intercettazione di credenziali né abuso delle API di GitHub o di servizi terzi.
2. **Uso Responsabile della Piattaforma GitHub:**
   - Tutte le chiamate API o HTTPS verso GitHub (verifica release e catalogo) rispettano i rate limits, usano endpoint pubblici conformi e operano in sola lettura via canali cifrati HTTPS standard.
   - Non viene effettuato alcun abuso delle risorse di calcolo di GitHub Actions o dei servizi di hosting.

---

## 3. Assetto di Licenza Autonomo (Apache-2.0 & MIT Notice)
1. **Licenza Principale Autonoma:**
   - DRQ Complete è distribuito sotto licenza **Apache License, Version 2.0** (vedi [`LICENSE`](LICENSE)), intestata a **Dav (`d4ruerk1`)**.
   - Ogni nuovo modulo, componente e modifica introdotta risponde unicamente a questa licenza.
2. **Tutela della Proprietà Intellettuale & Attribuzione:**
   - In conformità con la Sezione 4 della licenza Apache 2.0 e i requisiti della licenza MIT, le note di copyright storiche relative all'opera d'origine (*Discord Quest Completer* di Mark Terence Tiglao) sono rigorosamente conservate all'interno del file [`NOTICE`](NOTICE).
   - Questa formalizzazione garantisce certezza legale, assenza di conflitti di licenza e piena trasparenza intellettuale.

---

## 4. Esclusione di Garanzia & Limitazione di Responsabilità
*(Ai sensi degli Artt. 7 e 8 della Licenza Apache 2.0 e della normativa generale applicabile)*

1. **Fornitura "AS IS" (Così com'è):**
   - Il software, la documentazione e i binari distribuiti sono forniti **"NELLO STATO IN CUI SI TROVANO" ("AS IS")**, senza garanzie di alcun tipo, esplicite o implicite, comprese, a titolo esemplificativo, garanzie di commerciabilità, idoneità per uno scopo particolare, o assenza di errori o interruzioni.
2. **Limitazione di Responsabilità:**
   - In nessun caso l'autore o i contributori potranno essere ritenuti responsabili per qualsivoglia danno, diretto, indiretto, speciale, incidentale o consequenziale (inclusi, a titolo esemplificativo, perdita di dati, sospensione di account, perdita di ricompense o interruzioni di servizio) derivante dall'uso o dall'impossibilità di usare questo software.
3. **Dichiarazione di Non Affiliazione:**
   - DRQ Complete è un progetto indipendente e non è affiliato, autorizzato, sponsorizzato né in alcun modo collegato a **Discord Inc.**, **GitHub Inc.** o alle rispettive controllate. Tutti i marchi registrati appartengono ai rispettivi proprietari.
4. **Responsabilità dell'Utente:**
   - L'utente assume la totale ed esclusiva responsabilità per la conformità del proprio operato ai Termini di Servizio di Discord e alle policy delle piattaforme di gioco utilizzate.

