package it.soli.security;

import it.soli.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

@ApplicationScoped
public class SecurityService {

    private static final Logger LOG = Logger.getLogger(SecurityService.class);

    @Inject
    UserCreationService userCreationService;

    /**
     * Restituisce l'utente dal DB oppure lo crea alla prima autenticazione.
     *
     * @Transactional(REQUIRED) apre la sessione JPA necessaria per le query Panache.
     * La creazione avviene in UserCreationService con @Transactional(REQUIRES_NEW):
     * una transazione indipendente (T2) che si committa separatamente.
     * Se T2 fallisce per una race condition (constraint unique su keycloakId),
     * l'eccezione viene catturata qui senza invalidare T1 (REQUIRED), e la
     * re-query trova l'utente già committato dall'altra richiesta concorrente.
     */
    @Transactional
    public User getOrCreateUser(String keycloakId, JsonWebToken token) {
        User user = User.findByKeycloakId(keycloakId);
        if (user != null) {
            return user;
        }

        LOG.infof("User not found in DB for Keycloak ID %s. Attempting auto-creation.", keycloakId);
        try {
            return userCreationService.createIfAbsent(keycloakId, token);
        } catch (Exception e) {
            // T2 (REQUIRES_NEW) è fallito — quasi certamente una race condition:
            // un'altra richiesta concorrente ha già committato lo stesso utente.
            // T1 (REQUIRED, questo metodo) NON viene invalidato dal fallimento di T2,
            // quindi possiamo rileerge l'utente ora visibile nel DB.
            LOG.infof("Concurrent user creation for %s, fetching existing record.", keycloakId);
            User existing = User.findByKeycloakId(keycloakId);
            if (existing != null) {
                return existing;
            }
            throw new RuntimeException("Failed to get or create user for keycloakId: " + keycloakId, e);
        }
    }
}
