# SoLi — Guida Setup Sviluppatore

> Questa guida descrive tutti i passaggi per configurare l'ambiente di sviluppo del progetto **Solidarities Link (SoLi)** da zero.

---

## Prerequisiti

Assicurati di avere installato:

| Software           | Versione minima | Verifica comando         |
| ------------------ | --------------- | ------------------------ |
| **Docker Desktop** | 24.x            | `docker --version`       |
| **Docker Compose** | 2.x             | `docker compose version` |
| **Java JDK**       | 21 (LTS)        | `java --version`         |
| **Node.js**        | 20.x LTS        | `node --version`         |
| **npm**            | 10.x            | `npm --version`          |
| **Git**            | 2.x             | `git --version`          |

> **Opzionale per lo sviluppo mobile:**
>
> | Software           | Note                                                  |
> | ------------------ | ----------------------------------------------------- |
> | **Xcode**          | Per il simulatore iOS (solo macOS)                    |
> | **Android Studio** | Per l'emulatore Android + SDK                         |
> | **Expo Go**        | App da installare su dispositivo fisico (iOS/Android) |

---

## 1. Clonare il Repository

```bash
git clone https://github.com/fabiopsh/solidarities-link.git
cd solidarities-link
```

---

## 2. Avviare l'Infrastruttura (PostgreSQL + Keycloak)

```bash
docker-compose up postgres keycloak
```

Questo comando avvia:

- **PostgreSQL 16** sulla porta `5433` (container `soli-postgres`)
- **Keycloak 26** sulla porta `8180` (container `soli-keycloak`)

> ⏳ Keycloak impiega ~30 secondi ad avviarsi. Attendi il messaggio `Keycloak started in development mode` nei log.

Al primo avvio, Keycloak importa automaticamente il file `keycloak/realm-export.json` che configura:

- Realm **soli**
- Client **soli-frontend** (web, pubblico, PKCE)
- Client **soli-mobile** (mobile, pubblico, PKCE)
- Client **soli-backend** (confidenziale)
- Ruoli: `volunteer`, `requester`, `caregiver`, `admin`
- Utente di test: `admin@soli.it` / `admin`

### Verifica

