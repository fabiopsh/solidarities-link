# FR-03: Wizard di Creazione Richiesta Guidata

Il sistema deve fornire un'interfaccia semplificata che guidi il Richiedente nella selezione della macro-categoria di servizio (Mobilità, Supporto Fisico, Socialità, Pet Support, Inclusione Digitale) e nell'inserimento dei dettagli necessari.

## Stato implementazione (rev. 2026-07-01)

Nello step di localizzazione, all'apertura del wizard la posizione corrente viene rilevata e **geocodificata inversamente in automatico**: indirizzo e pin sulla mappa risultano già precompilati con "la mia posizione" senza click aggiuntivi (l'utente può comunque modificarli cercando un indirizzo o trascinando il pin).