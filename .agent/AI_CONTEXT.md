# SOLI — AI Context & Configuration

> Questo file è il riferimento principale per qualsiasi assistente AI che lavora su questo progetto.
> Ogni modifica a stack, architettura o design system deve essere riflessa qui.

---

## 1. Progetto

| Campo                      | Valore                                          |
| -------------------------- | ----------------------------------------------- |
| **Nome**                   | Solidarities Link (SoLi)                        |
| **Descrizione**            | Ecosistema digitale di mutuo aiuto di quartiere |
| **Tipo**                   | PoC (Proof of Concept) — università magistrale  |
| **Lingua UI**              | Italiano                                        |
| **Lingua codice/commenti** | Inglese                                         |

---

## 2. Stack Tecnologico

### Backend

| Tecnologia                | Versione           | Note                                  |
| ------------------------- | ------------------ | ------------------------------------- |
| **Java**                  | 21 (LTS)           | —                                     |
| **Quarkus**               | 3.31.x             | Framework principale, packaging `jar` |
| **Hibernate ORM Panache** | via Quarkus BOM    | ORM con active record pattern         |
| **PostgreSQL**            | 16                 | Database relazionale                  |
| **Quarkus OIDC**          | via Quarkus BOM    | Integrazione OAuth2/OpenID Connect    |
| **REST Jackson**          | via Quarkus BOM    | Serializzazione JSON                  |
| **Maven**                 | wrapper (`./mvnw`) | Build tool                            |

**Package Java:** `it.soli` (subpackages: `entity`, `resource`, `service`)

**Struttura API REST:**

- Base path: `/api/`
- Formato: JSON
- Autenticazione: Bearer token (JWT da Keycloak)
- Endpoint protetti: `/api/*` → richiede autenticazione
- Endpoint pubblici: `/api/health`, `/q/*`

### Frontend (Web)

| Tecnologia             | Versione | Note                         |
| ---------------------- | -------- | ---------------------------- |
| **React**              | 19.x     | UI library                   |
| **TypeScript**         | 5.9.x    | Tipizzazione statica         |
| **Vite**               | 7.x      | Build tool e dev server      |
| **MUI (Material UI)**  | latest   | Componenti Material Design 3 |
| **react-router-dom**   | latest   | Routing SPA                  |
| **oidc-client-ts**     | latest   | Libreria OIDC core           |
| **react-oidc-context** | latest   | React wrapper per OIDC       |

### Frontend (Mobile)

| Tecnologia               | Versione | Note                                        |
| ------------------------ | -------- | ------------------------------------------- |
| **React Native**         | 0.81.x   | Framework mobile cross-platform             |
| **Expo**                 | 54.x     | Managed workflow, build & dev tools         |
| **TypeScript**           | 5.9.x    | Tipizzazione statica                        |
| **expo-router**          | 6.x      | File-based routing (come Next.js)           |
| **expo-auth-session**    | latest   | OAuth2/OIDC con browser di sistema          |
| **expo-secure-store**    | latest   | Storage sicuro (Keychain/Keystore)          |
| **expo-crypto**          | latest   | PKCE code verifier/challenge                |
| **expo-linear-gradient** | latest   | Gradienti (equivalente CSS linear-gradient) |

### Autenticazione

| Tecnologia                 | Valore                         |
| -------------------------- | ------------------------------ |
| **Keycloak**               | 26.x                           |
| **Protocollo**             | OAuth2 + OpenID Connect        |
| **Flusso**                 | Authorization Code + PKCE      |
| **Realm**                  | `soli`                         |
| **Client frontend web**    | `soli-frontend` (public, PKCE) |
| **Client frontend mobile** | `soli-mobile` (public, PKCE)   |
| **Client backend**         | `soli-backend` (confidential)  |

### Infrastruttura

| Servizio            | Porta esterna | Container               |
| ------------------- | ------------- | ----------------------- |
| PostgreSQL          | 5433          | `soli-postgres`         |
| Keycloak            | 8180          | `soli-keycloak`         |
| Backend Quarkus     | 8080          | `soli-backend`          |
| Frontend web (prod) | 3000          | `soli-frontend` (Nginx) |
| Frontend web (dev)  | 5173          | Vite dev server         |
| Frontend mobile     | 8081          | Expo dev server         |

---

## 3. Design System — Frontend

### 3.1 Colori (palette)

