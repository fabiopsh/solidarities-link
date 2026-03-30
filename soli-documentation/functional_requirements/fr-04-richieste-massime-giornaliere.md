# FR-04: Richieste Massime Giornaliere

Il sistema deve imporre un limite massimo di 5 task richiedibili al giorno per ciascun Richiedente, al fine di evitare l'intasamento del sistema con richieste multiple. In particolare:

- Ogni Richiedente può creare un massimo di 5 task nelle 24 ore (calcolate dalla mezzanotte alla mezzanotte).
- Al raggiungimento del limite, il sistema deve bloccare la creazione di nuove richieste e mostrare un messaggio informativo all'utente (es. "Hai raggiunto il limite massimo di 5 richieste giornaliere. Riprova domani.").
- Il conteggio deve includere tutte le task create nella giornata, indipendentemente dal loro stato (attive, annullate, completate).
