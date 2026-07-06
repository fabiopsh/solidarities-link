package it.soli.service;

import it.soli.entity.ApiToken;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * Issues, validates and revokes {@link ApiToken}s for the Open Data API.
 */
@ApplicationScoped
public class ApiTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PREFIX = "soli_";

    /** Result of creating a token: the entity plus the one-time plaintext key. */
    public static class CreatedToken {
        public ApiToken token;
        public String plaintextKey;

        public CreatedToken(ApiToken token, String plaintextKey) {
            this.token = token;
            this.plaintextKey = plaintextKey;
        }
    }

    @Transactional
    public CreatedToken create(String label, LocalDateTime expiresAt, UUID adminId) {
        byte[] raw = new byte[24];
        RANDOM.nextBytes(raw);
        String key = PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        ApiToken token = new ApiToken();
        token.label = label;
        token.tokenPrefix = key.substring(0, Math.min(12, key.length()));
        token.tokenHash = sha256(key);
        token.scope = "read:stats";
        token.createdBy = adminId;
        token.expiresAt = expiresAt;
        token.revoked = false;
        token.callCount = 0L;
        token.persist();

        return new CreatedToken(token, key);
    }

    /**
     * Validates a raw key and records the usage. Returns true if the token is
     * known, not revoked and not expired.
     */
    @Transactional
    public boolean validateAndRecord(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return false;
        }
        ApiToken token = ApiToken.findByHash(sha256(rawKey));
        if (token == null || Boolean.TRUE.equals(token.revoked)) {
            return false;
        }
        if (token.expiresAt != null && token.expiresAt.isBefore(LocalDateTime.now())) {
            return false;
        }
        token.lastUsedAt = LocalDateTime.now();
        token.callCount = (token.callCount == null ? 0L : token.callCount) + 1;
        return true;
    }

    @Transactional
    public boolean revoke(UUID id) {
        ApiToken token = ApiToken.findById(id);
        if (token == null) {
            return false;
        }
        token.revoked = true;
        return true;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
