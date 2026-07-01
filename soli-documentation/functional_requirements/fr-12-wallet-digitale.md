# FR-12: Wallet Digitale

Il sistema deve fornire un'interfaccia utente per la visualizzazione del saldo punti accumulato e dello storico delle attività svolte.

## Stato implementazione (rev. 2026-07-01)

La `WalletPage` è collegata a dati reali: saldo da `GET /api/wallets/my` e storico transazioni da `GET /api/wallets/my/transactions` (tipizzate `EARN_TASK_REWARD`, `SPEND_DONATION`, `ADJUSTMENT`). Integra inoltre il catalogo enti benefici e la sezione "I miei buoni" (vedi FR-13). Il wallet è creato automaticamente al primo accredito. Pagina riservata al ruolo volontario.
