package it.soli.security;

import it.soli.entity.User;
import it.soli.entity.UserRole;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

/**
 * Gestisce la creazione del record utente nel DB alla prima autenticazione.
 * Separato da SecurityService in modo da poter usare REQUIRES_NEW, che crea
 * una transazione indipendente e permette di gestire le violazioni di constraint
 * causate da richieste concorrenti dello stesso utente (race condition alla
 * prima registrazione, quando il dashboard lancia N richieste in parallelo).
 */
@ApplicationScoped
public class UserCreationService {

    private static final Logger LOG = Logger.getLogger(UserCreationService.class);

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public User createIfAbsent(String keycloakId, JsonWebToken token) {
        // Double-check dentro la nuova transazione: un'altra richiesta concorrente
        // potrebbe aver già creato l'utente tra il check esterno e questa chiamata.
        User existing = User.findByKeycloakId(keycloakId);
        if (existing != null) {
            return existing;
        }

        User user = new User();
        user.keycloakId = keycloakId;

        try {
            user.email = token.getClaim("email");
            user.firstName = token.getClaim("given_name");
            user.lastName = token.getClaim("family_name");

            if (user.email == null && keycloakId.contains("@")) {
                user.email = keycloakId;
            }
            if (user.email == null) {
                user.email = keycloakId + "@placeholder.soli.it";
            }
        } catch (Exception e) {
            LOG.error("Error extracting claims for auto-creation: " + e.getMessage());
            user.email = keycloakId + "@error.soli.it";
        }

        user.role = UserRole.USER;
        user.persist();
        LOG.infof("Created new user: %s (keycloakId: %s) with role: %s", user.email, keycloakId, user.role);
        return user;
    }
}
