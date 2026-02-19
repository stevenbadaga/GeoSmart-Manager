package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class GeoJsonService {
    private static final double METERS_PER_DEG_LAT = 111320.0;
    private final ObjectMapper objectMapper;

    public GeoJsonService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<List<Point>> extractPolygons(String geoJson) {
        List<List<Point>> polygons = new ArrayList<>();
        if (geoJson == null || geoJson.isBlank()) {
            return polygons;
        }
        try {
            JsonNode root = objectMapper.readTree(geoJson);
            List<JsonNode> geometries = new ArrayList<>();
            String type = root.path("type").asText();
            if ("FeatureCollection".equalsIgnoreCase(type)) {
                for (JsonNode feature : root.path("features")) {
                    geometries.add(feature.path("geometry"));
                }
            } else if ("Feature".equalsIgnoreCase(type)) {
                geometries.add(root.path("geometry"));
            } else {
                geometries.add(root);
            }

            for (JsonNode geometry : geometries) {
                String geomType = geometry.path("type").asText();
                JsonNode coords = geometry.path("coordinates");
                if ("Polygon".equalsIgnoreCase(geomType)) {
                    polygons.add(parseRing(coords.path(0)));
                } else if ("MultiPolygon".equalsIgnoreCase(geomType)) {
                    for (JsonNode polygon : coords) {
                        polygons.add(parseRing(polygon.path(0)));
                    }
                }
            }
        } catch (Exception ignored) {
            return polygons;
        }
        return polygons;
    }

    public GeoJsonMetrics analyze(String geoJson) {
        List<List<Point>> polygons = extractPolygons(geoJson);
        if (polygons.isEmpty()) {
            return new GeoJsonMetrics(0, 0, 0, 0, 0, 0, null, null);
        }

        int polygonCount = polygons.size();
        int featureCount = polygonCount;
        double totalArea = 0;
        double minArea = Double.POSITIVE_INFINITY;
        double maxArea = Double.NEGATIVE_INFINITY;
        BoundingBox overall = null;
        Point centroid = new Point(0, 0);
        int centroidCount = 0;

        for (List<Point> polygon : polygons) {
            double area = computeAreaSqm(polygon);
            totalArea += area;
            minArea = Math.min(minArea, area);
            maxArea = Math.max(maxArea, area);
            BoundingBox box = computeBoundingBox(polygon);
            overall = overall == null ? box : overall.merge(box);
            Point polyCenter = computeCentroid(polygon);
            centroid = new Point(centroid.lon + polyCenter.lon, centroid.lat + polyCenter.lat);
            centroidCount++;
        }

        double avgArea = polygonCount == 0 ? 0 : totalArea / polygonCount;
        Point avgCentroid = centroidCount == 0 ? null : new Point(centroid.lon / centroidCount, centroid.lat / centroidCount);
        return new GeoJsonMetrics(featureCount, polygonCount, totalArea, avgArea, minArea, maxArea, overall, avgCentroid);
    }

    public UpiStats computeUpiStats(String geoJson) {
        if (geoJson == null || geoJson.isBlank()) {
            return new UpiStats(null, 0, 0, 0, 0, 0);
        }

        List<JsonNode> features = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(geoJson);
            String type = root.path("type").asText();
            if ("FeatureCollection".equalsIgnoreCase(type)) {
                root.path("features").forEach(features::add);
            } else if ("Feature".equalsIgnoreCase(type)) {
                features.add(root);
            } else {
                return new UpiStats(null, 0, 0, 0, 0, 0);
            }
        } catch (Exception ignored) {
            return new UpiStats(null, 0, 0, 0, 0, 0);
        }

        int featureCount = features.size();
        if (featureCount == 0) {
            return new UpiStats(null, 0, 0, 0, 0, 0);
        }

        java.util.Map<String, Integer> keyCounts = new java.util.HashMap<>();
        java.util.Map<String, String> keyOriginal = new java.util.HashMap<>();

        for (JsonNode feature : features) {
            JsonNode properties = feature.path("properties");
            if (!properties.isObject()) {
                continue;
            }
            java.util.Iterator<String> fields = properties.fieldNames();
            while (fields.hasNext()) {
                String field = fields.next();
                if (!isUpiKey(field)) {
                    continue;
                }
                String value = properties.path(field).asText("");
                if (value == null || value.isBlank()) {
                    continue;
                }
                String lower = field.toLowerCase();
                keyCounts.put(lower, keyCounts.getOrDefault(lower, 0) + 1);
                keyOriginal.putIfAbsent(lower, field);
            }
        }

        if (keyCounts.isEmpty()) {
            return new UpiStats(null, featureCount, 0, 0, 0, featureCount);
        }

        String selectedKey = keyCounts.entrySet().stream()
                .max(java.util.Map.Entry.comparingByValue())
                .map(java.util.Map.Entry::getKey)
                .orElse(null);
        String selectedField = selectedKey == null ? null : keyOriginal.get(selectedKey);

        java.util.Set<String> uniqueValues = new java.util.HashSet<>();
        int withUpi = 0;
        for (JsonNode feature : features) {
            JsonNode properties = feature.path("properties");
            if (!properties.isObject() || selectedKey == null) {
                continue;
            }
            String value = findPropertyValue(properties, selectedKey);
            if (value == null || value.isBlank()) {
                continue;
            }
            withUpi++;
            uniqueValues.add(value.trim());
        }

        int uniqueCount = uniqueValues.size();
        int duplicateCount = Math.max(0, withUpi - uniqueCount);
        int missingCount = Math.max(0, featureCount - withUpi);
        return new UpiStats(selectedField, featureCount, withUpi, uniqueCount, duplicateCount, missingCount);
    }

    public double computeCompactnessScore(String geoJson) {
        List<List<Point>> polygons = extractPolygons(geoJson);
        if (polygons.isEmpty()) {
            return 0;
        }

        double totalScore = 0;
        int count = 0;
        for (List<Point> polygon : polygons) {
            double area = computeAreaSqm(polygon);
            double perimeter = computePerimeterMeters(polygon);
            if (perimeter <= 0) {
                continue;
            }
            double compactness = (4 * Math.PI * area) / (perimeter * perimeter);
            compactness = Math.max(0, Math.min(1, compactness));
            totalScore += compactness * 100;
            count++;
        }

        return count == 0 ? 0 : totalScore / count;
    }

    public ParcelStats computeParcelStats(List<Point> polygon) {
        double area = computeAreaSqm(polygon);
        BoundingBox box = computeBoundingBox(polygon);
        double width = metersForLon(box.maxLon - box.minLon, (box.maxLat + box.minLat) / 2.0);
        double height = metersForLat(box.maxLat - box.minLat);
        double ratio = height == 0 ? 0 : Math.max(width / height, height / width);
        return new ParcelStats(area, width, height, ratio);
    }

    public BoundingBox computeBoundingBox(List<Point> polygon) {
        double minLon = Double.POSITIVE_INFINITY;
        double minLat = Double.POSITIVE_INFINITY;
        double maxLon = Double.NEGATIVE_INFINITY;
        double maxLat = Double.NEGATIVE_INFINITY;
        for (Point point : polygon) {
            minLon = Math.min(minLon, point.lon);
            minLat = Math.min(minLat, point.lat);
            maxLon = Math.max(maxLon, point.lon);
            maxLat = Math.max(maxLat, point.lat);
        }
        if (!Double.isFinite(minLon)) {
            return new BoundingBox(0, 0, 0, 0);
        }
        return new BoundingBox(minLon, minLat, maxLon, maxLat);
    }

    public double computeAreaSqm(List<Point> polygon) {
        if (polygon.size() < 3) {
            return 0;
        }
        double latRef = polygon.stream().mapToDouble(point -> point.lat).average().orElse(0);
        double metersPerLon = metersForLon(1.0, latRef);
        double metersPerLat = METERS_PER_DEG_LAT;

        double area = 0;
        for (int i = 0; i < polygon.size(); i++) {
            Point p1 = polygon.get(i);
            Point p2 = polygon.get((i + 1) % polygon.size());
            double x1 = p1.lon * metersPerLon;
            double y1 = p1.lat * metersPerLat;
            double x2 = p2.lon * metersPerLon;
            double y2 = p2.lat * metersPerLat;
            area += (x1 * y2) - (x2 * y1);
        }
        return Math.abs(area) * 0.5;
    }

    public double computePerimeterMeters(List<Point> polygon) {
        if (polygon.size() < 2) {
            return 0;
        }
        double latRef = polygon.stream().mapToDouble(point -> point.lat).average().orElse(0);
        double metersPerLon = metersForLon(1.0, latRef);
        double metersPerLat = METERS_PER_DEG_LAT;
        double perimeter = 0;
        for (int i = 0; i < polygon.size(); i++) {
            Point p1 = polygon.get(i);
            Point p2 = polygon.get((i + 1) % polygon.size());
            double dx = (p2.lon - p1.lon) * metersPerLon;
            double dy = (p2.lat - p1.lat) * metersPerLat;
            perimeter += Math.hypot(dx, dy);
        }
        return perimeter;
    }

    public Point computeCentroid(List<Point> polygon) {
        if (polygon.isEmpty()) {
            return new Point(0, 0);
        }
        double lon = 0;
        double lat = 0;
        for (Point point : polygon) {
            lon += point.lon;
            lat += point.lat;
        }
        return new Point(lon / polygon.size(), lat / polygon.size());
    }

    private List<Point> parseRing(JsonNode ringNode) {
        List<Point> ring = new ArrayList<>();
        if (ringNode == null || !ringNode.isArray()) {
            return ring;
        }
        for (JsonNode point : ringNode) {
            if (point.size() < 2) {
                continue;
            }
            double lon = point.get(0).asDouble();
            double lat = point.get(1).asDouble();
            ring.add(new Point(lon, lat));
        }
        return ring;
    }

    private boolean isUpiKey(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        String lower = key.toLowerCase();
        return lower.equals("upi") || lower.contains("upi");
    }

    private String findPropertyValue(JsonNode properties, String keyLower) {
        java.util.Iterator<String> fields = properties.fieldNames();
        while (fields.hasNext()) {
            String field = fields.next();
            if (field != null && field.toLowerCase().equals(keyLower)) {
                return properties.path(field).asText("");
            }
        }
        return null;
    }

    private double metersForLon(double degrees, double latRef) {
        double metersPerLon = METERS_PER_DEG_LAT * Math.cos(Math.toRadians(latRef));
        return degrees * metersPerLon;
    }

    private double metersForLat(double degrees) {
        return degrees * METERS_PER_DEG_LAT;
    }

    public record Point(double lon, double lat) {}

    public record BoundingBox(double minLon, double minLat, double maxLon, double maxLat) {
        public BoundingBox merge(BoundingBox other) {
            return new BoundingBox(
                    Math.min(minLon, other.minLon),
                    Math.min(minLat, other.minLat),
                    Math.max(maxLon, other.maxLon),
                    Math.max(maxLat, other.maxLat)
            );
        }
    }

    public record GeoJsonMetrics(
            int featureCount,
            int polygonCount,
            double totalAreaSqm,
            double averageAreaSqm,
            double minAreaSqm,
            double maxAreaSqm,
            BoundingBox bounds,
            Point centroid
    ) {}

    public record UpiStats(
            String upiField,
            int featureCount,
            int upiFeatureCount,
            int uniqueUpiCount,
            int duplicateUpiCount,
            int missingUpiCount
    ) {}

    public record ParcelStats(
            double areaSqm,
            double widthMeters,
            double heightMeters,
            double aspectRatio
    ) {}
}
