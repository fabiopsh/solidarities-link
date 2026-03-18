package it.soli.security;

import it.soli.entity.User;
import it.soli.entity.UserRole;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

import java.util.UUID;

@ApplicationScoped
public class SecurityService {

    private static final Logger LOG = Logger.getLogger(SecurityService.class);

    @Transactional
    public User getOrCreateUser(String keycloakId, JsonWebToken token) {
        User user = User.findByKeycloakId(keycloakId);

        if (user == null) {
            LOG.infof("User not found in DB for Keycloak ID %s. Attempting auto-creation.", keycloakId);
            user = new User();
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
            LOG.infof("Created new user: %s (ID: %s) with role: %s", user.email, user.id, user.role);
        }
        return user;
    }
}
