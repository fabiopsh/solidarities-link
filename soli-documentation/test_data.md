# Dati di test e ambiente demo

Per rendere la PoC credibile ("app viva") e le API pubbliche sensate, il repo
include script che azzerano e ripopolano il sistema con dati realistici e
coerenti. Vedi `scripts/README.md` per l'uso operativo.

## Come rigenerare l'ambiente

```bash
cd scripts
pip install -r requirements.txt
python seed.py --reset          # ~40 utenti, ~300 task (default)
```

Prerequisiti: container `soli-postgres` e `soli-keycloak` attivi; schema già
creato (avviare il backend almeno una volta). Il seed scrive direttamente su DB
(per retro-datare i timestamp) e crea gli account su Keycloak.

## Account di test

Password comune: `Solidale2026!` (in chiaro, solo test). Account noti:

| Email | Ruolo DB | Uso |
| --- | --- | --- |
| admin@soli.it | ADMIN | Pannello amministrativo, moderazione |
| mario.rossi@soli.it | USER | Demo volontario/richiedente |
| giulia.bianchi@soli.it | USER | Demo |
| luca.verdi@soli.it | USER | Demo |
| anna.russo@soli.it | USER | Demo |
| marco.ferrari@soli.it | USER | Demo |

Altri utenti: `nome.cognomeN@soli.test` (stessa password). Il ruolo
volontario/richiedente è un toggle UI (non persistito): ogni USER può fare
entrambi. L'elenco completo aggiornato è in `scripts/TEST_USERS.md` (rigenerato a
ogni seed).

## Composizione del dataset (default)

- **Geografia**: Pisa, Milano, Roma (coordinate + indirizzi reali per città;
  matching di prossimità coerente intra-città).
- **Utenti**: ~40 con login + ~8 beneficiari anziani solo-DB (collegati a un
  caregiver). ~75% degli utenti sono volontari (con profilo, categorie, posizione).
- **Task (~300)** distribuiti nel tempo e per stato: ~55% COMPLETED (passato),
  quote di ACCEPTED/IN_PROGRESS (presente), OPEN/NOTIFIED e OPEN con
  `scheduledAt` futuro, più RELEASED/CANCELLED. Ogni task completato ha audit
  log delle transizioni, chat, notifiche, e una transazione crediti coerente.
- **Crediti**: calcolati con la formula reale (6 crediti/ora × moltiplicatore
  criticità × moltiplicatore categoria, min 1); i saldi wallet = somma delle
  transazioni.
- **Riscatti**: parte dei volontari con saldo sufficiente riscatta buoni presso
  gli enti benefici (transazioni `SPEND_DONATION`, decremento stock, codice buono).
- **Cataloghi**: 4 enti benefici (`/api/charities`) + 6 premi (`/api/rewards`) →
  API pubbliche non vuote.
- **Associazioni** (3, con membri APPROVED/PENDING) e **segnalazioni** su task
  completati (stati misti).

## API pubbliche coinvolte

Endpoint pubblici già disponibili, resi sensati dai dati generati:

- `GET /api/rewards`, `GET /api/rewards/{id}` — catalogo premi.
- `GET /api/charities`, `GET /api/charities/{id}` — enti benefici.
- `POST /api/assistant/extract` — estrazione intent (mock AI).

La distribuzione geografica/temporale/per-categoria dei task è pensata per
alimentare in modo credibile future aggregazioni statistiche smart-city
(domanda per zona, categorie più richieste, crediti in circolazione, ecc.).
