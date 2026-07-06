# SOLI Open Data API (smart-city)

API pubbliche di **sola lettura** che espongono dati **aggregati** sul volontariato
civico gestito da SOLI, pensate per l'integrazione nel contesto **smart-city**
(cruscotti comunali, portali open-data, ricerca, giornalismo dei dati).

- **Base path:** `/api/open/v1`
- **Licenza dati:** CC-BY 4.0
- **Formato:** JSON
- **Privacy:** nessun dato personale. Solo conteggi, medie e serie temporali; la
  geolocalizzazione è aggregata e le celle con meno di 3 elementi sono soppresse
  (k-anonymity). Nessun identificativo di utente o task è mai restituito.

## Autenticazione

Ogni richiesta richiede un **token API** emesso da un amministratore, passato
nell'header `X-API-Key`:

```bash
curl -H "X-API-Key: soli_xxxxxxxxxxxxxxxxxxxxxxxx" \
  http://localhost:8080/api/open/v1/stats/overview
```

- I token hanno una **scadenza obbligatoria** e possono essere **revocati**.
- La chiave in chiaro è mostrata **una sola volta** alla creazione; a sistema è
  salvato solo l'hash SHA-256.
- Senza header valido → `401`. Token scaduto/revocato → `401`.
- Gestione token: pannello Admin → tab **API Token** (endpoint `/api/admin/tokens`,
  riservati al ruolo ADMIN).
- Documentazione interattiva OpenAPI/Swagger: `/q/swagger-ui` (tag *Open Data*).

## Endpoint

| Metodo | Path | Descrizione |
| --- | --- | --- |
| GET | `/meta` | Metadati dataset: versione, licenza, ultimo aggiornamento, città coperte |
| GET | `/categories` | Categorie di servizio e moltiplicatori crediti |
| GET | `/stats/overview` | Panoramica: utenti, volontari, task per stato, crediti, riscatti |
| GET | `/stats/tasks/by-category` | Task per categoria: totale, completati, tasso, crediti medi |
| GET | `/stats/tasks/by-urgency` | Task per livello di criticità |
| GET | `/stats/tasks/by-status` | Conteggi per stato |
| GET | `/stats/tasks/timeseries` | Serie temporale creati/completati (`from`,`to`,`granularity=day\|week\|month`) |
| GET | `/stats/geo/by-city` | Distribuzione per città: task, completati, crediti medi |
| GET | `/stats/geo/grid` | Heatmap aggregata per cella lat/lon (`precision=1..4`; celle < 3 soppresse) |
| GET | `/stats/credits` | Crediti guadagnati, spesi, in circolazione, media per task |
| GET | `/stats/credits/timeseries` | Serie temporale crediti guadagnati/spesi |
| GET | `/stats/volunteering` | Volontari attivi, task medi, copertura categorie, tempo medio di risposta |
| GET | `/stats/impact` | Ore di volontariato, beneficiari, crediti donati, ripartizione per causa |
| GET | `/stats/charities` | Enti benefici e statistiche di riscatto |
| GET | `/stats/cities` | Confronto KPI tra città (task, completamento, tempo di risposta, volontari, crediti) |
| GET | `/city/{city}` | Report analitico completo di una singola città (drill-down) |
| GET | `/stats/demand-supply` | Domanda (task aperti) vs offerta (volontari) per categoria — carenze di copertura |
| GET | `/stats/funnel` | Imbuto del ciclo di vita: creati → accettati → in corso → completati + tassi |
| GET | `/stats/tasks/by-weekday` | Distribuzione dei task per giorno della settimana |
| GET | `/stats/tasks/by-hour` | Distribuzione dei task per ora del giorno |

## Esempi di risposta

`GET /stats/overview`
```json
{
  "users": 50, "volunteers": 32, "tasksTotal": 300, "tasksCompleted": 155,
  "tasksOpen": 83, "tasksInProgress": 40, "creditsEarned": 2522, "creditsSpent": 660,
  "creditsInCirculation": 1862, "charitiesActive": 4, "redemptions": 17,
  "associations": 3, "reports": 8
}
```

`GET /stats/tasks/by-category`
```json
[
  { "category": "DIGITAL", "total": 74, "completed": 40, "completionRate": 54.1, "avgCredits": 16.9 },
  { "category": "MOBILITY", "total": 52, "completed": 29, "completionRate": 55.8, "avgCredits": 18.0 }
]
```

`GET /stats/impact`
```json
{
  "volunteerHours": 279.3, "beneficiariesHelped": 45, "tasksCompleted": 155,
  "creditsDonated": 660,
  "byCause": [ { "cause": "Sanità", "redemptions": 7, "creditsDonated": 300 } ]
}
```

## Razionale smart-city

Questi dati permettono a enti pubblici e ricercatori di misurare, senza accedere a
informazioni personali:

- **Domanda sociale per zona** (`geo/by-city`, `geo/grid`) — dove serve più supporto.
- **Categorie di bisogno** (`tasks/by-category`, `tasks/by-urgency`) — mobilità,
  supporto fisico, socialità, animali, inclusione digitale.
- **Capitale sociale e time-banking** (`credits`, `credits/timeseries`) — crediti in
  circolazione, valore del volontariato scambiato.
- **Impatto** (`impact`) — ore donate, beneficiari raggiunti, donazioni agli enti.
- **Andamento temporale** (`tasks/timeseries`) — stagionalità e crescita del servizio.

## Portale sviluppatori

Pagina pubblica in-app: `/developers` — catalogo endpoint, istruzioni auth, esempio
`curl` e pannello "prova live" (incolla la tua API key ed esegui una richiesta).
