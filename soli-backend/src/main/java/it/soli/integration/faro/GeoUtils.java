package it.soli.integration.faro;

/** Geographic helpers shared by the FARO integration. */
public final class GeoUtils {

    private static final double EARTH_RADIUS_METERS = 6371000;
    private static final String GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

    private GeoUtils() {
    }

    public static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Latitude shifted north by the given distance (used to place meeting points outside a risk perimeter). */
    public static double latitudeNorthOf(double lat, double meters) {
        return lat + Math.toDegrees(meters / EARTH_RADIUS_METERS);
    }

    /** Geohash encoding, as used by FARO to partition reports and events. */
    public static String geohash(double lat, double lon, int precision) {
        double[] latRange = {-90, 90};
        double[] lonRange = {-180, 180};
        StringBuilder hash = new StringBuilder();
        boolean evenBit = true;
        int bit = 0;
        int ch = 0;
        while (hash.length() < precision) {
            double[] range = evenBit ? lonRange : latRange;
            double value = evenBit ? lon : lat;
            double mid = (range[0] + range[1]) / 2;
            if (value >= mid) {
                ch = (ch << 1) | 1;
                range[0] = mid;
            } else {
                ch = ch << 1;
                range[1] = mid;
            }
            evenBit = !evenBit;
            if (++bit == 5) {
                hash.append(GEOHASH_BASE32.charAt(ch));
                bit = 0;
                ch = 0;
            }
        }
        return hash.toString();
    }

    /** Risk perimeter used by SOLI for volunteer safety, scaled on FARO's severity. */
    public static int riskRadiusMeters(String severity, int maxRadiusMeters) {
        double factor = switch (severity == null ? "" : severity) {
            case "CRITICAL" -> 1.0;
            case "HIGH" -> 0.7;
            case "MEDIUM" -> 0.45;
            default -> 0.25;
        };
        return (int) Math.round(maxRadiusMeters * factor);
    }
}
