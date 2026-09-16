package it.soli.integration.cassitrack.dto;

/** Item of CT-25 {@code GET /api/v1/buses}: fleet registry. */
public record CtBus(int id, String currentVehicleId, String licensePlate, int numberSeats,
                    boolean placeDisablePeople, boolean available) {
}
