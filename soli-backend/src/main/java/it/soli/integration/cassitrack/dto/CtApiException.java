package it.soli.integration.cassitrack.dto;

/** Non-2xx answer from the CassiTrack or OmniMove REST API. */
public class CtApiException extends RuntimeException {

    public final int status;

    public CtApiException(int status, String message) {
        super(message);
        this.status = status;
    }
}
