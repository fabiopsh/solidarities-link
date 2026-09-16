package it.soli.integration.faro.dto;

/** Non-2xx answer from a FARO API (status code as documented by FARO). */
public class FaroApiException extends RuntimeException {

    public final int status;

    public FaroApiException(int status, String message) {
        super(message);
        this.status = status;
    }
}
