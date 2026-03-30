# FR-18 Gestione Conferma del Task

Il sistema deve prevedere un meccanismo di doppia conferma per il completamento del task:
- Dopo l'accettazione, sia il Richiedente che il Volontario vedono un pulsante "Conferma Completamento" nella schermata di dettaglio del task.
- Il task viene marcato come completato solo quando entrambi gli utenti hanno confermato il completamento.
- Se solo uno dei due ha confermato, il sistema mostra lo stato di conferma parziale (es. "Il Volontario ha confermato il completamento. In attesa della conferma del Richiedente").
- La conferma è irreversibile: una volta confermata da un utente, non può essere ritirata.
