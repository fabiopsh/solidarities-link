# FR-13: Marketplace di Conversione Premi

Il sistema deve permettere la conversione dei Crediti SOLI in premialità vincolate alla donazione (sconti trasporti, buoni spesa, accessi culturali) attraverso un catalogo premi gestito in collaborazione con gli sponsor locali.

## Stato implementazione (rev. 2026-07-01)

**Modello.** Il marketplace è realizzato tramite **enti benefici reali** (entità `Charity`) che erogano buoni, e la **Redemption** che rappresenta il buono riscattato. Sono presenti a sistema 4 enti reali seedati al primo avvio: Banco Alimentare, Croce Rossa Italiana, Legambiente, Emergency.

**Flusso di riscatto.**
1. La `WalletPage` mostra gli enti disponibili (`GET /api/charities`) con causa, buono erogato, costo in crediti e stock residuo. Il pulsante "Riscatta" è abilitato solo se il saldo è sufficiente e c'è stock.
2. Il riscatto richiede una **doppia conferma** lato UI (riepilogo → conferma definitiva) prima dell'invio.
3. `POST /api/charities/{id}/redeem` esegue il riscatto in **un'unica transazione atomica** con lock pessimistico sul wallet: verifica saldo/stock, scala i crediti, decrementa lo stock, genera un **codice buono** univoco (`Redemption`) e registra una `Transaction` `SPEND_DONATION` con `referenceId` = ente benefico. In caso di credito insufficiente o stock esaurito → errore, nessuna modifica (rollback).
4. L'utente vede i buoni ottenuti nella sezione "I miei buoni" (`GET /api/charities/my/redemptions`).

**API.** `GET /api/charities`, `GET /api/charities/{id}`, `POST /api/charities/{id}/redeem`, `GET /api/charities/my/redemptions`, più CRUD amministrativo (`POST/PUT/DELETE`, ruolo ADMIN).
