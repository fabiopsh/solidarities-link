# SOLI — Script dati di test

Script Python per **azzerare** e **ripopolare** il sistema con dati realistici e
coerenti (utenti su Keycloak + DB, task passati/presenti/futuri, crediti,
riscatti, associazioni, segnalazioni), così che l'app sembri "viva" e le API
pubbliche restituiscano dati sensati.

## Prerequisiti

- Container `soli-postgres` e `soli-keycloak` in esecuzione (`docker compose up -d postgres keycloak`).
- **Le tabelle devono già esistere**: avviare almeno una volta il backend (`quarkus:dev`)
  così Hibernate crea lo schema (`generation=update`). Il seed NON richiede il backend attivo.
- Python 3.9+.

```bash
cd scripts
python -m venv .venv && . .venv/Scripts/activate   # Windows Git Bash
# oppure: . .venv/bin/activate                      # Linux/Mac
pip install -r requirements.txt
```

## Uso

```bash
# Azzera DB (soli_*) + utenti Keycloak, poi rigenera tutto
python seed.py --reset

# Solo generazione (senza wipe)
python seed.py

# Volumi personalizzati
python seed.py --reset --users 60 --tasks 500

# Solo pulizia
python reset.py            # DB + Keycloak
python reset.py --db-only
python reset.py --kc-only
```

## Configurazione

Valori di default per lo stack docker locale (Postgres `localhost:5433`,
Keycloak `http://localhost:8180`, realm `soli`, admin `admin`/`admin`).
Override via variabili d'ambiente — vedi `config.py` (`SOLI_PG_*`, `SOLI_KC_*`,
`SOLI_TEST_PASSWORD`, `SOLI_SEED_USERS`, `SOLI_SEED_TASKS`).

## Cosa genera

- **Utenti**: account fissi noti (`admin@soli.it`, `mario.rossi@soli.it`, …) +
  utenti Faker `it_IT`, creati sia in Keycloak sia in `soli_users`
  (`keycloak_id` = `sub`). Beneficiari anziani solo-DB (senza login) collegati via
  `CaregiverRelation`. Credenziali in `TEST_USERS.md` (generato).
- **Profili volontario** con categorie, posizione e raggio; **wallet** per ogni utente.
- **Task** distribuiti su Pisa/Milano/Roma e nel tempo (passato/presente/futuro),
  con lifecycle completo: audit log, chat, notifiche, transazioni crediti
  (formula reale `6/ora × moltiplicatori`), riscatti (`SPEND_DONATION` + buono),
  associazioni, segnalazioni.
- **Cataloghi**: 4 enti benefici (Charity) + 6 premi (Reward).

I dati sono deterministici (seed fisso) per riproducibilità.

## Note

- `reset.py` non elimina l'utente Keycloak protetto `admin@soli.it`.
- I saldi wallet sono ricalcolati come somma delle transazioni (coerenza garantita).
- Riesecuzione: usare sempre `--reset` per ripartire pulito ed evitare duplicati.
