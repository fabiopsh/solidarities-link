# Utenti di test — SOLI

> Generato da `scripts/seed.py`. Credenziali in chiaro: **solo per test**, non usare in produzione.

Password comune per tutti gli account: `Solidale2026!`

## Account noti

| Email | Ruolo | Note |
| --- | --- | --- |
| admin@soli.it | ADMIN | Amministratore (accesso pannello admin) |
| mario.rossi@soli.it | USER | Volontario/Richiedente (toggle UI) |
| giulia.bianchi@soli.it | USER | Volontario/Richiedente |
| luca.verdi@soli.it | USER | Volontario/Richiedente |
| anna.russo@soli.it | USER | Volontario/Richiedente |
| marco.ferrari@soli.it | USER | Volontario/Richiedente |

Gli altri account generati hanno email nella forma `nome.cognomeN@soli.test`
(stessa password `Solidale2026!`). I beneficiari anziani sono righe DB senza login Keycloak.

Il ruolo volontario/richiedente è un toggle nell'interfaccia (non persistito): ogni
account USER può agire da entrambi.
