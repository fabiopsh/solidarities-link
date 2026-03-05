# Modello Dati - Solidarities Link (SOLI)

Questo documento definisce le strutture dati principali (Entities) necessarie per soddisfare i Requisiti Funzionali (FR) e le User Stories (US) del sistema Solidarities Link. È strutturato in modo da essere facilmente interpretabile da un'IA per la successiva generazione di codice (es. modelli JPA/Hibernate, DTOs, Prisma schema, SQL DDL).

## 1. User (Utente Base)

Rappresenta ogni attore primario del sistema. Gestisce l'autenticazione tramite SPID (FR-01) e le informazioni anagrafiche.

- `id`: UUID (Primary Key)
- `role`: Enum `[REQUESTER, VOLUNTEER, CAREGIVER, ADMIN]` (Determina l'accesso)
- `fiscalCode`: String (Codice Fiscale univoco, derivato da autenticazione SPID)
- `firstName`: String
- `lastName`: String
- `dateOfBirth`: Date
- `certificationLevel`: Enum `[LV1_SPID, LV2_TRAINED, LV3_PARTNER]` (Livello di certificazione volontario)
- `status`: Enum `[ACTIVE, SUSPENDED]` (Modificabile in base a report/dispute valutate - FR-16)
- `lastKnownLocation`: Point/Geometry (Ultima posizione per matching/notifiche di prossimità - FR-08)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Relazioni:**

- Ha `0..1` `VolunteerProfile` (se `role == VOLUNTEER`)
- Ha `0..*` `CaregiverRelation` (come caregiver o beneficiario)
- Ha `1` `Wallet`

## 2. VolunteerProfile (Profilo Volontario)

Estensione dell'utente per definire preferenze, disponibilità e competenze (FR-02).

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key -> `User.id`, Unique)
- `availabilitySchedule`: JSONB (Orari di disponibilità per il matching - FR-07)
- `serviceCategories`: Array di Enum `[MOBILITY, PHYSICAL_SUPPORT, SOCIAL, PET_SUPPORT, DIGITAL]` (Ambiti di intervento scelti)
- `constraints`: JSONB / Array di String (Vincoli e limitazioni, es. allergie, fobie)
- `maxTaskDistanceMeters`: Integer (Raggio massimo di notifica in metri da location attuale)

## 3. CaregiverRelation (Relazione Caregiver - Assistito)

Gestisce il legame tra un tutore e uno o più soggetti fragili a cui amministra i task (FR-03).

- `id`: UUID (Primary Key)
- `caregiverId`: UUID (Foreign Key -> `User.id`)
- `beneficiaryId`: UUID (Foreign Key -> `User.id`)
- `relationshipType`: String (Es. "Genitore", "Paziente")
- `createdAt`: Timestamp

## 4. Task (Richiesta di Aiuto)

Entità core che rappresenta il bisogno dell'utente e il ciclo di vita del task nel sistema (FR-04, FR-06, FR-18).

