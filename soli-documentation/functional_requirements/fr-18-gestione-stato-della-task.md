# FR-18 Gestione Stato della Task

Il sistema deve gestire lo stato interno di ogni task (creata, notificata, accettata, in esecuzione, completata, rilasciata, annullata), impedendo transizioni non valide.

## Ciclo di vita del task dopo l'accettazione

Una volta che un task è stato **accettato** da un volontario, esso **deve essere portato a completamento**. Il task non può rimanere indefinitamente nello stato "accettato" o "in esecuzione".

### Conferma di completamento (doppia conferma)

Il sistema deve prevedere un meccanismo di **doppia conferma** per il completamento del task:

- Dopo l'accettazione, sia il **Richiedente** che il **Volontario** vedono un pulsante **"Conferma Completamento"** nella schermata di dettaglio del task.
- Il task viene marcato come **completato** solo quando **entrambi gli utenti** hanno confermato il completamento.
- Se solo uno dei due ha confermato, il sistema mostra lo stato di conferma parziale (es. _"Il volontario ha confermato il completamento. In attesa della conferma del richiedente."_).
- La conferma è **irreversibile**: una volta confermata da un utente, non può essere ritirata.

### Transizioni di stato aggiornate

```
creata → notificata → accettata → in esecuzione → completata (doppia conferma)
                                 ↘ rilasciata → ri-assegnazione
                    ↘ annullata (entro 10 min dall'accettazione, solo dal Richiedente)
       ↘ annullata (liberamente, se non accettata)
```
