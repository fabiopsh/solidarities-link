# FR-11: Calcolo e Assegnazione Crediti SOLI

Il sistema deve calcolare automaticamente i punti (Crediti SOLI) spettanti al volontario al termine di ogni task validato, basandosi sulla durata dell'intervento.

## Stato implementazione (rev. 2026-07-01)

**Formula.** Crediti = `durata_effettiva_ore × 6 × moltiplicatoreCriticità × moltiplicatoreCategoria`, arrotondati, con **minimo 1 credito** per ogni task completato con durata positiva. La durata è calcolata sui secondi tra `checkInAt` e `checkOutAt` (così anche i task sotto il minuto accreditano ≥1 credito) ed è **limitata a un massimo di 8 ore** per evitare accrediti abnormi.

**Moltiplicatori.**
- Criticità (`urgencyLevel`): LOW ×1.0, MEDIUM ×1.25, HIGH ×1.5, CRITICAL ×2.0.
- Categoria (`category`): SOCIAL ×1.0, DIGITAL ×1.1, PET_SUPPORT ×1.1, MOBILITY ×1.2, PHYSICAL_SUPPORT ×1.5.

**Timestamp durata.** Aggiunti i campi `checkInAt`/`checkOutAt` al task. Sono valorizzati:
- dal flusso a token (`checkInTask` → `checkInAt`, `checkOutTask` → `checkOutAt`);
- come **fallback** nel flusso a doppia conferma (FR-18): al passaggio a `COMPLETED`, se mancanti, `checkInAt = acceptedAt` e `checkOutAt = now()`.

**Atomicità.** L'accredito (aggiornamento saldo `Wallet` + `Transaction` `EARN_TASK_REWARD`) avviene **in modo sincrono nella stessa transazione** del completamento del task: se fallisce, il completamento viene annullato (prima era asincrono e gli errori venivano silenziosamente ignorati). Il credito calcolato viene salvato anche su `Task.rewardCredits` per tracciabilità.
