package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import rw.venus.geosmartmanager.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryCollection;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class GeoJsonService {
    public record BoundingBox(double minX, double minY, double maxX, double maxY) {}

    public record PolygonalFeature(Geometry geometry, JsonNode properties) {}

    private final ObjectMapper objectMapper;
    private final GeometryFactory geometryFactory;

    public GeoJsonService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.geometryFactory = new GeometryFactory();
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

    public Geometry readFirstPolygonalGeometry(Path geoJsonPath) {
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

        return toGeometry(geom);
    }

    public List<PolygonalFeature> readPolygonalFeatures(Path geoJsonPath) {
        JsonNode root;
        try {
            root = objectMapper.readTree(Files.readAllBytes(geoJsonPath));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Unable to read GeoJSON file");
        }

        String type = root.path("type").asText("");
        List<PolygonalFeature> out = new ArrayList<>();

        if ("FeatureCollection".equals(type)) {
            JsonNode features = root.path("features");
            if (features.isArray()) {
                for (JsonNode f : features) {
                    JsonNode g = f.path("geometry");
                    if (!g.isObject()) {
                        continue;
                    }
                    try {
                        Geometry geom = toGeometry(g);
                        out.add(new PolygonalFeature(geom, f.path("properties")));
                    } catch (ApiException ignored) {
                        // Skip non-polygonal features for overlay workflows
                    }
                }
            }
        } else if ("Feature".equals(type)) {
            JsonNode g = root.path("geometry");
            if (g.isObject()) {
                Geometry geom = toGeometry(g);
                out.add(new PolygonalFeature(geom, root.path("properties")));
            }
        } else if (root.has("coordinates") && root.has("type")) {
            Geometry geom = toGeometry(root);
            out.add(new PolygonalFeature(geom, objectMapper.createObjectNode()));
        }

        if (out.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "No Polygon/MultiPolygon features found");
        }

        return out;
    }

    public Geometry toPolygonalGeometry(JsonNode geom) {
        if (geom == null || !geom.isObject()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "No geometry found");
        }
        return toGeometry(geom);
    }

    public ObjectNode buildStripSubdivision(Geometry boundary, int targetParcels) {
        if (boundary == null || boundary.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOMETRY", "Boundary geometry is empty");
        }
        if (targetParcels < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "targetParcels must be at least 2");
        }

        Envelope env = boundary.getEnvelopeInternal();
        if (env.getWidth() <= 0 || env.getHeight() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOMETRY", "Boundary geometry has a degenerate envelope");
        }

        boolean splitX = env.getWidth() >= env.getHeight();
        double span = splitX ? env.getWidth() : env.getHeight();
        double step = span / targetParcels;

        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        ArrayNode features = fc.putArray("features");

        for (int i = 0; i < targetParcels; i++) {
            double x0 = splitX ? env.getMinX() + (i * step) : env.getMinX();
            double x1 = splitX ? (i == targetParcels - 1 ? env.getMaxX() : env.getMinX() + ((i + 1) * step)) : env.getMaxX();
            double y0 = splitX ? env.getMinY() : env.getMinY() + (i * step);
            double y1 = splitX ? env.getMaxY() : (i == targetParcels - 1 ? env.getMaxY() : env.getMinY() + ((i + 1) * step));

            Polygon strip = rectPolygon(x0, y0, x1, y1);
            Geometry cut = boundary.intersection(strip);
            Geometry parcelGeom = extractPolygonal(cut);
            if (parcelGeom == null || parcelGeom.isEmpty()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "SUBDIVISION_EMPTY",
                        "Subdivision produced an empty parcel. Try a smaller parcel count or a different boundary."
                );
            }

            ObjectNode feature = features.addObject();
            feature.put("type", "Feature");
            ObjectNode props = feature.putObject("properties");
            props.put("parcelNo", i + 1);
            props.put("areaSqm", areaSqm(parcelGeom));
            feature.set("geometry", geometryToGeoJson(parcelGeom));
        }

        return fc;
    }

    public double areaSqm(Geometry geometry) {
        if (geometry == null || geometry.isEmpty()) {
            return Double.NaN;
        }

        if (geometry instanceof Polygon polygon) {
            return polygonAreaSqm(polygon);
        }

        if (geometry instanceof MultiPolygon multiPolygon) {
            double sum = 0;
            for (int i = 0; i < multiPolygon.getNumGeometries(); i++) {
                Geometry g = multiPolygon.getGeometryN(i);
                if (g instanceof Polygon p) {
                    sum += polygonAreaSqm(p);
                }
            }
            return sum;
        }

        if (geometry instanceof GeometryCollection gc) {
            double sum = 0;
            for (int i = 0; i < gc.getNumGeometries(); i++) {
                sum += areaSqm(gc.getGeometryN(i));
            }
            return sum;
        }

        return Double.NaN;
    }

    public double computeAreaSqm(JsonNode geometry) {
        if (geometry == null || !geometry.isObject()) {
            return Double.NaN;
        }

        String type = geometry.path("type").asText("");
        JsonNode coords = geometry.path("coordinates");
        if (!coords.isArray()) {
            return Double.NaN;
        }

        if ("Polygon".equals(type)) {
            return polygonCoordsAreaSqm(coords);
        }
        if ("MultiPolygon".equals(type)) {
            double sum = 0;
            for (JsonNode polyCoords : coords) {
                sum += polygonCoordsAreaSqm(polyCoords);
            }
            return sum;
        }

        return Double.NaN;
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

    private Geometry toGeometry(JsonNode geom) {
        String type = geom.path("type").asText("");
        JsonNode coords = geom.path("coordinates");
        if (!coords.isArray()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Invalid coordinates");
        }

        if ("Polygon".equals(type)) {
            return polygonFromCoords(coords);
        }
        if ("MultiPolygon".equals(type)) {
            List<Polygon> polygons = new ArrayList<>();
            for (JsonNode poly : coords) {
                polygons.add(polygonFromCoords(poly));
            }
            return geometryFactory.createMultiPolygon(polygons.toArray(new Polygon[0]));
        }

        throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_GEOMETRY", "Only Polygon/MultiPolygon supported");
    }

    private Polygon polygonFromCoords(JsonNode polygonCoords) {
        if (!polygonCoords.isArray() || polygonCoords.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Polygon ring not found");
        }

        LinearRing shell = linearRingFromNode(polygonCoords.path(0));
        List<LinearRing> holes = new ArrayList<>();
        for (int i = 1; i < polygonCoords.size(); i++) {
            holes.add(linearRingFromNode(polygonCoords.path(i)));
        }
        return geometryFactory.createPolygon(shell, holes.isEmpty() ? null : holes.toArray(new LinearRing[0]));
    }

    private LinearRing linearRingFromNode(JsonNode ringNode) {
        Coordinate[] coords = coordinatesFromNode(ringNode);
        if (coords.length < 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Polygon ring must have at least 4 points");
        }
        if (!coords[0].equals2D(coords[coords.length - 1])) {
            Coordinate[] closed = new Coordinate[coords.length + 1];
            System.arraycopy(coords, 0, closed, 0, coords.length);
            closed[closed.length - 1] = new Coordinate(coords[0]);
            coords = closed;
        }
        return geometryFactory.createLinearRing(coords);
    }

    private Coordinate[] coordinatesFromNode(JsonNode ringNode) {
        if (ringNode == null || !ringNode.isArray()) {
            return new Coordinate[0];
        }
        List<Coordinate> coords = new ArrayList<>();
        for (JsonNode pt : ringNode) {
            if (pt.isArray() && pt.size() >= 2) {
                coords.add(new Coordinate(pt.path(0).asDouble(), pt.path(1).asDouble()));
            }
        }
        return coords.toArray(new Coordinate[0]);
    }

    private Polygon rectPolygon(double x0, double y0, double x1, double y1) {
        double minX = Math.min(x0, x1);
        double maxX = Math.max(x0, x1);
        double minY = Math.min(y0, y1);
        double maxY = Math.max(y0, y1);
        Coordinate[] coords = new Coordinate[] {
                new Coordinate(minX, minY),
                new Coordinate(maxX, minY),
                new Coordinate(maxX, maxY),
                new Coordinate(minX, maxY),
                new Coordinate(minX, minY)
        };
        return geometryFactory.createPolygon(coords);
    }

    private Geometry extractPolygonal(Geometry geometry) {
        if (geometry == null || geometry.isEmpty()) {
            return geometryFactory.createGeometryCollection(new Geometry[0]);
        }

        if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
            return geometry;
        }

        List<Geometry> polys = new ArrayList<>();
        collectPolygonal(geometry, polys);
        if (polys.isEmpty()) {
            return geometryFactory.createGeometryCollection(new Geometry[0]);
        }

        Geometry merged = polys.get(0);
        for (int i = 1; i < polys.size(); i++) {
            merged = merged.union(polys.get(i));
        }
        return merged;
    }

    private void collectPolygonal(Geometry geometry, List<Geometry> out) {
        if (geometry == null || geometry.isEmpty()) {
            return;
        }
        if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
            out.add(geometry);
            return;
        }
        for (int i = 0; i < geometry.getNumGeometries(); i++) {
            collectPolygonal(geometry.getGeometryN(i), out);
        }
    }

    private ObjectNode geometryToGeoJson(Geometry geometry) {
        if (geometry == null || geometry.isEmpty()) {
            ObjectNode g = objectMapper.createObjectNode();
            g.put("type", "GeometryCollection");
            g.putArray("geometries");
            return g;
        }

        Geometry polygonal = (geometry instanceof Polygon || geometry instanceof MultiPolygon) ? geometry : extractPolygonal(geometry);
        if (polygonal instanceof Polygon polygon) {
            return polygonToGeoJson(polygon);
        }
        if (polygonal instanceof MultiPolygon multiPolygon) {
            return multiPolygonToGeoJson(multiPolygon);
        }

        ObjectNode g = objectMapper.createObjectNode();
        g.put("type", "GeometryCollection");
        g.putArray("geometries");
        return g;
    }

    private ObjectNode polygonToGeoJson(Polygon polygon) {
        ObjectNode g = objectMapper.createObjectNode();
        g.put("type", "Polygon");
        ArrayNode coords = g.putArray("coordinates");

        writeLinearRing(coords.addArray(), polygon.getExteriorRing().getCoordinates());
        for (int i = 0; i < polygon.getNumInteriorRing(); i++) {
            writeLinearRing(coords.addArray(), polygon.getInteriorRingN(i).getCoordinates());
        }

        return g;
    }

    private ObjectNode multiPolygonToGeoJson(MultiPolygon multiPolygon) {
        ObjectNode g = objectMapper.createObjectNode();
        g.put("type", "MultiPolygon");
        ArrayNode coords = g.putArray("coordinates");

        for (int i = 0; i < multiPolygon.getNumGeometries(); i++) {
            Geometry geom = multiPolygon.getGeometryN(i);
            if (geom instanceof Polygon p) {
                ArrayNode polyCoords = coords.addArray();
                writeLinearRing(polyCoords.addArray(), p.getExteriorRing().getCoordinates());
                for (int h = 0; h < p.getNumInteriorRing(); h++) {
                    writeLinearRing(polyCoords.addArray(), p.getInteriorRingN(h).getCoordinates());
                }
            }
        }

        return g;
    }

    private void writeLinearRing(ArrayNode ring, Coordinate[] coordinates) {
        for (Coordinate c : coordinates) {
            ArrayNode pt = ring.addArray();
            pt.add(c.getX());
            pt.add(c.getY());
        }
    }

    private double polygonAreaSqm(Polygon polygon) {
        if (polygon == null || polygon.isEmpty()) {
            return Double.NaN;
        }

        double midLat = polygon.getCentroid().getY();
        double metersPerDegLat = 111_320.0;
        double metersPerDegLon = 111_320.0 * Math.cos(Math.toRadians(midLat));

        double area = ringAreaSqm(polygon.getExteriorRing().getCoordinates(), metersPerDegLon, metersPerDegLat);
        for (int i = 0; i < polygon.getNumInteriorRing(); i++) {
            area -= ringAreaSqm(polygon.getInteriorRingN(i).getCoordinates(), metersPerDegLon, metersPerDegLat);
        }

        return Math.abs(area);
    }

    private double polygonCoordsAreaSqm(JsonNode polygonCoords) {
        if (polygonCoords == null || !polygonCoords.isArray() || polygonCoords.isEmpty()) {
            return Double.NaN;
        }

        JsonNode outer = polygonCoords.path(0);
        if (!outer.isArray() || outer.size() < 4) {
            return Double.NaN;
        }

        double midLat = 0;
        int count = 0;
        for (JsonNode pt : outer) {
            if (pt.isArray() && pt.size() >= 2) {
                midLat += pt.path(1).asDouble(0);
                count++;
            }
        }
        if (count == 0) {
            return Double.NaN;
        }
        midLat /= count;

        double metersPerDegLat = 111_320.0;
        double metersPerDegLon = 111_320.0 * Math.cos(Math.toRadians(midLat));

        double area = ringNodeAreaSqm(outer, metersPerDegLon, metersPerDegLat);
        for (int i = 1; i < polygonCoords.size(); i++) {
            area -= ringNodeAreaSqm(polygonCoords.get(i), metersPerDegLon, metersPerDegLat);
        }

        return Math.abs(area);
    }

    private double ringNodeAreaSqm(JsonNode ring, double metersPerDegLon, double metersPerDegLat) {
        if (ring == null || !ring.isArray() || ring.size() < 4) {
            return 0;
        }

        double sum = 0;
        for (int i = 0; i < ring.size() - 1; i++) {
            JsonNode a = ring.get(i);
            JsonNode b = ring.get(i + 1);
            if (!a.isArray() || !b.isArray() || a.size() < 2 || b.size() < 2) {
                continue;
            }
            double ax = a.path(0).asDouble(0) * metersPerDegLon;
            double ay = a.path(1).asDouble(0) * metersPerDegLat;
            double bx = b.path(0).asDouble(0) * metersPerDegLon;
            double by = b.path(1).asDouble(0) * metersPerDegLat;
            sum += (ax * by) - (bx * ay);
        }
        return sum / 2.0;
    }

    private double ringAreaSqm(Coordinate[] ring, double metersPerDegLon, double metersPerDegLat) {
        if (ring == null || ring.length < 4) {
            return 0;
        }

        double sum = 0;
        for (int i = 0; i < ring.length - 1; i++) {
            Coordinate a = ring[i];
            Coordinate b = ring[i + 1];
            double ax = a.getX() * metersPerDegLon;
            double ay = a.getY() * metersPerDegLat;
            double bx = b.getX() * metersPerDegLon;
            double by = b.getY() * metersPerDegLat;
            sum += (ax * by) - (bx * ay);
        }
        return sum / 2.0;
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