- Admin Console Keycloak: [http://localhost:8180](http://localhost:8180) → `admin` / `admin`
- Il realm **soli** deve apparire nella lista (dropdown in alto a sinistra)

---

## 3. Avviare il Backend (Quarkus)

```bash
cd soli-backend
./mvnw quarkus:dev
```

Il backend si avvia sulla porta **8080** in modalità dev (hot-reload automatico).

### Verifica

- Health check: [http://localhost:8080/q/health](http://localhost:8080/q/health) → deve restituire `UP`
- Dev UI Quarkus: [http://localhost:8080/q/dev](http://localhost:8080/q/dev)

> **Nota:** alla prima esecuzione, Maven scaricherà tutte le dipendenze (~2-5 minuti).

---

## 4. Avviare il Frontend Web (React + Vite)

```bash
cd soli-frontend
npm install
npm run dev
```

Il frontend si avvia sulla porta **5173** con Vite dev server (HMR abilitato).

### Verifica

- Apri [http://localhost:5173](http://localhost:5173) nel browser
- Dovresti vedere la pagina di login SoLi con gradiente teal
- Click "Accedi con Keycloak" → login con `admin@soli.it` / `admin` → redirect alla dashboard

---

## 5. Avviare il Frontend Mobile (React Native + Expo)

```bash
cd soli-mobile
npm install
npx expo start
```

Questo avvia il dev server Expo sulla porta **8081**.

### Eseguire su simulatore/dispositivo

| Piattaforma | Comando nel terminale Expo | Prerequisito     |
| ----------- | -------------------------- | ---------------- |
| iOS         | Premi `i`                  | Xcode installato |
| Android     | Premi `a`                  | Emulatore attivo |
| Web         | Premi `w`                  | —                |

### ⚠️ Configurazione Keycloak per Mobile (primo avvio)

Il client `soli-mobile` viene importato automaticamente al primo avvio di Keycloak. Se Keycloak era già stato avviato in precedenza (il realm esiste già), devi aggiungere il client **manualmente**:

1. Accedi alla **Admin Console** → [http://localhost:8180](http://localhost:8180)
2. Seleziona il realm **soli**
3. **Clients** → **Create client**
4. **Client ID**: `soli-mobile`, **Client type**: `OpenID Connect` → **Next**
5. **Client authentication**: OFF, **Standard flow**: ON → **Next**
6. **Valid redirect URIs**: aggiungi tutte queste:
   ```
   solimobile://callback
   exp://127.0.0.1:8081/*
   exp://localhost:8081/*
   exp://<IL_TUO_IP_LAN>:8081/*
   ```
   > Trova il tuo IP LAN dal log di Expo: `🔑 SOLI Mobile Redirect URI: exp://<IP>:8081/--/callback`
7. **Save**
8. Tab **Advanced** → **Proof Key for Code Exchange Code Challenge Method**: `S256` → **Save**

### Verifica

- Dovresti vedere la schermata di login SoLi (gradiente teal, logo 🤝)
- Tap "Accedi con Keycloak" → si apre il browser → login → redirect all'app su homepage

---

## Riepilogo Porte

| Servizio        | Porta | URL                                                      |
| --------------- | ----- | -------------------------------------------------------- |
| PostgreSQL      | 5433  | `postgresql://soli:soli_password@localhost:5433/soli_db` |
| Keycloak        | 8180  | http://localhost:8180                                    |
| Backend Quarkus | 8080  | http://localhost:8080                                    |
| Frontend Web    | 5173  | http://localhost:5173                                    |
| Frontend Mobile | 8081  | Expo dev server                                          |

---

## Credenziali di Sviluppo

| Servizio               | Username        | Password        |
| ---------------------- | --------------- | --------------- |
| Keycloak Admin Console | `admin`         | `admin`         |
| Utente SOLI di test    | `admin@soli.it` | `admin`         |
| PostgreSQL             | `soli`          | `soli_password` |

---

## Struttura del Progetto

```
solidarities-link/
├── docker-compose.yml           # Orchestrazione PostgreSQL + Keycloak
├── keycloak/
│   ├── realm-export.json        # Configurazione realm (auto-import)
│   └── themes/soli/login/       # Tema personalizzato login Keycloak
├── soli-backend/                # API REST — Java 21, Quarkus 3.31
│   ├── pom.xml
│   └── src/main/java/it/soli/
├── soli-frontend/               # Web — React 19, Vite 7, MUI
│   ├── package.json
│   └── src/
├── soli-mobile/                 # Mobile — React Native 0.81, Expo 54
│   ├── package.json
│   ├── app.json
│   └── app/                     # File-based routing (expo-router)
└── soli-documentation/          # Documentazione di progetto
```

---

## Comandi di Riferimento Rapido

```bash
# Avvia infrastruttura
docker-compose up postgres keycloak

# Avvia backend (in un terminale separato)
cd soli-backend && ./mvnw quarkus:dev

# Avvia frontend web (in un terminale separato)
cd soli-frontend && npm run dev

# Avvia frontend mobile (in un terminale separato)
cd soli-mobile && npx expo start

# Ferma tutto
docker-compose down

# Reset completo (cancella anche il database)
docker-compose down && docker volume rm solidarities-link_postgres_data
```

---

## Troubleshooting

### Keycloak non si avvia

Attendi che PostgreSQL sia completamente pronto (healthcheck). Se persiste, controlla i log con:

```bash
docker logs soli-keycloak
```

### "Client not found" su Keycloak (dalla mobile app)

Il client `soli-mobile` non è stato importato. Segui la sezione "Configurazione Keycloak per Mobile" al punto 5.

### "Invalid parameter: redirect_uri" durante il login mobile

La redirect URI dell'app non corrisponde a quelle configurate su Keycloak. Controlla il log di Expo per la URI effettiva e aggiungila nelle **Valid redirect URIs** del client `soli-mobile`.

### Backend non si connette al database

Verifica che PostgreSQL sia attivo sulla porta 5433:

```bash
docker ps | grep soli-postgres
```

### Maven scarica dipendenze lentamente

È normale alla prima esecuzione. Le dipendenze vengono cachate in `~/.m2/repository` per le esecuzioni successive.
