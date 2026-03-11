# FR-19 Annullamento Richiesta

Il sistema deve permettere al Richiedente (o Caregiver) di annullare una richiesta, con regole differenziate in base allo stato del task.

## Regole di Annullamento

### Task non ancora accettato

Se il task **non è stato ancora accettato** da un volontario, il Richiedente può annullarlo **liberamente** e in qualsiasi momento. Il sistema notifica automaticamente eventuali volontari già coinvolti nel processo di matching.

### Task già accettato — Finestra di annullamento (10 minuti)

Se il task è **già stato accettato** da un volontario, il Richiedente può annullarlo **solo entro 10 minuti** dall'accettazione. Oltre questo limite, l'annullamento non è più consentito e il task deve essere portato a completamento.

In particolare:

- Un **timer visivo di 10 minuti** (countdown) deve essere visualizzato sull'interfaccia del Richiedente a partire dal momento dell'accettazione del task da parte del volontario.
- Finché il timer è attivo, il pulsante "Annulla" è visibile e attivo.
- Allo scadere del timer, il pulsante "Annulla" viene **disabilitato o nascosto**, e il task non può più essere annullato dal Richiedente.
- In caso di annullamento entro la finestra, il sistema notifica il volontario e riporta il task allo stato di ri-assegnazione o lo chiude definitivamente (a discrezione del Richiedente).
