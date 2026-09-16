package it.soli.integration.faro;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.UUID;

/** Persists {@link FaroCallLog} rows in their own transaction, so a failed business transaction keeps its trace. */
@ApplicationScoped
public class FaroCallLogger {

    private static final Logger LOG = Logger.getLogger(FaroCallLogger.class);

    @Inject
    ObjectMapper objectMapper;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void log(FaroCallLog.Direction direction, String method, String uri, Integer status,
                    Object request, Object response, long durationMs, UUID actorId, UUID taskId) {
        FaroCallLog entry = new FaroCallLog();
        entry.direction = direction;
        entry.method = method;
        entry.uri = uri;
        entry.httpStatus = status;
        entry.requestBody = toJson(request);
        entry.responseBody = toJson(response);
        entry.durationMs = durationMs;
        entry.actorId = actorId;
        entry.taskId = taskId;
        entry.persist();
        LOG.infof("[FARO] %s %s %s -> %s (%d ms)", direction, method, uri, status == null ? "-" : status, durationMs);
    }

    private String toJson(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }
}
