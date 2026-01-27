package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

@Service
public class GeospatialImportService {
    private final ObjectMapper objectMapper;

    public GeospatialImportService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public byte[] tryConvertToGeoJsonPreview(String format, InputStream inputStream) {
        if (format == null || inputStream == null) {
            return null;
        }

        try {
            return switch (format.toUpperCase(Locale.ROOT)) {
                case "KML" -> convertKmlToGeoJson(inputStream);
                case "KMZ" -> convertKmzToGeoJson(inputStream);
                case "GPX" -> convertGpxToGeoJson(inputStream);
                case "CSV" -> convertCsvToGeoJson(inputStream);
                default -> null;
            };
        } catch (Exception ex) {
            return null;
        }
    }

    private byte[] convertKmzToGeoJson(InputStream kmzInput) throws Exception {
        try (ZipInputStream zis = new ZipInputStream(kmzInput)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }
                String name = entry.getName() == null ? "" : entry.getName().toLowerCase(Locale.ROOT);
                if (name.endsWith(".kml")) {
                    byte[] kmlBytes = zis.readAllBytes();
                    return convertKmlToGeoJson(new ByteArrayInputStream(kmlBytes));
                }
            }
        }
        return null;
    }

    private byte[] convertKmlToGeoJson(InputStream kmlInput) throws Exception {
        Document doc = parseXml(kmlInput);
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        ArrayNode features = fc.putArray("features");

        NodeList placemarks = doc.getElementsByTagNameNS("*", "Placemark");
        for (int i = 0; i < placemarks.getLength(); i++) {
            Node node = placemarks.item(i);
            if (!(node instanceof Element placemark)) {
                continue;
            }

            String name = textOfFirst(placemark, "name");
            if (name == null || name.isBlank()) {
                name = "Placemark " + (i + 1);
            }

            List<List<double[]>> polygons = extractKmlPolygons(placemark);
            if (!polygons.isEmpty()) {
                ObjectNode geom = objectMapper.createObjectNode();
                if (polygons.size() == 1) {
                    geom.put("type", "Polygon");
                    ArrayNode coords = geom.putArray("coordinates");
                    coords.add(ringToJson(polygons.get(0)));
                } else {
                    geom.put("type", "MultiPolygon");
                    ArrayNode coords = geom.putArray("coordinates");
                    for (List<double[]> ring : polygons) {
                        ArrayNode poly = coords.addArray();
                        poly.add(ringToJson(ring));
                    }
                }
                addFeature(features, geom, Map.of("name", name));
                continue;
            }

            List<double[]> line = extractKmlLineString(placemark);
            if (!line.isEmpty()) {
                ObjectNode geom = objectMapper.createObjectNode();
                geom.put("type", "LineString");
                geom.set("coordinates", pointsToJson(line));
                addFeature(features, geom, Map.of("name", name));
                continue;
            }

            double[] point = extractKmlPoint(placemark);
            if (point != null) {
                ObjectNode geom = objectMapper.createObjectNode();
                geom.put("type", "Point");
                ArrayNode coords = geom.putArray("coordinates");
                coords.add(point[0]);
                coords.add(point[1]);
                addFeature(features, geom, Map.of("name", name));
            }
        }

        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(fc);
    }

    private byte[] convertGpxToGeoJson(InputStream gpxInput) throws Exception {
        Document doc = parseXml(gpxInput);
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        ArrayNode features = fc.putArray("features");

        NodeList wpts = doc.getElementsByTagNameNS("*", "wpt");
        for (int i = 0; i < wpts.getLength(); i++) {
            Node node = wpts.item(i);
            if (!(node instanceof Element wpt)) continue;
            Double lat = parseDoubleAttr(wpt, "lat");
            Double lon = parseDoubleAttr(wpt, "lon");
            if (lat == null || lon == null) continue;
            String name = textOfFirst(wpt, "name");
            ObjectNode geom = objectMapper.createObjectNode();
            geom.put("type", "Point");
            ArrayNode coords = geom.putArray("coordinates");
            coords.add(lon);
            coords.add(lat);
            Map<String, Object> props = new LinkedHashMap<>();
            if (name != null && !name.isBlank()) props.put("name", name);
            addFeature(features, geom, props);
        }

        NodeList trks = doc.getElementsByTagNameNS("*", "trk");
        for (int i = 0; i < trks.getLength(); i++) {
            Node node = trks.item(i);
            if (!(node instanceof Element trk)) continue;
            String name = textOfFirst(trk, "name");

            NodeList segs = trk.getElementsByTagNameNS("*", "trkseg");
            for (int s = 0; s < segs.getLength(); s++) {
                Node segNode = segs.item(s);
                if (!(segNode instanceof Element seg)) continue;
                NodeList pts = seg.getElementsByTagNameNS("*", "trkpt");
                List<double[]> line = new ArrayList<>();
                for (int p = 0; p < pts.getLength(); p++) {
                    Node ptNode = pts.item(p);
                    if (!(ptNode instanceof Element pt)) continue;
                    Double lat = parseDoubleAttr(pt, "lat");
                    Double lon = parseDoubleAttr(pt, "lon");
                    if (lat == null || lon == null) continue;
                    line.add(new double[] { lon, lat });
                }
                if (line.size() < 2) continue;
                ObjectNode geom = objectMapper.createObjectNode();
                geom.put("type", "LineString");
                geom.set("coordinates", pointsToJson(line));
                Map<String, Object> props = new LinkedHashMap<>();
                if (name != null && !name.isBlank()) props.put("name", name);
                props.put("segment", s + 1);
                addFeature(features, geom, props);
            }
        }

        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(fc);
    }

    private byte[] convertCsvToGeoJson(InputStream csvInput) throws IOException {
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        ArrayNode features = fc.putArray("features");

        try (BufferedReader br = new BufferedReader(new InputStreamReader(csvInput, StandardCharsets.UTF_8))) {
            String headerLine = br.readLine();
            if (headerLine == null) {
                return objectMapper.writeValueAsBytes(fc);
            }
            String[] headers = splitCsvLine(headerLine);
            Map<String, Integer> idx = new LinkedHashMap<>();
            for (int i = 0; i < headers.length; i++) {
                idx.put(headers[i].trim().toLowerCase(Locale.ROOT), i);
            }

            Integer latIdx = firstIndex(idx, List.of("lat", "latitude", "y"));
            Integer lonIdx = firstIndex(idx, List.of("lon", "lng", "longitude", "x"));
            if (latIdx == null || lonIdx == null) {
                return objectMapper.writeValueAsBytes(fc);
            }

            String line;
            int row = 0;
            while ((line = br.readLine()) != null) {
                row++;
                String[] cols = splitCsvLine(line);
                if (cols.length <= Math.max(latIdx, lonIdx)) continue;
                Double lat = parseDouble(cols[latIdx]);
                Double lon = parseDouble(cols[lonIdx]);
                if (lat == null || lon == null) continue;

                ObjectNode geom = objectMapper.createObjectNode();
                geom.put("type", "Point");
                ArrayNode coords = geom.putArray("coordinates");
                coords.add(lon);
                coords.add(lat);

                Map<String, Object> props = new LinkedHashMap<>();
                props.put("row", row);
                for (var e : idx.entrySet()) {
                    int i = e.getValue();
                    if (i >= cols.length) continue;
                    String key = e.getKey();
                    if (key.equals("lat") || key.equals("latitude") || key.equals("y") || key.equals("lon") || key.equals("lng") || key.equals("longitude") || key.equals("x")) {
                        continue;
                    }
                    props.put(key, cols[i]);
                }

                addFeature(features, geom, props);
            }
        }

        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(fc);
    }

    private Document parseXml(InputStream in) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setNamespaceAware(true);

        trySetFeature(dbf, "http://apache.org/xml/features/disallow-doctype-decl", true);
        trySetFeature(dbf, "http://xml.org/sax/features/external-general-entities", false);
        trySetFeature(dbf, "http://xml.org/sax/features/external-parameter-entities", false);
        dbf.setXIncludeAware(false);
        dbf.setExpandEntityReferences(false);

        DocumentBuilder builder = dbf.newDocumentBuilder();
        return builder.parse(in);
    }

    private void trySetFeature(DocumentBuilderFactory dbf, String feature, boolean value) {
        try {
            dbf.setFeature(feature, value);
        } catch (Exception ignored) {
            // best effort
        }
    }

    private void addFeature(ArrayNode features, ObjectNode geometry, Map<String, Object> properties) {
        ObjectNode f = features.addObject();
        f.put("type", "Feature");
        f.set("geometry", geometry);
        ObjectNode propsNode = objectMapper.createObjectNode();
        if (properties != null) {
            for (var e : properties.entrySet()) {
                Object v = e.getValue();
                if (v == null) {
                    propsNode.putNull(e.getKey());
                } else if (v instanceof Number n) {
                    propsNode.put(e.getKey(), n.doubleValue());
                } else if (v instanceof Boolean b) {
                    propsNode.put(e.getKey(), b);
                } else {
                    propsNode.put(e.getKey(), String.valueOf(v));
                }
            }
        }
        f.set("properties", propsNode);
    }

    private List<List<double[]>> extractKmlPolygons(Element placemark) {
        List<List<double[]>> rings = new ArrayList<>();
        NodeList polygons = placemark.getElementsByTagNameNS("*", "Polygon");
        for (int i = 0; i < polygons.getLength(); i++) {
            Node node = polygons.item(i);
            if (!(node instanceof Element poly)) continue;
            NodeList coords = poly.getElementsByTagNameNS("*", "coordinates");
            if (coords.getLength() == 0) continue;
            String coordText = coords.item(0).getTextContent();
            List<double[]> ring = parseKmlCoordinates(coordText);
            ring = ensureClosedRing(ring);
            if (ring.size() >= 4) {
                rings.add(ring);
            }
        }
        return rings;
    }

    private List<double[]> extractKmlLineString(Element placemark) {
        NodeList lines = placemark.getElementsByTagNameNS("*", "LineString");
        if (lines.getLength() == 0) return List.of();
        Node node = lines.item(0);
        if (!(node instanceof Element line)) return List.of();
        NodeList coords = line.getElementsByTagNameNS("*", "coordinates");
        if (coords.getLength() == 0) return List.of();
        return parseKmlCoordinates(coords.item(0).getTextContent());
    }

    private double[] extractKmlPoint(Element placemark) {
        NodeList points = placemark.getElementsByTagNameNS("*", "Point");
        if (points.getLength() == 0) return null;
        Node node = points.item(0);
        if (!(node instanceof Element pt)) return null;
        NodeList coords = pt.getElementsByTagNameNS("*", "coordinates");
        if (coords.getLength() == 0) return null;
        List<double[]> pts = parseKmlCoordinates(coords.item(0).getTextContent());
        if (pts.isEmpty()) return null;
        return pts.get(0);
    }

    private List<double[]> parseKmlCoordinates(String raw) {
        if (raw == null) return List.of();
        String[] parts = raw.trim().split("\\s+");
        List<double[]> pts = new ArrayList<>();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            String[] vals = p.trim().split(",");
            if (vals.length < 2) continue;
            Double lon = parseDouble(vals[0]);
            Double lat = parseDouble(vals[1]);
            if (lon == null || lat == null) continue;
            pts.add(new double[] { lon, lat });
        }
        return pts;
    }

    private List<double[]> ensureClosedRing(List<double[]> ring) {
        if (ring == null || ring.size() < 3) return ring == null ? List.of() : ring;
        double[] first = ring.get(0);
        double[] last = ring.get(ring.size() - 1);
        if (first.length >= 2 && last.length >= 2 && (first[0] != last[0] || first[1] != last[1])) {
            List<double[]> copy = new ArrayList<>(ring);
            copy.add(new double[] { first[0], first[1] });
            return copy;
        }
        return ring;
    }

    private ArrayNode ringToJson(List<double[]> ring) {
        ArrayNode arr = objectMapper.createArrayNode();
        arr.addAll(pointsToJson(ring));
        return arr;
    }

    private ArrayNode pointsToJson(List<double[]> pts) {
        ArrayNode coords = objectMapper.createArrayNode();
        for (double[] pt : pts) {
            if (pt == null || pt.length < 2) continue;
            ArrayNode p = coords.addArray();
            p.add(pt[0]);
            p.add(pt[1]);
        }
        return coords;
    }

    private String textOfFirst(Element parent, String localName) {
        NodeList nl = parent.getElementsByTagNameNS("*", localName);
        if (nl.getLength() == 0) {
            nl = parent.getElementsByTagName(localName);
        }
        if (nl.getLength() == 0) return null;
        String t = nl.item(0).getTextContent();
        return t == null ? null : t.trim();
    }

    private Double parseDoubleAttr(Element el, String attr) {
        if (el == null || !el.hasAttribute(attr)) return null;
        return parseDouble(el.getAttribute(attr));
    }

    private Double parseDouble(String s) {
        if (s == null) return null;
        try {
            return Double.parseDouble(s.trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private String[] splitCsvLine(String line) {
        if (line == null) return new String[0];
        return line.split(",", -1);
    }

    private Integer firstIndex(Map<String, Integer> idx, List<String> keys) {
        for (String k : keys) {
            Integer v = idx.get(k);
            if (v != null) return v;
        }
        return null;
    }
}
