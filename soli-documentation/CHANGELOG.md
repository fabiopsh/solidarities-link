# Changelog implementazione

Registro delle modifiche rilevanti che impattano requisiti funzionali e modello dati.

## 2026-07-01 — Wallet/Crediti end-to-end, enti benefici, fix UX

### Crediti e completamento task (FR-11, FR-18)
- Aggiunti i campi `checkInAt` / `checkOutAt` all'entità **Task**.
- Calcolo crediti reale: `durata_ore × 6 × moltCriticità × moltCategoria`, minimo 1 credito, durata basata sui secondi (task sotto il minuto ⇒ ≥1 credito) e limitata a 8 ore.
  - Criticità (`urgencyLevel`): LOW ×1.0, MEDIUM ×1.25, HIGH ×1.5, CRITICAL ×2.0.
  - Categoria (`category`): SOCIAL ×1.0, DIGITAL ×1.1, PET_SUPPORT ×1.1, MOBILITY ×1.2, PHYSICAL_SUPPORT ×1.5.
- Flusso a doppia conferma (FR-18): al completamento, se i timestamp mancano, `checkInAt = acceptedAt` e `checkOutAt = now()` come fallback.
- Accredito reso **sincrono e atomico** nella transazione di completamento (in precedenza asincrono, con errori silenziosi). Credito salvato anche su `Task.rewardCredits`.

### Marketplace / conversione premi (FR-13)
- Nuove entità **Charity** (ente benefico erogatore di buoni) e **Redemption** (buono riscattato con codice univoco).
- **Seeding** di 4 enti reali al primo avvio (bean `@Startup`, idempotente): Banco Alimentare, Croce Rossa Italiana, Legambiente, Emergency.
- **Riscatto atomico** con lock pessimistico sul wallet: verifica saldo/stock, scala crediti, decrementa stock, genera codice buono, registra `Transaction` `SPEND_DONATION` con `referenceId` = ente. Rollback su credito insufficiente/stock esaurito.
- **Doppia conferma** lato UI prima del riscatto.
- Nuove API: `GET /api/charities`, `GET /api/charities/{id}`, `POST /api/charities/{id}/redeem`, `GET /api/charities/my/redemptions`, + CRUD admin.

### Wallet digitale (FR-12)
- `WalletPage` collegata a dati reali (saldo + storico transazioni), catalogo enti benefici e sezione "I miei buoni". Wallet creato automaticamente al primo accredito.

### Segnalazioni (FR-14)
- Pulsante "Segnala comportamento" sul dettaglio task (solo `COMPLETED`, per creatore/volontario) → dialog → `POST /api/reports`. Usa l'entità `Report` esistente (stato iniziale `OPEN`); moderazione/sospensione restano manuali.

### Wizard creazione richiesta (FR-03)
- Precompilazione automatica di indirizzo e pin mappa con "la mia posizione" (reverse-geocoding all'apertura), senza click aggiuntivi.

### Migliorie UX (non funzionali)
- Dettaglio task: rimossa card "Dettagli Sessione"; data di creazione mostrata in piccolo nella card principale.
- Dark mode: correzione leggibilità dei popup mappa (Leaflet) e del drawer di dettaglio — introdotto il marcatore `data-mui-color-scheme` su `<html>` e sostituiti i grigi statici con colori theme-aware.

### File toccati
- **Backend (nuovi):** `entity/Charity.java`, `entity/Redemption.java`, `resource/CharityResource.java`, `bootstrap/DataSeeder.java`.
- **Backend (modificati):** `entity/Task.java`, `entity/UrgencyLevel.java`, `entity/ServiceCategory.java`, `service/TaskService.java`, `service/WalletService.java`.
- **Frontend (nuovi):** `types/models/Charity.ts`.
- **Frontend (modificati):** `pages/WalletPage.tsx`, `pages/TaskWizardPage.tsx`, `pages/TaskDetailPage.tsx`, `components/TaskMapView.tsx`, `context/ThemeModeContext.tsx`, `index.css`, `types/models/Task.ts`.

### Note tecniche
- Persistenza schema via Hibernate auto-DDL (`generation=update`): le nuove tabelle `soli_charities`/`soli_redemptions` e le colonne `check_in_at`/`check_out_at` sono create all'avvio. `import.sql` non è usato (non gira con `update`) → seeding via bean `@Startup`.
