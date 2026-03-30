# FR-16 Gestione Stato del Task

Il sistema deve gestire lo stato interno di ogni task (creata, notificata, accettata, in esecuzione, completata, rilasciata, annullata), impedendo transizioni non valide. Una volta che un task è stato accettato da un volontario, esso deve essere portato a completamento. Il task non può rimanere indefinitamente nello stato "accettato" o "in esecuzione".
