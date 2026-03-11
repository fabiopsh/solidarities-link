# FR-04: Wizard di Creazione Richiesta Guidata

Il sistema deve fornire un'interfaccia semplificata che guidi il Richiedente nella selezione della macro-categoria di servizio (Mobilità, Supporto Fisico, Socialità, Pet Support, Inclusione Digitale) e nell'inserimento dei dettagli necessari.

## Limite Giornaliero di Richieste

Il sistema deve imporre un **limite massimo di 5 task richiedibili al giorno** per ciascun Richiedente, al fine di evitare l'intasamento del sistema con richieste multiple. In particolare:

- Ogni Richiedente può creare un massimo di **5 task nelle 24 ore** (calcolate dalla mezzanotte alla mezzanotte).
- Al raggiungimento del limite, il sistema deve **bloccare la creazione** di nuove richieste e mostrare un messaggio informativo all'utente (es. _"Hai raggiunto il limite massimo di 5 richieste giornaliere. Riprova domani."_).
- Il conteggio deve includere tutte le task create nella giornata, **indipendentemente dal loro stato** (attive, annullate, completate).
