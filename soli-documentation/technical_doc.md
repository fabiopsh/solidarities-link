## Architecture Definition Document (ADD)

---

**Progetto:** Solidarities Link - SOLI

**Versione:** 0.1

**Data:** 17/02/2026

**Autori:** Piscitelli, Lombardi, Polperio, Victorino

---

## 1. Panoramica del Sistema (System Overview)

_Descrizione ad alto livello dello scopo dell'applicazione e del problema che risolve._

- **Obiettivo di Business:** [Descrivere brevemente l'obiettivo principale]
- **Utenti Target:** [Chi utilizzerà l'app Web e Mobile?]

---

## 2. Architettura di Alto Livello (High-Level Architecture)

_Schema concettuale di come i pezzi si incastrano._

- **Pattern Architetturale:** [Es. Microservices, Monolite Modulare, Serverless, Event-Driven]
- **Diagramma di Contesto (C4 Level 1):**
   > [Inserire qui diagramma o link a diagramma che mostra il sistema e gli attori esterni]

---

## 3. Frontend Web

_Specifiche per l'applicazione browser-based._

### 3.1 Stack Tecnologico

| **Componente**        | **Scelta Tecnologica** | **Motivazione** |
| --------------------- | ---------------------- | --------------- |
| **Framework SPA/SSR** | [Da decidere]          | ...             |
| **Linguaggio**        | [Da decidere]          | ...             |
| **State Management**  | [Da decidere]          | ...             |
| **Styling / UI Kit**  | [Da decidere]          | ...             |

### 3.2 Strategie Chiave

- **Rendering:** [Es. Client-side, Server-side, Static generation]
- **Comunicazione API:** [Es. REST client, GraphQL Client, WebSockets]
- **Asset Management:** [Strategia per immagini, font, CDN]

---

## 4. Applicazione Mobile

_Specifiche per l'app nativa o cross-platform._

### 4.1 Stack Tecnologico

| **Componente**             | **Scelta Tecnologica**            | **Motivazione** |
| -------------------------- | --------------------------------- | --------------- |
| **Approccio Sviluppo**     | [Es. Nativo, Cross-platform, PWA] | ...             |
| **Framework**              | [Da decidere]                     | ...             |
| **Store Locale (Offline)** | [Da decidere]                     | ...             |

### 4.2 Strategie Chiave

- **Supporto OS:** [Versioni minime iOS e Android supportate]
- **Gestione Offline:** [Come si comporta l'app senza rete? Sync strategy?]
- **Push Notifications:** [Provider e strategia]
- **Deployment Stores:** [Apple App Store, Google Play Store]

---

## 5. Backend & API Layer

_Il cuore logico del sistema._

### 5.1 Stack Tecnologico

| **Componente**         | **Scelta Tecnologica**    | **Motivazione** |
| ---------------------- | ------------------------- | --------------- |
| **Linguaggio/Runtime** | [Da decidere]             | ...             |
| **Framework Backend**  | [Da decidere]             | ...             |
| **API Style**          | [Es. REST, GraphQL, gRPC] | ...             |

### 5.2 Sicurezza & Auth

- **Authentication:** [Es. JWT, OAuth2, OpenID Connect]
- **Identity Provider:** [Es. Custom, Auth0, Firebase Auth, Cognito]
- **Authorization:** [Es. RBAC - Role Based Access Control]

### 5.3 Integrazioni Esterne (3rd Party)

- [Servizio A - es. Pagamenti]
- [Servizio B - es. Email/SMS]
- [Servizio C - es. Mappe]

---

## 6. Data Layer (Persistenza)

_Dove e come vengono salvati i dati._

### 6.1 Database Principale

- **Tipologia:** [Es. Relazionale, NoSQL, Graph, Time-series]
- **Tecnologia:** [Da decidere]
- **Strategia di Backup:** [Frequenza e retention]

### 6.2 Caching & Performance

- **Tecnologia Cache:** [Es. Redis, Memcached]
- **Strategia:** [Es. Write-through, TTL policies]

### 6.3 File Storage (Blob)

- **Storage Provider:** [Dove salviamo i file caricati dagli utenti?]
- **Gestione Media:** [Compressione, ridimensionamento]

---

## 7. Infrastruttura & DevOps

_Come il sistema viene ospitato e rilasciato._

### 7.1 Hosting & Cloud

- **Cloud Provider:** [Es. AWS, Azure, GCP, On-Premise]
- **Risorse Compute:** [Es. Kubernetes, Virtual Machines, Serverless Functions]

### 7.2 CI/CD (Continuous Integration/Deployment)

- **Pipeline Tool:** [Es. GitHub Actions, GitLab CI, Jenkins]
- **Ambienti:**
   1. Development
   2. Staging
   3. Production

### 7.3 Containerization

- **Container Engine:** [Es. Docker]
- **Orchestration:** [Es. K8s, Docker Swarm, ECS]

---

## 8. Monitoraggio & Observability

_Come sappiamo se il sistema è sano._

- **Logging Centralizzato:** [Strumento e retention policy]
- **Error Tracking:** [Es. Sentry, Crashlytics per mobile]
- **Metrics & Dashboard:** [Es. Prometheus, Grafana, CloudWatch]
- **Alerting:** [Canali di notifica per incidenti]

---

## 9. Decisioni Architetturali (ADR)

_Registro delle decisioni importanti prese durante la definizione._

| **ID**  | **Titolo Decisione**                  | **Status** | **Data** |
| ------- | ------------------------------------- | ---------- | -------- |
| ADR-001 | [Es. Scelta del Database Relazionale] | Accettato  | ...      |
| ADR-002 | [Es. Strategia di Autenticazione]     | Proposto   | ...      |

---

## 10. Considerazioni Future & Debito Tecnico

- [Cosa stiamo rimandando alla fase successiva?]
- [Potenziali colli di bottiglia noti]

---
