package it.soli.integration.urbansentinel.dto;

/** Non-2xx answer from the Urban Sentinel REST API. */
public class UsApiException extends RuntimeException {

    public final int status;

    public UsApiException(int status, String message) {
        super(message);
        this.status = status;
    }
}
