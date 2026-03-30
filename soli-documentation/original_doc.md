#

# **Solidarities Link (SoLi)**

Fabio Piscitelli, Federico Lombardi, Francesco Polperio, Andrei Mickel Victorino  
![][image1]

### **Introduzione**

Il progetto **SOLI** nasce dalla necessità di rispondere alle sfide della **transizione sociale**, con l’obiettivo di rafforzare e aumentare l’efficienza delle associazioni di volontariato preesistenti, fornendo un servizio puntuale che permetta di diminuire il divario tra chi aiuta e chi ha bisogno.

L'idea fondante è la creazione di un **ecosistema digitale di "mutuo aiuto di quartiere"** che sfrutti la tecnologia per ricostruire il tessuto sociale urbano e favorire il volontariato, ponendo il cittadino non più come un atomo isolato, ma parte di una **rete sociale** partecipata, dove la tecnologia abbatte le barriere della diffidenza e facilita l'incontro tra generazioni e culture diverse, **riducendo il divario sociale e tecnologico**.

Essendo un’iniziativa senza scopo di lucro, Solidarities Link garantisce la propria continuità attraverso un modello di economia civile. La sostenibilità economica è assicurata da una piattaforma integrata di crowdfunding, dove i cittadini possono sostenere i costi vivi del servizio tramite donazioni trasparenti. Questo approccio non solo copre i costi di manutenzione dei server e dello sviluppo software, ma rinforza il senso di appartenenza alla comunità, rendendo ogni utente un investitore attivo nel capitale sociale del proprio quartiere.

Il progetto ha finalità esplorative e prototipali e non intende affrontare in questa sede gli aspetti normativi, organizzativi o di governance di un’implementazione reale.

**Obiettivi Principali**  
Il progetto supera la rigidità delle strutture fisiche, consentendo che il desiderio di aiutare incontri il bisogno in **tempo reale**. Una **notifica sul telefono** sostituisce lo sportello dell'ufficio, garantendo che nessuna richiesta di supporto resti inascoltata e restituendo al volontariato la sua dimensione più pura di **relazione umana diretta e tempestiva**.

Il sistema si propone come un intermediario fiduciario tra due attori principali: il **Richiedente** (soggetti fragili, anziani, persone con disabilità o cittadini con necessità temporanee) e il **Volontario Civico Certificato** (cittadini attivi disposti a offrire il proprio tempo).

L'utente fragile, inserisce una **richiesta di aiuto specifica** (es: "Supporto per la spesa pesante", "Accompagnamento a visita medica", "Supporto configurazione smartphone"). Il sistema **classifica la richiesta in base all'urgenza** e alla tipologia di **competenza necessaria**.