- `id`: UUID (Primary Key)
- `creatorId`: UUID (Foreign Key -> `User.id`, chi ha inserito o confermato la richiesta testuale/vocale - FR-05)
- `beneficiaryId`: UUID (Foreign Key -> `User.id`, chi necessita concretamente l'aiuto)
- `volunteerId`: UUID (Foreign Key -> `User.id`, assegnato quando una notifica viene accettata da un volontario)
- `category`: Enum (Stesse categorie di VolunteerProfile)
- `title`: String
- `description`: Text (Dettagli estratti da AI in caso di assistente vocale)
- `urgencyLevel`: Enum `[LOW, MEDIUM, HIGH, CRITICAL]` (Assegnazione AI o predefinita per task time-sensitive - FR-06)
- `scheduledAt`: Timestamp (Momento effettivo richiesto per lo svolgimento)
- `targetLocation`: Point/Geometry (Indirizzo esatto di partenza o svolgimento task - FR-08)
- `targetAddress`: String (Versione human-readable della target location)
- `status`: Enum `[OPEN, NOTIFIED, ACCEPTED, IN_PROGRESS, COMPLETED, RELEASED, CANCELLED]` (FR-18, FR-19)
- `checkInToken`: String (Token o codice QR per validazione in loco prima fase - FR-12)
- `checkOutToken`: String (Token o codice QR per la chiusura effettiva e validazione - FR-12)
- `rewardCredits`: Integer (Numero di crediti precalcolati/attribuiti a completamento - FR-13)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Relazioni:**

- Ha `0..*` `TaskNotification`
- Ha `0..1` `ChatSession` (Aperta solo ad accettazione completata)

## 5. TaskNotification (Notifica di Matching e Rotazione)

Traccia a chi viene inviata la notifica ed evita invii broadcast. Base per le logiche di rotazione equa (FR-09, FR-10).

- `id`: UUID (Primary Key)
- `taskId`: UUID (Foreign Key -> `Task.id`)
- `volunteerId`: UUID (Foreign Key -> `User.id`)
- `status`: Enum `[PENDING, ACCEPTED, IGNORED, REJECTED]`
- `notifiedAt`: Timestamp
- `respondedAt`: Timestamp (Nullable)

## 6. ChatSession & ChatMessage (Comunicazione Controllata)

Sistema di messaggistica interno anonimizzato (nessun numero personale). Viene abilitata con l'accettazione (FR-11).

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

## 7. Wallet & Transaction (Gestione Crediti ed Economia Circolare)

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

## 8. Reward (Catalogo Premialità e Sponsorizzazioni)

Gestisce i premi non cash che possono essere riscattati o donati a terzi (FR-15).

- `id`: UUID (Primary Key)
- `title`: String
- `description`: Text
- `costInCredits`: Integer (Prezzo in crediti)
- `partnerName`: String (Azienda o Ente sponsorizzante)
- `stockLimit`: Integer (Quantità fisica o digitale di voucher/ticket disponibili)
- `isActive`: Boolean

## 9. Report (Moderazione Umana e Dispute)

Segnalazioni post-task generate da operatori, richiedenti o volontari in seguito ad accordi violati o problemi (FR-16).

- `id`: UUID (Primary Key)
- `taskId`: UUID (Foreign Key -> `Task.id`, per contesto)
- `reporterId`: UUID (Foreign Key -> `User.id`)
- `reportedUserId`: UUID (Foreign Key -> `User.id`)
- `reason`: Text (Spiegazione anomalie)
- `status`: Enum `[OPEN, INVESTIGATING, RESOLVED, DISMISSED]`
- `createdAt`: Timestamp
- `resolvedAt`: Timestamp (Nullable)

## 10. AuditLog (Tracciamento Eventi Immutabile)

Coda cronologica ed immutabile per sicurezza su dati critici o cambi stato task/crediti (FR-17).

- `id`: UUID (Primary Key)
- `entityType`: Enum `[TASK, WALLET, USER]`
- `entityId`: UUID (Quale id subisce la mutazione)
- `action`: String (Es. "STATUS_CHANGE_TO_COMPLETED", "CREDIT_ADD")
- `oldValue`: JSONB (Stato persistito precedente all'azione per roolback info - Nullable)
- `newValue`: JSONB (Stato applicato/Delta dei campi cambiati)
- `actorId`: UUID (Chi ha provocato l'azione, utente o sistema)
- `timestamp`: Timestamp

---

### Appunti Tecnici per Generazione Codice (AI):

- **Foreign Keys**: Qualora la persistenza sia RDBMS (es PostgreSQL) implementare vincoli sicuri (ON DELETE RESTRICT per Wallet/Auth, ON DELETE CASCADE ove consono se utente viene rimosso dal sistema totalmente nel GDPR scope).
- **Audit e Transazioni**: `AuditLog` e `Transaction` sono in modalità Append-Only ad alta incidenza. Evitare update logici passati per non invalidare compliance FR-17.
- **Geospaziale**: Se si usa Postgres estendere con PostGIS e indicizzare `lastKnownLocation` per queries di prossimità ST_DWithin nel radius di matching.
- **LLM in-the-middle**: Flagging operato a valle (batch o asincrono); predisporre hook (events / webhooks) su insert per `ChatMessage`.
