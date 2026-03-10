# Piano di Implementazione AI - Solidarities Link (SoLi)

Questo documento contiene la sequenza di prompt strutturati in 14 iterazioni piccole e coese.
La documentazione è stata organizzata in micro-file all'interno delle cartelle `soli-documentation/functional_requirements` e `soli-documentation/non_functional_requirements`.
**L'analisi dell'attuale codebase ha rilevato che:**

- **Il livello Dati (Entità JPA Panache) e le API CRUD base (Resource) del Backend sono già stati implementati.**
- **L'autenticazione Keycloak (Frontend Web e Mobile) e i layout base esistono già.**

> **Pre-requisito per ogni iterazione:** L'IA deve sempre avere nel suo contesto sia il file `@[.agent/AI_CONTEXT.md]` sia i file dei requisiti (FR e NFR) menzionati esplicitamente all'inizio del prompt. Le decisioni devono sempre rispettare il contenuto dei file indicati.

---

## Livello Backend: Logica Core & Dati

### Iterazione 1: Macchina a Stati per i Task (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-18-gestione-stato-della-task.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. Crea un `TaskService` nella cartella `it.soli.service`.
Facendo rigorosamente riferimento a @[soli-documentation/functional_requirements/fr-18-gestione-stato-della-task.md], implementa i metodi per la gestione sicura dello stato del Task (`TaskStatus`):
1. `assignTask(UUID taskId, UUID volunteerId)` (da OPEN a ASSIGNED),
2. `startTask(UUID taskId)` (da ASSIGNED a IN_PROGRESS),
3. `completeTask(UUID taskId)` (da IN_PROGRESS a COMPLETED).
Se si tenta un cambio di stato illegale (es. OPEN -> COMPLETED), lancia un'eccezione custom annotata o mappata per restituire HTTP 400.
Aggiorna `TaskResource` affinché utilizzi questi metodi invece di aggiornare direttamente l'entità.
```

### Iterazione 2: Annullamento Task e Audit Logging (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-19-annullamento-richiesta.md]`
- `@[soli-documentation/non_functional_requirements/nfr-11-tracciabilit-delle-operazioni-audit-log.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`.
1. Aggiungi a `TaskService` il metodo `cancelTask(UUID taskId, UUID requesterId)`. Leggi @[soli-documentation/functional_requirements/fr-19-annullamento-richiesta.md] e garantisci che l'annullamento avvenga solo per task non avviati. Usa validazioni appropriate.
2. Implementa l'Audit Logging leggendo @[soli-documentation/non_functional_requirements/nfr-11-tracciabilit-delle-operazioni-audit-log.md]. Crea la logica per salvare un record immutabile nella tabella `AuditLog` OGNI VOLTA che un Task cambia stato positivamente (salvando user_id, action, state_before, state_after).
```

### Iterazione 3: Geofencing Base - Aggiornamento Posizione (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. Leggi le direttive da @[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md].
1. Modifica l'entità `VolunteerProfile` per gestire le coordinate spaziali: `Double lastLatitude` e `Double lastLongitude`.
2. Aggiungi in `UserResource` o `VolunteerProfileResource` un nuovo endpoint `PUT /api/users/me/location`. Ricevi un payload JSON con `latitude` e `longitude` e aggiorna silenziosamente il DB ricavando l'ID della sessione JWT attiva.
```

### Iterazione 4: Algoritmo di Matching (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-07-algoritmo-di-matching.md]`
- `@[soli-documentation/non_functional_requirements/nfr-04-prestazioni-e-reattivit-real-time.md]`
- `@[soli-documentation/non_functional_requirements/nfr-05-fairness-algoritmica-e-sostenibilit-etica.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. Analizza bene la formula del matching da @[soli-documentation/functional_requirements/fr-07-algoritmo-di-matching.md], i vincoli di calcolo (@[soli-documentation/non_functional_requirements/nfr-04-prestazioni-e-reattivit-real-time.md]) e l'equità (@[soli-documentation/non_functional_requirements/nfr-05-fairness-algoritmica-e-sostenibilit-etica.md]).
1. Crea un `MatchingService`. Implementa la logica: dato un `Task` in OPEN (con sue lat/lng), preleva tutti i `VolunteerProfile` attivi.
2. Filtra per competenza (`ServiceCategory`), limitato in base a incompatibilità fisiche (se presenti in db).
3. Ordina in primis per prossimità (entro X km) (usa la formula matematica di Haversine).
4. A parità dei precedenti o come sorting secondario usa la "Rotazione Equa" come richiesto dall'NFR.
5. Usa hook asincroni o inietta in `TaskService.createTask` per farsi restituire la lista di "candidati". Salvali in memoria cache o in un'entità `TaskNotification`.
```

