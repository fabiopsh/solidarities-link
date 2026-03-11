# FR-10: Accettazione, Rifiuto e Rilascio Task

Il sistema deve permettere al volontario di accettare o ignorare una notifica senza penalità. Deve inoltre includere una funzione di "Rilascio Task" per imprevisti post-accettazione, che inneschi una ri-assegnazione prioritaria della richiesta.

## Flusso post-accettazione

Una volta che un volontario accetta un task:

1. **Timer di annullamento**: parte un timer di 10 minuti durante il quale il Richiedente può ancora annullare il task (vedi FR-19).
2. **Pulsante "Conferma Completamento"**: dopo l'accettazione, sia il Richiedente che il Volontario visualizzano un pulsante per confermare il completamento del task. Il task viene marcato come completato solo con la **doppia conferma** (vedi FR-18).

