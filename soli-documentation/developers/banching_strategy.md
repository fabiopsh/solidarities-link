# 🌿 Guida alla Branching Strategy del Team

Questo documento definisce le regole per la creazione e la gestione dei branch nel nostro repository. L'obiettivo è mantenere una history pulita, facilitare le code review e automatizzare i processi collegando il codice ai nostri task.

## 📌 Flusso di Lavoro Base

Utilizziamo un approccio basato sul **GitHub Flow** (con un singolo branch principale stabile):

1. Il branch `main` è considerato **sempre stabile e pronto per la produzione**.
2. Tutto il nuovo lavoro (feature, bugfix, refactor) avviene in **branch separati** staccati dal `main`.
3. Il lavoro viene unito al `main` solo tramite **Pull Request (PR)** approvate.

## 🏷️ Nomenclatura dei Branch (Naming Convention)

Tutti i branch devono seguire questa struttura standard:

> **`<tipo>/<id-ticket>-<descrizione-breve>`**

### 1. I Tipi Consentiti

Utilizziamo prefissi semantici per capire subito lo scopo del branch:

- `feature/` -> Per lo sviluppo di nuove funzionalità.
- `bugfix/` -> Per la risoluzione di bug non urgenti o legati a un task.
- `hotfix/` -> Per la risoluzione di bug critici direttamente in produzione.
- `chore/` -> Per manutenzione, aggiornamento dipendenze, modifiche alla build.
- `docs/` -> Per aggiornamenti esclusivi alla documentazione.
- `refactor/` -> Per modifiche al codice che non alterano le funzionalità (es. ottimizzazioni).

### 2. ID del Ticket

Ogni branch DEVE includere l'ID del ticket a cui fa riferimento (es. il codice di Jira/Linear come `PROJ-123`). Questo permette a Git e al nostro gestionale di collegarsi automaticamente.

### 3. Descrizione

- Usa il formato **kebab-case** (tutto minuscolo, separato da trattini `-`).
- Sii conciso ma descrittivo (2-4 parole).
- Scrivi in inglese (opzionale ma consigliato) per mantenere coerenza col codice.

### ✅ Esempi Corretti:

- `feature/APP-456-login-google`
- `bugfix/APP-480-fix-dashboard-graph`
- `chore/APP-501-update-react-18`

### ❌ Esempi Sbagliati:

- `feature/MioNome/12102024/login` (Evitare date e nomi, Git li traccia già).
- `fix-bug` (Manca il prefisso e l'ID del ticket).
- `feature/APP-456_Login_Google` (Non usare camelCase o underscore, solo kebab-case).

## 🚀 Regole d'Oro per le Pull Request

1. **Aggiorna sempre il branch:** Prima di aprire una PR, assicurati di aver fatto il `pull` delle ultime modifiche dal `main` nel tuo branch.
2. **Review:** Nessuna PR può essere mergiata senza l'approvazione di almeno un altro sviluppatore.
3. **Squash and Merge:** Quando si fa il merge, utilizziamo la strategia "Squash" per unire tutti i commit del branch in un unico commit pulito sul `main`.
4. **Pulizia:** Elimina il tuo branch subito dopo che il merge è stato completato con successo.
