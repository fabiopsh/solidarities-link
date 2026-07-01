# Modello Dati - Solidarities Link (SOLI)

Questo documento definisce le strutture dati del sistema Solidarities Link.

> **Rev. 2026-07-01 — Allineato all'implementazione reale.** Le sezioni sotto rispecchiano lo schema effettivamente persistito (18 entità `soli_*` su PostgreSQL, ORM Hibernate Panache, `generation=update`). Dove la realtà diverge dal design originale, prevale la realtà (note evidenziate). Riferimento enum reali in fondo.
>
> **Nota storage (divergenza dagli ADR):** contrariamente al `technical_doc.md` (che prevede MongoDB per la chat e Redis per la geolocalizzazione), nell'implementazione attuale **chat e geolocalizzazione sono su PostgreSQL**: `ChatSession`/`ChatMessage` sono tabelle relazionali; la posizione dei volontari è in `VolunteerProfile.latitude/longitude` (Double) e il matching di prossimità usa la formula di Haversine calcolata in memoria (`MatchingService`), senza PostGIS né Redis GeoSearch.

## 1. User (Utente Base)

Rappresenta ogni attore primario del sistema. Autenticazione delegata a Keycloak/OIDC; la riga applicativa è creata al primo accesso da `SoliSecurityAugmentor`/`SecurityService` a partire dai claim del token. Tabella `soli_users`.

- `id`: UUID (Primary Key)
- `keycloakId`: String (Unique, Nullable — **deve coincidere con il claim `sub` del JWT**; `NULL` per utenti solo-anagrafica che non effettuano login, es. beneficiari)
- `email`: String (NOT NULL, Unique)
- `firstName`: String
- `lastName`: String
- `fiscalCode`: String (Unique — Codice Fiscale)
- `role`: Enum `[USER, ADMIN]` (**NOT NULL, default `USER`** — è l'unico ruolo persistito e guida l'autorizzazione backend via `@RolesAllowed`)
- `certificationLevel`: Enum `[LV1_SPID, LV2_TRAINED, LV3_PARTNER]` (Nullable)
- `status`: Enum `[ACTIVE, SUSPENDED]` (NOT NULL, default `ACTIVE` - FR-14)
- `lastKnownLocation`: String (formato `"lat,lon"`, non Point/Geometry - FR-08)
- `notificationsReadAt`: Timestamp (Nullable — ultimo istante di lettura notifiche)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

> **Distinzione Volontario/Richiedente:** NON è un ruolo persistito. Il ruolo di dominio (`USER`) è unico; volontario vs richiedente è una modalità UI lato frontend (toggle in `localStorage`, `RoleContext`). I realm role Keycloak (`volunteer`/`requester`/`admin`) non sono usati dall'autorizzazione backend. L'accesso amministrativo è dato da `role = ADMIN`.

**Relazioni:**

- Ha `0..1` `VolunteerProfile`
- Ha `1` `Wallet` (creato al primo accredito)
- Ha `0..1` `ProfileImage`

## 2. VolunteerProfile (Profilo Volontario)

Estensione dell'utente per definire preferenze, disponibilità e competenze (FR-02). Tabella `soli_volunteer_profiles`.

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key -> `User.id`, Unique, NOT NULL)
- `availabilitySchedule`: String JSONB (Orari di disponibilità per il matching - FR-07, Nullable)
- `serviceCategories`: Array di Enum `[MOBILITY, PHYSICAL_SUPPORT, SOCIAL, PET_SUPPORT, DIGITAL]` (`@ElementCollection`, tabella figlia dedicata)
- `constraints`: String JSONB (Vincoli e limitazioni, es. allergie, fobie - Nullable)
- `maxTaskDistanceMeters`: Integer (Raggio massimo di notifica in metri, default `5000`)
- `targetLocation`: String (Nome amichevole della posizione base, Nullable)
- `latitude`: Double (Posizione base per il matching di prossimità - FR-08)
- `longitude`: Double (Posizione base per il matching di prossimità - FR-08)


## 3. Task (Richiesta di Aiuto)

Entità core che rappresenta il bisogno dell'utente e il ciclo di vita del task nel sistema (FR-04, FR-06, FR-18).

