package it.soli.integration.faro;

import it.soli.entity.User;

import java.util.UUID;

/** Institutional account ("Protezione Civile - FARO") that owns the tasks created by FARO engagements. */
public final class FaroSystemUser {

    public static final String EMAIL = "faro@protezionecivile.soli.it";

    private FaroSystemUser() {
    }

    /** Must be called inside a transaction. */
    public static User getOrCreate() {
        User user = User.findByEmail(EMAIL);
        if (user == null) {
            user = new User();
            user.email = EMAIL;
            user.firstName = "Protezione Civile";
            user.lastName = "FARO";
            user.persist();
        }
        return user;
    }

    public static UUID id() {
        return getOrCreate().id;
    }
}