### Iterazione 5: Check-in, Check-out e Sicurezza Token (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-10-accettazione-rifiuto-e-rilascio-task.md]`
- `@[soli-documentation/functional_requirements/fr-12-validazione-tramite-token-qr-code.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. Applica il rigoroso controllo di erogazione e rilascio da @[soli-documentation/functional_requirements/fr-10-accettazione-rifiuto-e-rilascio-task.md] e @[soli-documentation/functional_requirements/fr-12-validazione-tramite-token-qr-code.md].
1. Modifica `TaskService.assignTask`: Genera e salva un `checkInToken` crittografato o pseudocasuale sul `Task`.
2. Aggiungi i controller `POST /api/tasks/{id}/checkin`: Verifica possesso del token d'apertura. Se combacia, passa a IN_PROGRESS e forgia il `checkOutToken`. Se non combacia -> esci in 400 Bad Request / 403 Forbidden.
3. Aggiungi i controller `POST /api/tasks/{id}/checkout`: Verifica il possesso del token chiusura. Se combacia, passa a COMPLETED.
```

### Iterazione 6: Economia e Time Banking (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-13-calcolo-e-assegnazione-crediti-soli.md]`
- `@[soli-documentation/functional_requirements/fr-17-gestione-storico-e-audit.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. Segui i dictat matematici di @[soli-documentation/functional_requirements/fr-13-calcolo-e-assegnazione-crediti-soli.md] e di sicurezza di @[soli-documentation/functional_requirements/fr-17-gestione-storico-e-audit.md].
1. Crea un `WalletService`. Non appena un task passa a COMPLETED, il servizio assegna punti in base alle ore impiegate tra checkin e checkout (oppure fisso di test).
2. Verifica se l'utente ha il db record `Wallet` (in caso contrario, crealo su innesco on-demand). Inseriscigli un db record `Transaction` di guadagno (tipo: EARN) tracciando il legame col taskId incriminato.
3. Arricchisci `WalletResource` per renderizzarne in `GET` lo storico inarrestabile.
```

---

## Livello Backend: Real-time & Intelligenza Artificiale

### Iterazione 7: WebSockets e Server-Sent Events (Backend)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-09-sistema-di-notifiche-push-mirate.md]`
- `@[soli-documentation/functional_requirements/fr-11-messaggistica-interna-anonimizzata.md]`
- `@[soli-documentation/non_functional_requirements/nfr-03-privacy-e-protezione-dei-dati-gdpr-compliance.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. Architetta le pipe sincrone e protette leggendo i file: @[soli-documentation/functional_requirements/fr-09-sistema-di-notifiche-push-mirate.md], @[soli-documentation/functional_requirements/fr-11-messaggistica-interna-anonimizzata.md] e in compliance a @[soli-documentation/non_functional_requirements/nfr-03-privacy-e-protezione-dei-dati-gdpr-compliance.md].
1. Server-Sent Events (SSE): su `NotificationResource` aggiungi l'endpoint `GET /api/notifications/stream`. Permetti l'iscrizione per JWT. Il `MatchingService` ora non stampa su console, ma inietta messaggi nel payload degli SSE degli user selezionati dalla candidate list.
2. WebSockets (Chat): su `ChatResource` (`/chat/{taskId}`). Permetti il Join validando la sovranità sul task da parte dell'utente. Chiudi la socket o non inoltrare se il task è disattivato.
3. Salva i messaggi inviati come `ChatMessage`.
```