- `id`: UUID (Primary Key)
- `creatorId`: UUID (Foreign Key -> `User.id`, chi ha inserito o confermato la richiesta testuale/vocale - FR-05)
- `beneficiaryId`: UUID (Foreign Key -> `User.id`, chi necessita concretamente l'aiuto)
- `volunteerId`: UUID (Foreign Key -> `User.id`, assegnato quando una notifica viene accettata da un volontario)
- `category`: Enum (Stesse categorie di VolunteerProfile)
- `title`: String
- `description`: Text (Dettagli estratti da AI in caso di assistente vocale)
- `urgencyLevel`: Enum `[LOW, MEDIUM, HIGH, CRITICAL]` (Assegnazione AI o predefinita per task time-sensitive - FR-06)
- `scheduledAt`: Timestamp (Momento richiesto per lo svolgimento, Nullable)
- `hasScheduledTime`: Boolean (default `false` — se lo slot orario è significativo oltre alla data)
- `targetLocation`: String (Nome amichevole del luogo, Nullable)
- `targetAddress`: String (Indirizzo human-readable - FR-08)
- `latitude`: Double (Coordinata reale del task, richiesta per il matching - FR-08)
- `longitude`: Double (Coordinata reale del task, richiesta per il matching - FR-08)
- `status`: Enum `[OPEN, NOTIFIED, ACCEPTED, IN_PROGRESS, COMPLETED, RELEASED, CANCELLED]` (FR-18, FR-19)
- `checkInToken`: String (Token o codice QR per validazione in loco prima fase - FR-12)
- `checkOutToken`: String (Token o codice QR per la chiusura effettiva e validazione - FR-12)
- `checkInAt`: Timestamp (Momento effettivo di inizio intervento; valorizzato al check-in o, nel flusso a doppia conferma, come fallback da `acceptedAt` - FR-11)
- `checkOutAt`: Timestamp (Momento effettivo di fine intervento; valorizzato al check-out o al completamento a doppia conferma - FR-11)
- `rewardCredits`: Integer (default `0` — crediti attribuiti a completamento, calcolati dalla durata; un valore > 0 preimpostato funge da override manuale/admin - FR-11)
- `acceptedAt`: Timestamp (Istante di presa in carico da parte del volontario, Nullable)
- `creatorConfirmed`: Boolean (default `false` — conferma completamento lato richiedente, FR-18)
- `volunteerConfirmed`: Boolean (default `false` — conferma completamento lato volontario, FR-18)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Relazioni:**

- Ha `0..*` `TaskNotification`
- Ha `0..1` `ChatSession` (Aperta all'accettazione)

> **Completamento (2 percorsi):** (a) token — `checkInTask` valorizza `checkInAt`, `checkOutTask` valorizza `checkOutAt`; (b) doppia conferma — quando `creatorConfirmed` e `volunteerConfirmed` sono entrambi true il task passa a `COMPLETED` e i timestamp mancanti sono derivati (`checkInAt`←`acceptedAt`, `checkOutAt`←now). In entrambi i casi l'accredito crediti è sincrono e atomico con il completamento.

## 4. TaskNotification (Notifica di Matching e Rotazione)

Traccia a chi viene inviata la notifica ed evita invii broadcast. Base per le logiche di rotazione equa (FR-09, FR-10).

- `id`: UUID (Primary Key)
- `taskId`: UUID (Foreign Key -> `Task.id`)
- `volunteerId`: UUID (Foreign Key -> `User.id`)
- `status`: Enum `[PENDING, ACCEPTED, IGNORED, REJECTED]`
- `notifiedAt`: Timestamp
- `respondedAt`: Timestamp (Nullable)

## 5. ChatSession & ChatMessage (Comunicazione Controllata)

Sistema di messaggistica interno anonimizzato (nessun numero personale). Viene abilitata con l'accettazione (FR-11). Tabelle `soli_chat_sessions` / `soli_chat_messages` su **PostgreSQL** (non MongoDB). Consegna real-time via WebSocket `/chat/{taskId}`; validazione contenuti via `MockAIService`.

**ChatSession**

- `id`: UUID (Primary Key)
- `taskId`: UUID (Foreign Key -> `Task.id`, Unique)
- `isActive`: Boolean (Forzato a false quando task transita a COMPLETED/CANCELLED)
- `createdAt`: Timestamp

**ChatMessage**

- `id`: UUID (Primary Key)
- `chatSessionId`: UUID (Foreign Key -> `ChatSession.id`)
- `senderId`: UUID (Foreign Key -> `User.id`)
- `content`: Text (Cifrato a db o mascherato, in base a livelli NFR-03 privacy)
- `isFlagged`: Boolean (Popolato dall'LLM-in-the-middle se individua rischi manipolazione o offese)
- `sentAt`: Timestamp

## 6. Wallet & Transaction (Gestione Crediti ed Economia Circolare)

Il deposito e lo storico spesa dei crediti derivati dal volontariato secondo principi Time Banking (FR-13, FR-14).

**Wallet**

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key -> `User.id`, Unique)
- `balance`: Integer (Saldo attivo totale in Crediti SOLI)
- `updatedAt`: Timestamp

**Transaction**

- `id`: UUID (Primary Key)
- `walletId`: UUID (Foreign Key -> `Wallet.id`)
- `amount`: Integer (Positivo per EARNED, Negativo per SPENT)
- `transactionType`: Enum `[EARN_TASK_REWARD, SPEND_DONATION, ADJUSTMENT]`
- `referenceId`: UUID (ID task completato o ID premialità per rintracciabilità)
- `timestamp`: Timestamp

## 7. Reward (Catalogo Premialità e Sponsorizzazioni)

Gestisce i premi non cash che possono essere riscattati o donati a terzi (FR-13).

- `id`: UUID (Primary Key)
- `title`: String
- `description`: Text
- `costInCredits`: Integer (Prezzo in crediti)
- `partnerName`: String (Azienda o Ente sponsorizzante)
- `stockLimit`: Integer (Quantità fisica o digitale di voucher/ticket disponibili)
- `isActive`: Boolean

> **Nota implementativa (2026-07-01):** il marketplace di conversione premi (FR-13) è stato realizzato tramite le entità **Charity** e **Redemption** (sotto). `Reward` resta come catalogo generico ma non è il percorso di riscatto attivo.

## 7-bis. Charity (Ente Benefico erogatore di buoni)

Ente benefico reale a sistema che eroga buoni ("buoni") riscattabili con i Crediti SOLI. È l'entità referenziata dalle transazioni di spesa al momento del riscatto (FR-13). Tabella `soli_charities`.

- `id`: UUID (Primary Key)
- `name`: String (Nome dell'ente, es. "Banco Alimentare")
- `description`: Text (Descrizione dell'ente/causa)
- `cause`: String (Ambito, es. "Alimentare", "Sanità", "Ambiente")
- `voucherLabel`: String (Descrizione del buono erogato, es. "Spesa solidale 10€")
- `costInCredits`: Integer (Crediti necessari per il riscatto)
- `stockRemaining`: Integer (Buoni ancora disponibili; decrementato ad ogni riscatto)
- `isActive`: Boolean
- `createdAt`: Timestamp

**Seeding:** 4 enti reali inseriti al primo avvio via bean `@Startup` (Banco Alimentare, Croce Rossa Italiana, Legambiente, Emergency), idempotente.

## 7-ter. Redemption (Buono riscattato)

Buono emesso all'utente quando riscatta crediti presso una `Charity` (FR-13). Tabella `soli_redemptions`.

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key -> `User.id`, chi ha riscattato)
- `charityId`: UUID (Foreign Key -> `Charity.id`)
- `voucherCode`: String (Codice buono generato, univoco, es. `SOLI-A1B2C3D4`)
- `creditsSpent`: Integer (Crediti spesi per il riscatto)
- `createdAt`: Timestamp

**Atomicità:** creazione della `Redemption`, decremento del saldo wallet, decremento dello `stockRemaining` e registrazione della `Transaction` (`SPEND_DONATION`, `referenceId = Charity.id`) avvengono in un'unica transazione con lock pessimistico sul wallet (no doppia spesa).

## 8. Report (Moderazione Umana e Dispute)

Segnalazioni post-task generate da operatori, richiedenti o volontari in seguito ad accordi violati o problemi (FR-16).

- `id`: UUID (Primary Key)
- `taskId`: UUID (Foreign Key -> `Task.id`, per contesto)
- `reporterId`: UUID (Foreign Key -> `User.id`)
- `reportedUserId`: UUID (Foreign Key -> `User.id`)
- `reason`: Text (Spiegazione anomalie)
- `status`: Enum `[OPEN, INVESTIGATING, RESOLVED, DISMISSED]`
- `createdAt`: Timestamp
- `resolvedAt`: Timestamp (Nullable)

## 9. AuditLog (Tracciamento Eventi Immutabile)

Coda cronologica ed immutabile per sicurezza su dati critici o cambi stato task/crediti (FR-17).

- `id`: UUID (Primary Key)
- `entityType`: Enum `[TASK, WALLET, USER]`
- `entityId`: UUID (Quale id subisce la mutazione)
- `action`: String (Es. "STATUS_CHANGE_TO_COMPLETED", "CREDIT_ADD")
- `oldValue`: JSONB (Stato persistito precedente all'azione per roolback info - Nullable)
- `newValue`: JSONB (Stato applicato/Delta dei campi cambiati)
- `actorId`: UUID (Chi ha provocato l'azione, utente o sistema)
- `timestamp`: Timestamp

## 10. Association & AssociationMembership (Associazioni ed Enti)

Associazioni di volontariato a cui gli utenti possono aderire. Tabelle `soli_associations` / `soli_association_memberships`.

**Association**

- `id`: UUID (Primary Key)
- `name`: String (NOT NULL)
- `description`: Text (Nullable)
- `creatorId`: UUID (Foreign Key -> `User.id`, NOT NULL — creatore, aggiunto come membro ADMIN/APPROVED)
- `accentColor`: String (Colore tema, Nullable)
- `createdAt`, `updatedAt`: Timestamp

**AssociationMembership**

- `id`: UUID (Primary Key)
- `associationId`: UUID (Foreign Key -> `Association.id`, NOT NULL)
- `userId`: UUID (Foreign Key -> `User.id`, NOT NULL)
- `role`: Enum `[ADMIN, MODERATOR, MEMBER]` (NOT NULL, default `MEMBER`)
- `status`: Enum `[PENDING, APPROVED]` (NOT NULL, default `PENDING`)
- `joinedAt`, `updatedAt`: Timestamp

## 11. Charity & Redemption

Vedi sezioni **7-bis** e **7-ter** sopra (enti benefici erogatori di buoni e buoni riscattati).

## 12. Immagini binarie (ProfileImage, AssociationImage)

Blob memorizzati in tabella (`bytea`), relazione 1:1.

**ProfileImage** (`soli_profile_images`): `id` UUID (= id, no auto-gen); `userId` UUID (Unique, NOT NULL); `data` bytea (NOT NULL); `contentType` String (NOT NULL).

**AssociationImage** (`soli_association_images`): `id` UUID; `associationId` UUID (Unique, NOT NULL); `data` bytea (NOT NULL); `contentType` String (NOT NULL).

## 13. CaregiverRelation (Relazione Caregiver–Beneficiario)

Collega un caregiver a un beneficiario per conto del quale può creare/gestire task. Tabella `soli_caregiver_relations`.

- `id`: UUID (Primary Key)
- `caregiverId`: UUID (Foreign Key -> `User.id`, NOT NULL)
- `beneficiaryId`: UUID (Foreign Key -> `User.id`, NOT NULL)
- `relationshipType`: String (es. "figlio", "assistente", Nullable)
- `createdAt`: Timestamp

---

## Riferimento Enum (implementazione reale)

| Enum | Valori |
| --- | --- |
| `UserRole` | USER, ADMIN |
| `UserStatus` | ACTIVE, SUSPENDED |
| `CertificationLevel` | LV1_SPID, LV2_TRAINED, LV3_PARTNER |
| `ServiceCategory` | MOBILITY, PHYSICAL_SUPPORT, SOCIAL, PET_SUPPORT, DIGITAL |
| `UrgencyLevel` | LOW, MEDIUM, HIGH, CRITICAL |
| `TaskStatus` | OPEN, NOTIFIED, ACCEPTED, IN_PROGRESS, COMPLETED, RELEASED, CANCELLED |
| `NotificationStatus` | PENDING, ACCEPTED, IGNORED, REJECTED |
| `TransactionType` | EARN_TASK_REWARD, SPEND_DONATION, ADJUSTMENT |
| `ReportStatus` | OPEN, INVESTIGATING, RESOLVED, DISMISSED |
| `AuditEntityType` | TASK, WALLET, USER |
| `AssociationRole` | ADMIN, MODERATOR, MEMBER |
| `MembershipStatus` | PENDING, APPROVED |

Moltiplicatori crediti (metodi `getCreditMultiplier()`): `UrgencyLevel` LOW 1.0 / MEDIUM 1.25 / HIGH 1.5 / CRITICAL 2.0; `ServiceCategory` SOCIAL 1.0 / DIGITAL 1.1 / PET_SUPPORT 1.1 / MOBILITY 1.2 / PHYSICAL_SUPPORT 1.5.

---

### Appunti Tecnici per Generazione Codice (AI):

- **Foreign Keys**: nessun vincolo FK dichiarato a livello DB (le associazioni sono via UUID applicativi con Hibernate `generation=update`); l'integrità è garantita a livello applicativo. Gli ID di riferimento (`creatorId`, `volunteerId`, `walletId`, `charityId`, …) sono UUID semplici.
- **Audit e Transazioni**: `AuditLog` e `Transaction` sono append-only (FR-17). Evitare update retroattivi.
- **Geospaziale (reale)**: coordinate memorizzate come `Double` (`latitude`/`longitude`) su `Task` e `VolunteerProfile`; il matching di prossimità è calcolato in memoria con Haversine in `MatchingService` (nessun PostGIS/Redis). `User.lastKnownLocation` è una String `"lat,lon"` di sola visualizzazione.
- **LLM in-the-middle**: la validazione dei messaggi chat è delegata a `MockAIService` (placeholder); `ChatMessage.isFlagged` predisposto per il flagging.
