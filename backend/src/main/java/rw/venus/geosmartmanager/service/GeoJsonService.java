package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import rw.venus.geosmartmanager.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class GeoJsonService {
    public record BoundingBox(double minX, double minY, double maxX, double maxY) {}

    private final ObjectMapper objectMapper;

    public GeoJsonService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public BoundingBox findFirstPolygonBBox(Path geoJsonPath) {
        JsonNode root;
        try {
            root = objectMapper.readTree(Files.readAllBytes(geoJsonPath));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Unable to read GeoJSON file");
        }

        JsonNode geom = findFirstGeometryNode(root);
        if (geom == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "No geometry found in GeoJSON");
        }

        String type = geom.path("type").asText("");
        JsonNode coords = geom.path("coordinates");
        if (!coords.isArray()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Invalid coordinates");
        }

        ArrayNode ring = null;
        if ("Polygon".equals(type)) {
            JsonNode ringNode = coords.path(0);
            if (!ringNode.isArray()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Polygon ring not found");
            }
            ring = (ArrayNode) ringNode;
        } else if ("MultiPolygon".equals(type)) {
            JsonNode ringNode = coords.path(0).path(0);
            if (!ringNode.isArray()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Polygon ring not found");
            }
            ring = (ArrayNode) ringNode;
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_GEOMETRY", "Only Polygon/MultiPolygon supported");
        }

        if (ring == null || ring.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Polygon ring not found");
        }

        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;

        for (JsonNode pt : ring) {
            if (!pt.isArray() || pt.size() < 2) {
                continue;
            }
            double x = pt.path(0).asDouble();
            double y = pt.path(1).asDouble();
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        if (!Double.isFinite(minX) || !Double.isFinite(minY) || !Double.isFinite(maxX) || !Double.isFinite(maxY)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Unable to compute bounding box");
        }

        if (maxX <= minX || maxY <= minY) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Bounding box is degenerate");
        }

        return new BoundingBox(minX, minY, maxX, maxY);
    }

    public ObjectNode buildRectSubdivision(BoundingBox bbox, int targetParcels) {
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        ArrayNode features = fc.putArray("features");

        double width = (bbox.maxX - bbox.minX) / targetParcels;
        for (int i = 0; i < targetParcels; i++) {
            double x0 = bbox.minX + (i * width);
            double x1 = (i == targetParcels - 1) ? bbox.maxX : (bbox.minX + ((i + 1) * width));

            double midLat = (bbox.minY + bbox.maxY) / 2.0;
            double areaSqm = rectAreaSqm(x0, bbox.minY, x1, bbox.maxY, midLat);

            ObjectNode feature = features.addObject();
            feature.put("type", "Feature");
            ObjectNode props = feature.putObject("properties");
            props.put("parcelNo", i + 1);
            props.put("areaSqm", areaSqm);

            ObjectNode geom = feature.putObject("geometry");
            geom.put("type", "Polygon");
            ArrayNode coordinates = geom.putArray("coordinates");
            ArrayNode ring = coordinates.addArray();
            addPoint(ring, x0, bbox.minY);
            addPoint(ring, x1, bbox.minY);
            addPoint(ring, x1, bbox.maxY);
            addPoint(ring, x0, bbox.maxY);
            addPoint(ring, x0, bbox.minY);
        }

        return fc;
    }

    private void addPoint(ArrayNode ring, double x, double y) {
        ArrayNode pt = ring.addArray();
        pt.add(x);
        pt.add(y);
    }

    private double rectAreaSqm(double x0, double y0, double x1, double y1, double midLat) {
        double metersPerDegLat = 111_320.0;
        double metersPerDegLon = 111_320.0 * Math.cos(Math.toRadians(midLat));
        double w = Math.abs(x1 - x0) * metersPerDegLon;
        double h = Math.abs(y1 - y0) * metersPerDegLat;
        return w * h;
    }

    private JsonNode findFirstGeometryNode(JsonNode root) {
        String type = root.path("type").asText("");
        if ("FeatureCollection".equals(type)) {
            JsonNode features = root.path("features");
            if (features.isArray()) {
                for (JsonNode f : features) {
                    JsonNode g = f.path("geometry");
                    if (g.isObject()) {
                        return g;
                    }
                }
            }
        }

        if ("Feature".equals(type)) {
            JsonNode g = root.path("geometry");
            if (g.isObject()) {
                return g;
            }
        }

        if (root.has("coordinates") && root.has("type")) {
            return root;
        }

        Iterator<String> fieldNames = root.fieldNames();
        while (fieldNames.hasNext()) {
            String fn = fieldNames.next();
            JsonNode v = root.get(fn);
            if (v != null && v.isObject()) {
                JsonNode found = findFirstGeometryNode(v);
                if (found != null) {
                    return found;
                }
            }
        }

        return null;
    }
}