| Ruolo                  | Colore    | Hex       | Uso                                       |
| ---------------------- | --------- | --------- | ----------------------------------------- |
| **Primary**            | Teal 700  | `#00796B` | Azioni principali, sidebar selected, link |
| **Primary Light**      | Teal 400  | `#48A999` | Gradienti, hover leggero                  |
| **Primary Dark**       | Teal 900  | `#004D40` | Hover bottoni, gradienti scuri            |
| **Secondary**          | Amber 900 | `#FF6F00` | Accenti, CTA secondari                    |
| **Secondary Light**    | Amber 600 | `#FFA040` | Gradienti secondari                       |
| **Background default** | Grey 100  | `#F5F5F5` | Sfondo pagine                             |
| **Background paper**   | White     | `#FFFFFF` | Card, drawer, form                        |
| **Error**              | Red 700   | `#D32F2F` | Errori, alert danger                      |
| **Success**            | Green 800 | `#2E7D32` | Conferme, alert success                   |

### 3.2 Gradienti standard

```css
/* Gradiente principale (login bg, bottoni CTA, stat card primaria) */
background: linear-gradient(135deg, #004d40 0%, #00796b 40%, #48a999 100%);

/* Gradiente bottone primario */
background: linear-gradient(135deg, #00796b 0%, #48a999 100%);

/* Gradiente bottone primario :hover */
background: linear-gradient(135deg, #004d40 0%, #00796b 100%);

/* Gradiente secondario (stat card amber) */
background: linear-gradient(135deg, #ff6f00 0%, #ffa040 100%);

/* Gradiente successo (stat card verde) */
background: linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%);
```

### 3.3 Tipografia

| Proprietà          | Valore                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| **Font family**    | `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`                     |
| **Import**         | `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700` |
| **h1–h2**          | `fontWeight: 700`                                                         |
| **h3–h4**          | `fontWeight: 600`                                                         |
| **h5–h6**          | `fontWeight: 500`                                                         |
| **Body**           | `fontWeight: 400`                                                         |
| **Labels/caption** | `fontSize: 0.875rem`, `fontWeight: 500`                                   |

### 3.4 Forme e spaziature

| Proprietà                      | Valore                        |
| ------------------------------ | ----------------------------- |
| **Border radius (globale)**    | `16px`                        |
| **Border radius bottoni**      | `12px`                        |
| **Border radius input**        | `12px`                        |
| **Border radius card**         | `16px`                        |
| **Border radius sidebar item** | `12px`                        |
| **Padding bottoni**            | `10px 24px`                   |
| **Box shadow card**            | `0 2px 8px rgba(0,0,0,0.08)`  |
| **Box shadow card elevata**    | `0 8px 32px rgba(0,0,0,0.18)` |
| **Box shadow sidebar**         | `2px 0 8px rgba(0,0,0,0.05)`  |
| **Box shadow appbar**          | `0 1px 3px rgba(0,0,0,0.08)`  |

### 3.5 Componenti — regole UI

**Bottoni:**

- `textTransform: "none"` (mai maiuscole forzate)
- `fontWeight: 600`
- Primario: gradiente teal, bianco su sfondo
- Secondario/outlined: bordo `primary.main`, testo `primary.main`
- Hover: gradiente più scuro + ombra `0 4px 12px rgba(0,77,64,0.3)`

**Card:**

- Sfondo bianco, border radius 16px
- Ombra leggera di default (`0 2px 8px`)
- Stat card: gradiente a tutta larghezza con testo bianco, icona trasparente (opacity 0.3)

**Sidebar (`DashboardLayout`):**

- Larghezza espansa: `280px`
- Larghezza collassata: `72px`
- Permanente su desktop (`md+`), temporanea su mobile
- Item selezionato: `backgroundColor: rgba(0, 121, 107, 0.08)`, icona `color: primary.main`, testo `fontWeight: 600`
- Logo: icona 🤝 (`HandshakeIcon`) + testo "SoLi" con gradiente
- Transizione apertura/chiusura: `theme.transitions.create('width')`

**AppBar:**

- `color="inherit"` (bianca, non colorata)
- Pulsante profilo a destra con `Avatar` (iniziali utente, sfondo `primary.main`)
- Menu dropdown: Profilo, Impostazioni, Esci

**Input/form:**

- Bordo `1.5px solid #E0E0E0`
- Focus: bordo `#00796B` + ombra `0 0 0 3px rgba(0,121,107,0.12)`
- Sfondo default: `#FAFAFA`, focus: `#FFFFFF`

**Scrollbar personalizzata:**

- Larghezza `6px`
- Thumb: `rgba(0,0,0,0.15)`, hover `rgba(0,0,0,0.25)`

### 3.6 Pagine — struttura

**Login (`/login`):**

- Sfondo a tutto schermo con gradiente teal
- Card centrata (max 440px), border radius 24px
- Logo 🤝 + "SoLi" + tagline "Solidarities Link"
- Due bottoni: "Accedi con Keycloak" (primario), "Registrati" (outlined)
- Frase motivazionale in fondo

**Dashboard (`/dashboard`):**

