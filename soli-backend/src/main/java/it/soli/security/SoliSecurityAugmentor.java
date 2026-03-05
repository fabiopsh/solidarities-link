package it.soli.security;

import io.quarkus.security.identity.AuthenticationRequestContext;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.SecurityIdentityAugmentor;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.security.Principal;
import org.eclipse.microprofile.jwt.JsonWebToken;
import jakarta.enterprise.context.control.ActivateRequestContext;

import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

@ApplicationScoped
public class SoliSecurityAugmentor implements SecurityIdentityAugmentor {

    private static final Logger LOG = Logger.getLogger(SoliSecurityAugmentor.class);

    @Inject
    JsonWebToken jwt;

    @Inject
    SecurityService securityService;

    @Override
    public int priority() {
        return 0;
    }

    @Override
    public Uni<SecurityIdentity> augment(SecurityIdentity identity, AuthenticationRequestContext context) {
        if (identity.isAnonymous()) {
            return Uni.createFrom().item(identity);
        }

        return context.runBlocking(() -> {
            Principal principal = identity.getPrincipal();
            String keycloakId = null;

            // Try to get token from principal first (most reliable in augmentor)
            JsonWebToken token = null;
            if (principal instanceof JsonWebToken) {
                token = (JsonWebToken) principal;
                keycloakId = token.getSubject();
                LOG.debugf("Subject from principal: %s", keycloakId);
            }

            // Fallback to injected JWT if context is active
            if (keycloakId == null) {
                try {
                    keycloakId = jwt.getSubject();
                    token = jwt;
                    LOG.debugf("Subject from injected JWT: %s", keycloakId);
                } catch (Exception e) {
                    LOG.debug("RequestContext not active for injected JWT, skipping.");
                }
            }

            // Final fallback to principal name
            if (keycloakId == null) {
                keycloakId = principal.getName();
                LOG.debugf("Using principal name as subject: %s", keycloakId);
            }

            if (keycloakId == null) return identity;

            // Database operation in separate transactional service
            User user = securityService.getOrCreateUser(keycloakId, token);

            if (user == null) {
                LOG.warnf("Could not find or create user for %s", keycloakId);
                return identity;
            }

            QuarkusSecurityIdentity.Builder builder = QuarkusSecurityIdentity.builder(identity);
            builder.addRole(user.role.name());
            
            SecurityIdentity augmented = builder.build();
            LOG.debugf("Augmented identity for %s with roles: %s", user.email, augmented.getRoles());
            return augmented;
        });
    }
}
