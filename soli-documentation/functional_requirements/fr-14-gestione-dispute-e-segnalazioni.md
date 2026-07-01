# FR-14 Gestione Dispute e Segnalazioni

Il sistema deve permettere agli utenti di segnalare comportamenti inappropriati tramite un form dedicato, sospendendo cautelativamente l'utente segnalato fino a verifica.

## Stato implementazione (rev. 2026-07-01)

**Segnalazione post-task.** Nella pagina di dettaglio task compare il pulsante **"Segnala comportamento"**, visibile solo quando il task è `COMPLETED` e all'utente coinvolto (creatore o volontario). Il click apre un dialog con un campo testo (motivazione) e invia `POST /api/reports` con `{ taskId, reportedUserId, reason }`; `reportedUserId` è l'altra parte coinvolta nel task, `reporterId` è derivato dall'utente autenticato (JWT).

**Backend.** Usa l'entità `Report` già prevista (stato iniziale `OPEN`). La sospensione cautelativa dell'utente segnalato e la valutazione restano a carico della moderazione (workflow admin), non automatiche.
