package it.soli.bootstrap;

import io.quarkus.runtime.StartupEvent;
import it.soli.entity.Charity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.transaction.Transactional;

/**
 * Seeds the 4 initial benefit organizations ("enti benefici") on first startup.
 * Runs only when the charities table is empty, so it is idempotent across restarts
 * (Hibernate auto-DDL uses generation=update, so import.sql would not run).
 */
@ApplicationScoped
public class DataSeeder {

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        if (Charity.count() > 0) {
            return;
        }

        seed("Banco Alimentare",
                "Rete che recupera eccedenze alimentari e le dona a chi è in difficoltà.",
                "Alimentare", "Spesa solidale 10€", 50, 100);

        seed("Croce Rossa Italiana",
                "Assistenza sanitaria e soccorso alle persone vulnerabili.",
                "Sanità", "Kit primo soccorso", 40, 100);

        seed("Legambiente",
                "Associazione ambientalista impegnata nella tutela del territorio.",
                "Ambiente", "Albero piantato a tuo nome", 30, 200);

        seed("Emergency",
                "Cure medico-chirurgiche gratuite alle vittime di guerra e povertà.",
                "Sanità", "Donazione visita medica", 60, 100);
    }

    private void seed(String name, String description, String cause,
                      String voucherLabel, int costInCredits, int stock) {
        Charity charity = new Charity();
        charity.name = name;
        charity.description = description;
        charity.cause = cause;
        charity.voucherLabel = voucherLabel;
        charity.costInCredits = costInCredits;
        charity.stockRemaining = stock;
        charity.isActive = true;
        charity.persist();
    }
}