In base ad un **algoritmo di matching**, il sistema notifica la richiesta ai Volontari Civici che **si trovano nelle vicinanze** (favorendo la possibile riduzione degli spostamenti e l'impatto ambientale), e i quali possiedono le **certificazioni o i feedback adeguati** per quella specifica tipologia di task. Una volta accettato il task, il volontario svolge l'attività. Oltre a ciò, il sistema monitora lo stato di avanzamento (meccanismo di check-in e check-out) per **garantire il corretto svolgimento**.

Il sistema integra vincoli operativi specifici per garantire l'equità, tra cui la **rotazione automatica dei volontari**, volta a distribuire uniformemente le richieste ed evitare il sovraccarico dei singoli nodi della rete. Per quanto concerne l'impegno temporale, non sono previsti limiti massimi di ore: ogni utente può dedicare al servizio il tempo che ritiene opportuno, favorendo la massima flessibilità e partecipazione.

Sebbene esista un meccanismo di ricompensa (tramite crediti) basato sul concetto di _time banking_, il sistema impedisce l'insorgere di dinamiche legate al lavoro sommerso. La struttura delle **premialità**, infatti, è concepita per escludere qualsiasi forma di arricchimento personale: i benefici ottenuti possono essere esclusivamente donati a terzi, consolidando così la vocazione altruistica della piattaforma

Il progetto adotta un **modello ibrido di Time Banking e Gamification**, orientato alla valorizzazione del capitale umano e del tessuto sociale urbano.

Al completamento del servizio, il sistema non genera un pagamento in denaro, ma elargisce **"Crediti SOLI"** (es: punti esperienza). Tali crediti **possono essere convertiti in premialità concrete** (buoni spesa, accessi culturali, sconti sui trasporti) offerti da una **rete di sponsor locali** (partner commerciali preposti alla sostenibilità).
Le premialità ottenute tramite la conversione dei Crediti SOLI **non possono in alcun caso essere utilizzate a beneficio personale diretto del volontario**.
Ogni benefit (buoni spesa, accessi culturali, agevolazioni) è destinato **esclusivamente alla donazione verso soggetti o nuclei in condizione di maggiore fragilità**, individuati tramite il sistema o in collaborazione con enti territoriali e associazioni partner.
Questo principio garantisce che il sistema di reward rafforzi la solidarietà orizzontale e prevenga qualsiasi deriva assimilabile a remunerazione o lavoro sommerso.

### **Descrizione Accurata del Sistema**

**1\. Il Core del Sistema** \- il cuore di SolidaritiesLink è basato su un algoritmo di matching, progettato per ottimizzare l'incontro tra domanda e offerta di aiuto, garantendo efficienza ed equità. La selezione dei volontari non è casuale, ma basata su quattro parametri fondamentali:

- Prossimità Geografica: il sistema privilegia i volontari più vicini al luogo dell'intervento per ridurre gli spostamenti e l'impatto ambientale (una bacheca digitale geolocalizzata);
- Compatibilità del Servizio: verifica che le competenze del volontario corrispondano alla macro-categoria richiesta (Vedi _Profilazione e Gestione dei Volontari_);
- Rotazione Equa: distribuzione delle task tra più persone per evitare che le richieste ricadano sempre sugli stessi utenti (principio di rotazione).
- Disponibilità oraria: il sistema può contattare un volontario se l'orario del task rientra nelle disponibilità orarie segnalate.

**2\. Profilazione e Gestione dei Volontari** \- Per garantire sicurezza e qualità del servizio, ogni Volontario deve superare una fase di certificazione dell'identità. Durante la creazione del profilo, il volontario definisce le proprie preferenze operative impostando:

- Identity Check: possibile utilizzo di servizi pubblici come SPID o CIEid, con previo accordo con l’AGID o Ministero dell’Interno (accesso simulato);
- Ambiti di intervento: scelta delle categorie di servizio preferite;
- Vincoli e Limitazioni: segnalazione di impedimenti specifici (es. "allergia ai cani" per escludere automaticamente richieste di dog walking, o limitazioni fisiche per evitare carichi pesanti). Questo filtro preventivo assicura che le notifiche ricevute siano sempre pertinenti e gestibili.

**3\. Catalogo dei Servizi Offerti** \- Il sistema copre diverse aree di necessità quotidiana, promuovendo l'inclusione a 360 gradi:

- Accompagnamento e Mobilità: supporto per passeggiate al parco o accompagnamento verso punti di interesse (come ospedali per visite mediche);
- Supporto Fisico Occasionale: piccoli aiuti domestici che richiedono sforzo fisico (es. spostare un mobile, conferire rifiuti ingombranti);
- Socialità e Compagnia: momenti di condivisione per contrastare la solitudine;
- Pet Support: servizi di dog walking per chi è momentaneamente impossibilitato;
- Inclusione Digitale: assistenza nell'uso di dispositivi tecnologici (smartphone, tablet), evitando task che possano rivelare dati privati.

**4\. Flusso Operativo** \- Il funzionamento del servizio segue quattro fasi distinte, supportate da un'interfaccia utente pulita e accessibile:

- Richiesta: l'utente richiedente seleziona una macro-categoria di servizio tramite un percorso guidato semplificato;
- Elaborazione e Notifica: l'algoritmo analizza la richiesta e invia una notifica push esclusivamente ai volontari idonei selezionati dall’algoritmo;
- Accettazione: il volontario può accettare o ignorare la notifica. È fondamentale notare che il rifiuto o la mancata risposta non penalizzano la reputazione dell'utente, preservando la natura libera e non vincolante del volontariato;
- Esecuzione e Validazione: all'incontro, le parti confermano l'**avvio del servizio** tramite un meccanismo di sicurezza (es. scansione QR Code o scambio token digitale). Al termine, una procedura analoga conferma la **fine del servizio**, garantendo la certezza dell'avvenuta prestazione;
- Chat Interna: vi è la possibilità di usufruire di una chat interna che permette alle due entità di comunicare, in caso di necessità (questioni organizzative, ecc…), sfruttando il meccanismo LLM-in-the-middle, in modo che la conversazione passi attraverso un LLM-judge che verifica la correttezza dei contenuti della chat. Evitando casistiche in cui un soggetto fragile può essere soggetto a circonvenzione. Il sistema LLM non assume decisioni sanzionatorie definitive, ma supporta esclusivamente funzioni di prevenzione, moderazione e segnalazione.

**5\. Sistema di Reward e Gamification** \- Per incentivare la partecipazione attiva senza mercificare l'aiuto, SOLI adotta un sistema di ricompensa basato su punti:

- Assegnazione: i punti vengono accumulati in base alle ore di servizio prestate.
- Conversione: i crediti accumulati nel wallet digitale possono essere convertiti in premialità vincolate alla donazione o servizi presso partner convenzionati.
- Donazione: Gli utenti contribuiscono alla raccolta delle premialità con l’obiettivo finale della donazione.

### **Possibile Implementazione LLM**

**Interfaccia Conversazionale e Assistente Digitale (LLM Integration)**: il sistema integra un assistente virtuale basato su LLM:

- "Soli Assistant" (Supporto Utente): in caso di problemi o dubbi (es. "Non riesco a trovare il tasto per confermare" o "Come riscatto i punti?"), l'utente può chiedere aiuto in linguaggio naturale. L'assistente guida l'utente passo-passo nell'interfaccia o esegue l'azione per suo conto;
- Modalità "No-UI" per Anziani: l'utente può semplicemente rivolgersi a Soli Assistant "Ho bisogno di qualcuno per la spesa domani". La LLM estrae le entità (es. Tipo: Spesa, Tempo: Domani) e pre-compila la richiesta formale, che l'utente deve solo confermare con un click;
- Moderazione Automatica: il LLM analizza in tempo reale le descrizioni dei task e le chat interne per bloccare contenuti inappropriati, offensivi o tentativi di truffa prima che raggiungano il volontario.
- LLM-in-the-middle: LLM che giudica e permette la comunicazione tra due entità, verificando che il contenuto rispetti la finalità del task.

Nota: Preferibilmente si vuole utilizzare API già esistenti che non siano pesanti ed inefficienti sul ciclo operazionale del sistema (per esempio LLM Open-Weight open-source oppure come Llama).  
**![][image2]**

### **Stato dell’Arte**

_Al meglio delle nostre conoscenze_, il nostro gruppo ha identificato i seguenti riferimenti per la definizione dello stato dell’arte nell'obiettivo di identificare le funzionalità utili e comuni all’implementazione del progetto:

- **_Attivati_**: [https://attivati.volontariatotrentino.it/](https://attivati.volontariatotrentino.it/)
   - Business Model: Piattaforma istituzionale di matching tra enti del terzo settore e volontari. Il valore è generato come servizio pubblico (finanziamenti pubblici, fondazioni, CSV).
   - Differenza con noi: Noi operiamo a livello micro-territoriale (quartiere), loro a livello organizzativo/istituzionale. Attivati abilita il volontariato strutturato, mentre noi abilitiamo il mutuo aiuto quotidiano e informale, ma certificato.

- **_Happy Angel_**: [https://www.happyangel.it/](https://www.happyangel.it/)
   - Business Model: Marketplace solidale a transazione monetaria. L’utente effettua una donazione o acquisto solidale, dove una parte va al beneficiario.
   - Differenza con noi: Happy Angel è donation-driven, noi siamo service-driven. Noi non monetizziamo il bisogno, ma lo trasformiamo in micro-azioni concrete. Il nostro capitale è il tempo, la competenza e la prossimità, non il denaro.

- **_Doniamoci_**: [https://www.fundraisingdinner.it/](https://www.fundraisingdinner.it/)
   - Business Model: Piattaforma di fundraising esperienziale. Raccolta fondi tramite: cene solidali, eventi e campagne one-shot.
   - Differenza con noi: Doniamoci è event-based, noi siamo always-on. Il loro output è raccolta fondi, il nostro è presa in carico del bisogno.

- **_Nextdoor (Il Social di Quartiere)_**: [https://it.nextdoor.com/](https://it.nextdoor.com/)
   - Business Model: Connette i vicini di casa per scambiare informazioni, vendere oggetti o segnalare problemi di sicurezza.
   - Differenza con noi: Nextdoor è basato sulla comunicazione (post/bacheca), non ha un sistema strutturato di "Task".

- **_Be My Eyes (Volontariato On-Demand)_**: [https://www.bemyeyes.com/it/](https://www.bemyeyes.com/it/)
   - Business Model: Connette persone non vedenti con volontari vedenti tramite videochiamata per aiuto immediato (es. leggere una scadenza).
   - Differenza con noi: È un ottimo modello di riferimento per la gestione della richiesta "real-time". Tuttavia, è limitato all'aiuto visivo remoto. Il nostro progetto prevede l'intervento fisico e copre molte più aree (spesa, accompagnamento, tecnologia).

- **_TimeRepublik (Banca del Tempo Digitale)_**: [https://timerepublik.com/](https://timerepublik.com/)
   - Business Model: Gli utenti scambiano ore di servizi (io ti insegno inglese, tu mi ripari il rubinetto).
   - Differenza con noi: È globale e generico. Il nostro progetto è focalizzato sulla Smart City (locale), sulla coesione territoriale e l'inclusione di soggetti fragili (non solo scambio alla pari, ma aiuto verso chi ha bisogno).

- **_TaskRabbit (Gig Economy)_**: [https://www.taskrabbit.it/](https://www.taskrabbit.it/)
   - Business Model: Paghi qualcuno per montare mobili o fare la spesa.
   - Differenza con noi: TaskRabbit è a pagamento (soldi). Il nostro è basato sul volontariato e premi sociali (buoni spesa/cultura), evitando la mercificazione diretta e promuovendo l'inclusione sociale.

- **UGO (HelloUGO):** [https://hellougo.com/](https://hellougo.com/)
   - Business Model**:** Servizio di accompagnamento e affiancamento per anziani e persone fragili (visite mediche, terapie). Gli operatori sono selezionati e formati, il servizio è spesso pagato dalle famiglie o convenzionato con aziende (Welfare aziendale) e assicurazioni.
   - Differenza con noi**:** UGO è un servizio **professionale/semi-professionale B2B2C**. Gli operatori sono "Caregiver on demand" retribuiti.

- **Lulu dans ma rue (Parigi):** [https://www.luludansmarue.org/](https://www.luludansmarue.org/)
   - Business Model**:** Un "portierato di quartiere" ibrido (chioschi fisici \+ app) nato a Parigi. Mette in contatto chi ha bisogno di piccoli lavoretti (bricolage, pulizie, compagnia) con i "Lulus" (persone del quartiere in cerca di attività). Ha un forte impatto sull'inclusione lavorativa.
   - Differenza con noi: Lulu è focalizzato sul **reinserimento lavorativo** e sulla "Gig Economy sociale" (i Lulus vengono pagati).

- **GoodGym (Regno Unito):** [https://www.goodgym.org/](https://www.goodgym.org/)
   - Business Model: Una community di runner che combina l'esercizio fisico con il volontariato. I membri corrono per raggiungere case di anziani isolati ("Coach runs") o per svolgere lavori manuali per la comunità.
   - Differenza con noi: GoodGym è verticale sul **fitness**.

### **Dati Sintetici**

[Popolazione residente Milano](https://drive.google.com/drive/folders/1csibvKhMBq08XBAMzP555gCgl_n50wlj?hl=it) : età e residenti.  
[https://dati.toscana.it/dataset/rt-oraritb](https://dati.toscana.it/dataset/rt-oraritb) : open data bus e trasporto pubblico in caso di accompagnamento su servizio pubblico.  
[https://www.dati.gov.it/view-dataset/dataset?id=7e5b0502-c4de-4d9f-a418-28c94b7389fd](https://www.dati.gov.it/view-dataset/dataset?id=7e5b0502-c4de-4d9f-a418-28c94b7389fd) : open data sugli Indici di fragilità \- dal 2021  
[https://www.dati.gov.it/view-dataset/dataset?id=ca0e5ea5-a53f-4486-9417-ed43e47adc04](https://www.dati.gov.it/view-dataset/dataset?id=ca0e5ea5-a53f-4486-9417-ed43e47adc04) : La tavola riporta informazioni relative alle strutture per animali d'affezione \- Unione dei Comuni di Vallo Salvio

# Analisi Requisiti

## Glossario

- **Richiedente**: utente dell’applicazione che pubblica una richiesta di assistenza personale;
- **Volontario Civico Certificato**: utente dell’applicazione che accetta una richiesta ottenuta per notifica, che può accettare o rifiutare.
- **Task**: unità di lavoro atomica gestito del sistema. Ha uno stato interno: aperto (in attesa di essere accettato) / chiuso (richiesta accettata);
- **Algoritmo di matching**: algoritmo che permette di incrociare domanda e offerta basandosi su diversi parametri (disponibilità oraria, competenza, prossimità, rotazione equa);
- **Certificazioni**: attestazioni di qualità. Un utente registrato al sistema si suddivide nei seguenti livelli: i) LV1 \= registrazione iniziale SPID, ii) LV2 \= Volontario certificato (training badge, certificazioni online), iii) LV3 = partnership con associazione di volontariato ufficialmente riconosciuta;
- **Check-in/Check-out**: fase prima di iniziare il task, e fase per indicare fine di un task;
- **Vincoli**: rappresentano le limitazioni poste al sistema verso gli utenti (come fascia oraria di disponibilità, ecc...);
- **Time Banking**: modello basato sullo scambio di tempo anziché di denaro fisico;
- **Gamification**: applicazione di meccaniche di gioco per incentivare comportamenti socialmente utili;
- **Gig Economy**: modello economico basato su impieghi temporanei o “gig” che non prevedono vincoli contrattuali a lungo termine;
- **Crediti SOLI**: rappresentano i punti guadagnabili dal completamento delle task e tarati rispetto al tempo impiegato. Tali punti possono essere scambiati per dei benefits offerti dal sistema;
- **SPID**: Sistema Pubblico di Identità Digitale, la soluzione promossa dal Governo italiano e dall'AgID che consente a cittadini e imprese di accedere ai servizi online della Pubblica Amministrazione e dei privati aderenti con un'unica credenziale (username e password);
- **AgID**: Agenzia per l'Italia Digitale, è l'ente tecnico della Presidenza del Consiglio dei Ministri incaricato di coordinare la trasformazione digitale della Pubblica Amministrazione italiana;
- **Dog Walking**: accompagnamento del cane quando il padrone è impossibilitato per motivi di salute o altro;
- **PA**: Pubblica Amministrazione:
- **Notifica PUSH**: tipologia di modello di notifica degli eventi verso gli utenti iscritti.
- **Wallet Digitale**: interfaccia grafica in cui vengono visualizzati i punti ottenuti e i badge personali;
- **Scambio Token**: codice univoco per accettazione della task e la sua conclusione;
- **SOLI Assistant**: Chatbot per l’assistenza agli utenti alle funzionalità del sistema e alle risoluzioni di possibili problematiche.
- **Chat Interna**: sistema di messaggistica interna tra Richiedente e Volontario Civico;

## Requisiti Funzionali

### 1\. Gestione Utenza e Autenticazione

- **FR-01: Autenticazione tramite Identità Digitale:** Il sistema deve permettere la registrazione e l'accesso degli utenti (Volontari e Richiedenti) esclusivamente tramite integrazione con sistemi di identità digitale pubblica (SPID/CIEid/servizi di emulazione di registrazione) per garantire la certificazione dell'identità (Livello di fiducia LV1).

- **FR-02: Profilazione Volontario e Gestione Preferenze:** Il sistema deve consentire al Volontario Civico di configurare il proprio profilo operativo, selezionando gli ambiti di intervento preferiti, impostando vincoli specifici (es. limitazioni fisiche, allergie) e definendo la propria disponibilità oraria.

### 2\. Creazione e Gestione delle Richieste (Task)

- **FR-04: Wizard di Creazione Richiesta Guidata:** Il sistema deve fornire un'interfaccia semplificata che guidi il Richiedente nella selezione della macro-categoria di servizio (Mobilità, Supporto Fisico, Socialità, Pet Support, Inclusione Digitale) e nell'inserimento dei dettagli necessari.

- **FR-05: Input Conversazionale e Vocale (Soli Assistant):** Il sistema deve integrare un modulo LLM (Large Language Model) che permetta all'utente di formulare richieste tramite linguaggio naturale o comandi vocali, estraendo automaticamente le entità (tipo di servizio, data, luogo) per pre-compilare il form di richiesta (Modalità "No-UI").

- **FR-06: Classificazione Automatica dell'Urgenza:** Il sistema deve analizzare la richiesta inserita per assegnare automaticamente un livello di priorità e urgenza, basandosi sulla tipologia di servizio e sulle tempistiche indicate.

### 3\. Core System: Matching e Assegnazione

- **FR-07: Algoritmo di Matching:** Il sistema deve elaborare le richieste incrociando i dati della domanda con i profili dei volontari, basandosi su quattro parametri vincolanti: prossimità geografica, compatibilità delle competenze/certificazioni, disponibilità oraria e principio di rotazione equa.
- **FR-08: Geolocalizzazione e Geofencing:** Il sistema deve tracciare la posizione degli utenti (previa autorizzazione) per calcolare le distanze e filtrare le notifiche di task disponibili esclusivamente ai volontari che si trovano nel raggio d'azione utile.
- **FR-09: Sistema di Notifiche Push Mirate:** Il sistema deve inviare notifiche push in tempo reale esclusivamente ai volontari selezionati dall'algoritmo di matching, evitando la diffusione indiscriminata delle richieste (broadcast) per ridurre il rumore informativo.
- **FR-10: Accettazione, Rifiuto e Rilascio Task:** Il sistema deve permettere al volontario di accettare o ignorare una notifica senza penalità. Deve inoltre includere una funzione di "Rilascio Task" per imprevisti post-accettazione, che inneschi una ri-assegnazione prioritaria della richiesta.

### 4\. Esecuzione e Monitoraggio

- **FR-11: Messaggistica Interna Anonimizzata:** La chat è disponibile esclusivamente per la durata del task attivo e viene disattivata al completamento. I contenuti sono monitorati tramite un modulo LLM-in-the-middle per finalità di prevenzione e moderazione.

- **FR-12: Validazione tramite Token/QR Code:** Il sistema deve generare codici univoci (QR Code o Token digitale) che le parti devono scansionare o scambiare per certificare digitalmente l'effettivo inizio (Check-in) e la conclusione (Check-out) della task.

### 5\. Gamification e Reward (Time Banking)

- **FR-13: Calcolo e Assegnazione Crediti SOLI:** Il sistema deve calcolare automaticamente i punti (Crediti SOLI) spettanti al volontario al termine di ogni task validato, basandosi sulla durata dell'intervento.
- **FR-14: Wallet Digitale:** Il sistema deve fornire un'interfaccia utente per la visualizzazione del saldo punti accumulato e dello storico delle attività svolte.
- **FR-15: Marketplace di Conversione Premi:** Il sistema deve permettere la conversione dei Crediti SOLI in premialità vincolate alla donazione (sconti trasporti, buoni spesa, accessi culturali) attraverso un catalogo premi gestito in collaborazione con gli sponsor locali.
- **FR-16 Gestione Dispute e Segnalazioni:** Il sistema deve permettere agli utenti di segnalare comportamenti inappropriati tramite un form dedicato, sospendendo cautelativamente l'utente segnalato fino a verifica.
- **FR-17 Gestione Storico e Audit:** Il sistema deve memorizzare lo storico dei task completati e delle transazioni di crediti per permettere la consultazione del Wallet e la risoluzione di dispute.
- **FR-18 Gestione Stato della Task:** Il sistema deve gestire lo stato interno di ogni task (creata, notificata, accettata, in esecuzione, completata, rilasciata, annullata), impedendo transizioni non valide.
- **FR-19 Annullamento Richiesta:** Il sistema deve permettere al Richiedente di annullare una richiesta prima dell’avvio del task, notificando automaticamente i volontari coinvolti.

## **Requisiti Non Funzionali**

- **NFR-01: Accessibilità e Usabilità (Inclusività):** Il sistema deve garantire un’interfaccia accessibile secondo gli standard WCAG, con particolare attenzione a utenti con disabilità motorie o bassa alfabetizzazione digitale. Deve essere possibile interagire con il sistema anche tramite modalità semplificate alternative alla UI tradizionale.

- **NFR-02: Sicurezza e Autenticazione Forte:** L'accesso ai servizi critici, in particolare per i Volontari Civici, deve avvenire esclusivamente tramite sistemi di identità digitale certificata (SPID/CIEid o sistemi emulati per la demo) per garantire l'affidabilità dei profili. Il sistema deve prevenire accessi non autorizzati e garantire l'integrità delle transazioni di token/QR code.

- **NFR-03: Privacy e Protezione dei Dati (GDPR Compliance):** Il sistema deve garantire la riservatezza dei dati privati degli utenti fragili e dei volontari. Le comunicazioni devono avvenire tramite chat interne anonimizzate. I dati delle chat devono essere cancellati al termine del task.

- **NFR-04: Prestazioni e Reattività (Real-time):** Il sistema deve garantire bassa latenza nella gestione delle notifiche push e nel matching geografico, assicurando che la richiesta di aiuto incontri il bisogno in tempo reale. L'algoritmo di matching deve elaborare la posizione e le competenze entro pochi secondi dall’inserimento della richiesta. Per notificare solo i volontari pertinenti.

- **NFR-05: Fairness Algoritmica e Sostenibilità Etica:** L'algoritmo di assegnazione deve includere meccanismi di rotazione equa per evitare il sovraccarico dei singoli volontari, senza imporre limiti rigidi di ore, preservando la natura libera del volontariato.

- **NFR-06: Moderazione dei Contenuti (AI Safety):** Il sistema deve integrare meccanismi automatici (basati su NLP/LLM) per analizzare in tempo reale i testi delle richieste e delle chat, filtrando contenuti offensivi, inappropriati o potenziali tentativi di truffa prima che raggiungano l'interlocutore.

- **NFR-07: Scalabilità Orizzontale:** L'architettura deve essere progettata per supportare un numero crescente di utenti e richieste simultanee a livello di quartiere o città, sfruttando la natura distribuita dei container.

- **NFR-08: Disponibilità del Servizio (Availability):** Il sistema deve garantire un uptime del **99.9%** durante le ore diurne (07:00 - 22:00), fascia oraria critica per l'erogazione dei servizi di assistenza domiciliare e mobilità.

- **NFR-09: Portabilità e Containerizzazione:** Ogni microservizio deve essere pacchettizzato in container Docker. L’intera stack deve essere avviabile tramite un unico comando di orchestrazione (es. docker-compose up), garantendo indipendenza dall’ambiente di esecuzione.

- **NFR-10: Interoperabilità RESTful (API First):** Tutte le comunicazioni tra client e server, e tra microservizi, devono avvenire tramite API REST documentate secondo lo standard **OpenAPI 3.0 (Swagger)**. I payload devono essere rigorosamente in formato JSON.

- **NFR-11: Tracciabilità delle Operazioni (Audit Log):** Ogni cambio di stato di un Task (da "Open" a "Assigned" a "Closed") e ogni transazione di "Crediti SOLI" deve generare un record di log immutabile, consultabile dagli amministratori per la risoluzione di dispute.

- **NFR-12: Affidabilità e Recupero da Errore:** Il sistema deve garantire la gestione degli errori applicativi senza perdita di dati critici (task, crediti, audit log).

- **NFR-13: Contestualizzazione Territoriale:** Il sistema deve supportare la configurazione locale dei servizi (categorie, raggio geografico, disponibilità) per adattarsi a contesti di quartiere o città differenti.

## User Stories

### 1\. L'Anziano e l'Accessibilità (Inclusione Digitale via AI)

**Titolo:** Richiesta semplificata tramite Assistente Vocale

**Come** persona anziana con scarsa familiarità tecnologica (Richiedente), **Voglio** poter attivare una richiesta di aiuto semplicemente parlando con "Soli Assistant" in linguaggio naturale (es: _"Ho bisogno di qualcuno che mi porti le casse d'acqua domani mattina"_), **Affinché** l'intelligenza artificiale strutturi automaticamente la richiesta, categorizzando il bisogno senza che io debba navigare tra menù complessi o digitare su tastiere piccole, rendendo l'accesso all'aiuto immediato e senza barriere.

### 2\. Il Volontario e l'Ottimizzazione (Smart Matching e Prossimità)

**Titolo:** Ricezione notifiche mirate per prossimità

**Come** Volontario Civico Certificato con poco tempo a disposizione, **Voglio** ricevere notifiche push _solo_ per richieste di aiuto che si trovano nel mio raggio di azione immediato (quartiere/isolato) e che corrispondono alle mie competenze certificate (es. "Supporto Digitale"), **Affinché** io possa accettare ed eseguire task mentre sto già compiendo i miei spostamenti quotidiani, riducendo l'impatto ambientale e massimizzando l'utilità del mio tempo senza dover filtrare manualmente centinaia di richieste non pertinenti.


### 4\. L'Utente Attivo e la Gratificazione (Gamification e Reward)

**Titolo:** Validazione del servizio e riscatto Crediti SOLI

**Come** Volontario che ha appena completato un servizio, **Voglio** poter scansionare un codice univoco (Token/QR) sul dispositivo del richiedente per chiudere ufficialmente il task e vedere immediatamente accreditati i "Crediti SOLI" sul mio Wallet Digitale, **Affinché** il mio impegno venga riconosciuto in modo trasparente e io possa accumulare punti per riscattare premialità concrete vincolate alla donazione, sentendomi parte valorizzata di un'economia circolare e solidale.

### 5\. Il Nuovo Volontario e l'Onboarding (Identità Certificata)

**Titolo:** Registrazione rapida e sicura tramite SPID

**Come** cittadino che vuole diventare Volontario per la prima volta, **Voglio** potermi registrare sull'app utilizzando le mie credenziali SPID esistenti senza dover inviare scansioni di documenti o attendere validazioni manuali, **Affinché** la mia identità venga certificata istantaneamente secondo gli standard AgID, permettendomi di diventare operativo subito e garantendo alla comunità che sono una persona reale e verificata.

### 6\. Il Coordinamento Operativo (Privacy e Comunicazione)

**Titolo:** Chat contestuale anonimizzata

**Come** Volontario che ha accettato una richiesta di spesa (es. farmacia o supermercato), **Voglio** poter contattare il richiedente tramite una chat integrata nell'app per chiarire dubbi dell'ultimo minuto (es. _"preferisce il marchio X o Y?"_) senza dover scambiare il mio numero di telefono privato, **Affinché** possa offrire un servizio preciso tutelando la privacy di entrambi ed evitando contatti fuori piattaforma non tracciati.

### 7\. La Resilienza del Sistema (Gestione Imprevisti)

**Titolo:** Rilascio del task per imprevisto

**Come** Volontario che ha un'emergenza improvvisa dopo aver accettato un incarico, **Voglio** poter segnalare l'impossibilità di proseguire tramite un tasto "Rilascia Task", **Affinché** il sistema rimetta immediatamente la richiesta in circolo notificandola con priorità alta ad altri volontari in zona, evitando che l'anziano rimanga senza aiuto a causa del mio contrattempo.

### 8\. Annullamento lato Richiedente

**Titolo:** Annullamento della richiesta prima dell’avvio

**Come** Richiedente, **Voglio** poter annullare una richiesta di aiuto prima che il servizio abbia inizio, **Affinché** eventuali cambi di programma o imprevisti non facciano perdere tempo ai volontari e la rete rimanga efficiente e rispettosa del tempo di tutti.

### 9\. Segnalazione comportamento scorretto

**Titolo:** Segnalazione di comportamento inappropriato

**Come** Richiedente o Volontario, **Voglio** poter segnalare un comportamento inappropriato o problematico al termine di un servizio tramite un modulo dedicato,
**Affinché** il sistema possa prevenire situazioni di abuso e migliorare la sicurezza complessiva della comunità.