- Layout a due colonne: sidebar + contenuto
- Benvenuto con nome utente + emoji 👋
- Griglia di stat card (3 colonne su desktop)
- Card placeholder "In costruzione" per sezioni future

**Pagina Keycloak (tema `soli`):**

- Stesso gradiente di sfondo
- Card bianca con stessi border radius e ombra
- Logo "SoLi" riprodotto via CSS `::before`/`::after`
- Bottoni e input con stessi stili del frontend

---

## 4. Flusso di Autenticazione

```
Utente → /login → click "Accedi" → Keycloak (/realms/soli/...)
    → login/registrazione su Keycloak
    → redirect a /callback (con auth code)
    → CallbackPage processa il token
    → redirect a /dashboard (protetto)
```

**Route guards:**

- `ProtectedRoute`: verifica `auth.isAuthenticated`, mostra spinner durante loading, redirect a `/login` se non autenticato
- `CallbackPage`: attende completamento token exchange, poi naviga a `/dashboard`
- `LoginPage`: se già autenticato, redirect a `/dashboard`

---

## 5. Struttura Progetto

```
solidarities-link/
├── docker-compose.yml          # Orchestrazione servizi
├── keycloak/
│   ├── realm-export.json       # Configurazione realm SOLI
│   └── themes/soli/login/      # Tema personalizzato Keycloak
├── soli-backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/it/soli/
│       ├── entity/             # JPA entities (User, UserRole)
│       ├── resource/           # REST endpoints (UserResource)
│       └── service/            # Business logic (futuro)
├── soli-frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   └── src/
│       ├── theme.ts            # MUI theme (FONTE DI VERITÀ per i colori)
│       ├── config/auth.ts      # Config OIDC
│       ├── components/         # Layout, ProtectedRoute, componenti riutilizzabili
│       └── pages/              # LoginPage, DashboardPage, CallbackPage
├── soli-mobile/
│   ├── app.json                # Configurazione Expo (scheme: solimobile)
│   ├── package.json
│   ├── app/
│   │   ├── _layout.tsx         # Root layout (AuthProvider + navigation guard)
│   │   ├── login.tsx           # Login screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx     # Tab navigator layout
│   │       └── home.tsx        # Home screen (placeholder)
│   ├── config/auth.ts          # Config OIDC per mobile
│   ├── context/AuthContext.tsx  # Auth state management
│   └── constants/theme.ts      # Design system SoLi per RN
└── soli-documentation/
    └── original_doc.md         # Documentazione di progetto originale
```

---

## 6. Convenzioni di Codice

### Generali

| Convenzione            | Regola                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| **File naming**        | `PascalCase.tsx` per componenti React, `camelCase.ts` per utility |
| **Component export**   | `export default function NomeComponente()`                        |
| **API base path**      | `/api/` (proxy Vite in dev, Nginx reverse proxy in prod)          |
| **Entità JPA**         | Panache active record (public fields, no getter/setter)           |
| **REST path**          | `@Path("/api/<risorsa>")`                                         |
| **Lingua stringhe UI** | Italiano                                                          |

### Frontend Web

| Convenzione | Regola                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Stili**   | MUI `sx` prop inline, **mai CSS separato per componenti** (solo `index.css` per globali) |

### Frontend Mobile

| Convenzione       | Regola                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| **Stili**         | `StyleSheet.create()` con oggetti inline, mai stylesheet globali separati |
| **Navigazione**   | File-based routing via `expo-router`                                      |
| **Auth tokens**   | `expo-secure-store` (Keychain iOS / Keystore Android), mai AsyncStorage   |
| **Colori/Design** | Importare da `@/constants/theme.ts` (`SoliColors`, `SoliGradients`, etc.) |
| **Gradienti**     | `expo-linear-gradient` (`LinearGradient` component)                       |
| **Path alias**    | `@/` → root del progetto mobile (configurato in `tsconfig.json`)          |

---

## 7. Comandi Utili

```bash
# Sviluppo locale
docker-compose up postgres keycloak       # DB + Auth
cd soli-backend && ./mvnw quarkus:dev     # Backend (porta 8080)
cd soli-frontend && npm run dev           # Frontend web (porta 5173)
cd soli-mobile && npx expo start          # Frontend mobile (porta 8081)

# Produzione (Docker)
docker-compose up --build                 # Tutto insieme

# Reset completo
docker-compose down && docker volume rm solidarities-link_postgres_data
```

---

## 8. Credenziali di Sviluppo

| Servizio               | Username        | Password        |
| ---------------------- | --------------- | --------------- |
| Keycloak Admin Console | `admin`         | `admin`         |
| Utente SOLI di test    | `admin@soli.it` | `admin`         |
| PostgreSQL             | `soli`          | `soli_password` |