### Iterazione 8: Mock AI per Moderazione e Assistant (Backend - PoC)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-05-input-conversazionale-e-vocale-soli-assistant.md]`
- `@[soli-documentation/non_functional_requirements/nfr-06-moderazione-dei-contenuti-ai-safety.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-backend`. ATTENZIONE: Essendo un PoC, NON integrare un vero LLM per ora, ma crea un `MockAIService` che simuli i comportamenti richiesti da @[soli-documentation/functional_requirements/fr-05-input-conversazionale-e-vocale-soli-assistant.md] e @[soli-documentation/non_functional_requirements/nfr-06-moderazione-dei-contenuti-ai-safety.md].
1. "Moderazione (Mock)": Nel WebSocket `ChatResource`, prima di effettuare il broadcast, controlla se il messaggio contiene parole chiave hardcodate (es. "idiota", "truffa", "paga"). Se sì, blocca il messaggio e restituisci un warning al mittente sul canale WebSocket.
2. "Intent Extraction (Mock)": Implementa `POST /api/assistant/extract`. Riceve testo libero. Se il testo contiene certe parole (es. "spesa", "farmacia", "compagnia"), restituisci un JSON mockato formattato correttamente con campi pre-compilati e una Categoria fissa per simulare un'estrazione intelligente andata a buon fine.
```

---

## Livello Frontend Web (React SPA)

**ATTENZIONE:** Il frontend attuale ha solo il giro di login e una landing. È necessario costruire da zero il routing, i layout principali e tutte le pagine operative, rispettando MUI e i colori in `theme.ts`.

### Iterazione 9: Architettura Base, Routing e Layout (Frontend Web)

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. L'app è sostanzialmente vuota dopo il login. Costruisci l'infrastruttura di navigazione.
1. Implementa in `App.tsx` (o `main.tsx`) il routing completo con `react-router-dom`. Assicurati che le rotte applicative (Dashboard, Wallet, Profilo) siano protette da un `ProtectedRoute` robusto che verifichi l'autenticazione.
2. Crea `DashboardLayout.tsx`. Implementa una Sidebar di navigazione (mobile-friendly, collassabile) e una Topbar (per profilo e logout), usando componenti Material UI.
3. Cabla un client Axios (es. in `api.ts`) con un Interceptor che alleghi ovunque automaticamente il Bearer Token (JWT Keycloak) a tutte le chiamate `/api/*` dirette al backend.
```

### Iterazione 10: Task Wizard e Integrazione Mock AI (Frontend Web)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-04-wizard-di-creazione-richiesta-guidata.md]`
- `@[soli-documentation/non_functional_requirements/nfr-01-accessibilit-e-usabilit-inclusivit.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. Crea la pagina per immettere una richiesta di aiuto, seguendo @[soli-documentation/functional_requirements/fr-04-wizard-di-creazione-richiesta-guidata.md] e @[soli-documentation/non_functional_requirements/nfr-01-accessibilit-e-usabilit-inclusivit.md].
1. Crea `TaskWizardPage.tsx` con un form Material UI a step, chiaro, con pulsanti grossi (accessibilità).
2. Fornisci un box testuale predominante "SoliAssistant". Al click di "Usa Assistente", fai una chiamata Axios a `POST /api/assistant/extract` (il Mock fatto nel backend).
3. Gestisci la risposta: i campi del form si devono auto-compilare a schermo! Quindi lascia all'utente il solo click sul bottone finale di submit che chiamerà la `POST /api/tasks` vera e propria per salvare.
```

### Iterazione 11: Task Dashboard e Dettaglio (Frontend Web)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-19-annullamento-richiesta.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. Permetti la visione del proprio storico lavori e l'annullamento protetto: @[soli-documentation/functional_requirements/fr-19-annullamento-richiesta.md].
1. Sviluppa `DashboardPage.tsx`. Recupera via Axios la lista dei Task dell'utente da `/api/tasks` e renderizzali in griglie di semplici ma eleganti Material Cards.
2. Inserisci in ogni Card in stato OPEN il bottone "Annulla". Cliccandolo, apri un Dialog di conferma UI e chiama l'API di annullamento. Ricarica la lista.
3. Crea e aggancia nel routing `TaskDetailPage.tsx` per ispezionare singolarmente un task. Se il task è ASSIGNED o IN_PROGRESS, qui dovrai stampare a grande schermo il `checkInToken` alfanumerico (se tu ne sei l'autore) in modo che il Volontario di persona lo possa scansionare/leggere.
```

### Iterazione 12: Profilazione e Wallet Gamification (Frontend Web)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-02-profilazione-volontario-e-gestione-preferenze.md]`
- `@[soli-documentation/functional_requirements/fr-14-wallet-digitale.md]`
- `@[soli-documentation/functional_requirements/fr-15-marketplace-di-conversione-premi.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. Soddisfa le logiche di settings e appagamento visuale: @[soli-documentation/functional_requirements/fr-02-profilazione-volontario-e-gestione-preferenze.md], @[soli-documentation/functional_requirements/fr-14-wallet-digitale.md] e @[soli-documentation/functional_requirements/fr-15-marketplace-di-conversione-premi.md].
1. Sviluppa `ProfilePage.tsx` con form Switch e Checkbox per settare Disponibilità fisiche e Competenze. Chiamata a `PUT /api/users/me/profile`.
2. Sviluppa `WalletPage.tsx`. Grafica premium (gamification): Box enormi per i `Crediti SOLI` totali, gradienti in stile `theme.ts`. Lista pulita che carica lo storico `Transaction`.
3. Sempre nel Wallet, in basso mostra 3-4 Card fittizie UI rappresentanti "Sponsor Locali" per la conversione crediti a fini demo.
```

### Iterazione 13: Live Chat WebSockets nel Dettaglio Task (Frontend Web)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-11-messaggistica-interna-anonimizzata.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. Fornisci chat pseudo-anonima @[soli-documentation/functional_requirements/fr-11-messaggistica-interna-anonimizzata.md].
1. Dentro `TaskDetailPage.tsx`, sviluppa un pannello Chat o un drawer collassabile laterale per i messaggi.
2. Connetti un oggetto WebSocket nativo a `ws://localhost:8080/chat/{taskId}`, iniettando il token.
3. Gestisci lo `useState` dei messaggi in ingresso per stamparli in tempo reale. Se il mock moderatore del backend respinge il testo, mostra in modo visibile un `Alert` rosso di Material UI avvertendo il mittente.
```

---

### Iterazione 14: Selezione Posizione e Mappa nel Task Wizard (Frontend Web)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-04-wizard-di-creazione-richiesta-guidata.md]`
- `@[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. Integra la selezione della posizione nel wizard di creazione, soddisfacendo @[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md].
1. In `TaskWizardPage.tsx`, aggiungi uno step dedicato alla "Posizione". Utilizza una mappa interattiva (es. `react-leaflet` o API Google Maps mockata) in stile Glovo per permettere all'utente di posizionare un pin spostando la mappa.
2. Aggiungi un campo di input testuale (Autocompletamento indirizzo mockato) che aggiorni le coordinate del pin e viceversa.
3. Salva la latidudine e la longitudine selezionate nello state del form per inviarle nel payload finale della `POST /api/tasks`.
```

### Iterazione 15: Visualizzazione Mappa dei Task per i Volontari (Frontend Web)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-frontend`. Aggiungi una visualizzazione geografica dei task per i volontari, come richiesto in @[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md].
1. In `DashboardPage.tsx` o in una nuova vista `TaskRadarPage.tsx`, crea un Toggle Switch "Lista / Mappa".
2. Nella visualizzazione Mappa, mostra una mappa a tutto schermo centrata sulla posizione attuale del volontario (recuperata dal browser via `navigator.geolocation`).
3. Effettua una `GET /api/tasks` prelevando i task in stato OPEN e piazza dei marker sulla mappa.
4. Cliccando su un marker, apri un popup (Tooltip) con il riassunto della richiesta e un pulsante per navigare al dettaglio.
```

---

## Livello Frontend Mobile (Expo React Native)

**ATTENZIONE:** Il mobile è essenziale per il Volontario in strada. Anche qui i layout base sono minimali e vanno creati/espansi.

### Iterazione 16: Navigazione Mobile e Lista Task (Mobile)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-mobile`. Getta le fondamenta strutturali e la lista task da @[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md].
1. Setta lo stack di `expo-router` in `(tabs)/_layout.tsx` inserendo tab bar logiche: Radar, Wallet, Profilo.
2. Costruisci `home.tsx` (Lista): Esegui una `GET` al backend ed elenca in scroll le Card dei Task in zona aperti (in modo da bypassare temporaneamente il push event cloud complex e testare subito in UI).
```

### Iterazione 17: Radar Volontario - GPS e Mappa dei Task (Mobile)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-mobile`. Aggiungi la visualizzazione mappa e il tracking GPS da @[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md].
1. Usa `expo-location`. All'avvio loggato, richiedi permessi OS e lancia aggiornamenti background/foreground HTTP a `PUT /api/users/me/location` ad ogni spostamento rilevante del device.
2. Aggiungi un toggle in `home.tsx` per passare dalla lista a una mappa interattiva (es. `react-native-maps`).
3. Renderizza marker personalizzati per i task sulla mappa e permetti di aprire un bottom sheet al tap su un marker con i dettagli per accettarlo.
```

### Iterazione 18: Creazione Task da Mobile - Mappa e Posizione (Mobile)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-04-wizard-di-creazione-richiesta-guidata.md]`
- `@[soli-documentation/functional_requirements/fr-08-geolocalizzazione-e-geofencing.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-mobile`. Implementa la creazione di nuove richieste da app mobile.
1. Crea `CreateTaskScreen.tsx`. Aggiungi lo step iniziale per la macro-categoria e descrizione della richiesta (innescando il Mock AI assist locale o remoto).
2. Nello step della posizione, mostra una mappa (`react-native-maps`) con un marker fisso al centro dello schermo. L'utente sposta la mappa (pan & zoom) e ottiene la posizione centrale al rilascio (`onRegionChangeComplete`).
3. Invia i dati tramite `POST /api/tasks` al termine del form.
```

### Iterazione 19: Scanning QR Camera e Check-in (Mobile)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-10-accettazione-rifiuto-e-rilascio-task.md]`
- `@[soli-documentation/functional_requirements/fr-12-validazione-tramite-token-qr-code.md]`

**Prompt per l'IA:**

```text
Lavora in `soli-mobile`. Implementa lo scanning Checkin in presenza per @[soli-documentation/functional_requirements/fr-10-accettazione-rifiuto-e-rilascio-task.md] e @[soli-documentation/functional_requirements/fr-12-validazione-tramite-token-qr-code.md].
1. Crea `ActiveTaskScreen.tsx` che mostra i task assegnati in stato ASSIGNED o IN_PROGRESS.
2. Usa `expo-camera` per permettere al Volontario di inquadrare fisicamente il telefono del Richiedente (il quale mostrerà il QR `checkInToken` nel Frontend Web).
3. Parsata la stringa QR, inviala a `POST /api/tasks/{taskId}/checkin`. In caso 200 OK mostra Toast di successo e muta stato visivo della UI abilitando il "Check-out".
```

### Iterazione 20: Flusso di Check-out, Assegnazione Punti e Feedback (Web & Mobile)

**File di Riferimento da Includere:**

- `@[soli-documentation/functional_requirements/fr-12-validazione-tramite-token-qr-code.md]`
- `@[soli-documentation/functional_requirements/fr-13-calcolo-e-assegnazione-crediti-soli.md]`

**Prompt per l'IA:**

```text
Lavora in modo correlato su `soli-frontend` e `soli-mobile` per completare il task in base a @[soli-documentation/functional_requirements/fr-12-validazione-tramite-token-qr-code.md] e @[soli-documentation/functional_requirements/fr-13-calcolo-e-assegnazione-crediti-soli.md].
1. In `soli-frontend` (Web): Aggiorna `TaskDetailPage.tsx` per i task IN_PROGRESS mostrando il SECONDO QR code (`checkOutToken`). A checkout avvenuto, mostra al richiedente una schermata per lasciare un feedback a 5 stelle al volontario.
2. In `soli-mobile` (Mobile): Cliccando su "Completa Task", apri lo scanner fotocamera per leggere il `checkOutToken`.
3. Invia a `POST /api/tasks/{taskId}/checkout`. Al 200 OK triggera una micro-animazione celebrativa (es. Lottie) su mobile e naviga automaticamente sulla vista Wallet per mostrare i nuovi Crediti SOLI guadagnati!
```
