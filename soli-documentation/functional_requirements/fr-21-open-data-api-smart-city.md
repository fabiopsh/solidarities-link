# FR-21: Open Data API per Smart City

Il sistema deve esporre API pubbliche di sola lettura con dati aggregati (analitiche) sul volontariato civico, interrogabili dall'esterno tramite un token API emesso dall'amministratore, per l'integrazione nel contesto smart-city. Le API non devono esporre alcun dato personale.

## Stato implementazione (rev. 2026-07-02)

**Token API.** Entità `ApiToken` (`soli_api_tokens`): la chiave in chiaro è mostrata una sola volta alla creazione, a sistema è salvato solo l'hash SHA-256. Scadenza obbligatoria, revocabile, con tracciamento `lastUsedAt`/`callCount`. Gestione admin: `GET/POST /api/admin/tokens`, `POST /api/admin/tokens/{id}/revoke`, `DELETE /api/admin/tokens/{id}` (ruolo ADMIN).

**Gating.** Gli endpoint `/api/open/**` sono permessi a livello OIDC (`policy=permit`) e protetti da `OpenDataApiKeyFilter`: passa se l'header `X-API-Key` è valido (token non revocato/non scaduto) oppure se il chiamante è un ADMIN autenticato (per l'anteprima nel cruscotto). Altrimenti `401`.

**Endpoint** (`/api/open/v1`): `meta`, `categories`, `stats/overview`, `stats/tasks/by-category|by-urgency|by-status|timeseries`, `stats/geo/by-city|grid`, `stats/credits|credits/timeseries`, `stats/volunteering`, `stats/impact`, `stats/charities`. Aggregazioni via SQL nativo (`AnalyticsService`). Documentati in OpenAPI (tag *Open Data*, Swagger UI su `/q/swagger-ui`) e in `open_data_api.md`.

**Privacy.** Solo aggregati; geolocalizzazione a griglia con soppressione delle celle con conteggio < 3 (k-anonymity); nessun identificativo utente/task nelle risposte. Licenza dati CC-BY 4.0.

**Interfaccia.** Cruscotto admin (`AdminDashboardPage`) esteso a tab: *Task*, *Statistiche* (grafici `@mui/x-charts` alimentati dalle API Open), *API Token* (creazione con scadenza, visualizzazione chiave una volta, revoca). Portale pubblico `/developers` con catalogo, esempi e prova live.
