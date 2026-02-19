package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.domain.SubdivisionStatus;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class SubdivisionService {
    private final ProjectRepository projectRepository;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;
    private final GeoJsonService geoJsonService;

    public SubdivisionService(ProjectRepository projectRepository,
                              DatasetRepository datasetRepository,
                              SubdivisionRunRepository subdivisionRunRepository,
                              ObjectMapper objectMapper,
                              AppProperties appProperties,
                              AuditService auditService,
                              CurrentUserService currentUserService,
                              GeoJsonService geoJsonService) {
        this.projectRepository = projectRepository;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.objectMapper = objectMapper;
        this.appProperties = appProperties;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
        this.geoJsonService = geoJsonService;
    }

    public SubdivisionRunEntity runSubdivision(Long projectId, SubdivisionDtos.RunSubdivisionRequest request) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        DatasetEntity dataset = datasetRepository.findById(request.datasetId())
                .orElseThrow(() -> new IllegalArgumentException("Dataset not found"));
        if (!dataset.getProject().getId().equals(project.getId())) {
            throw new IllegalArgumentException("Dataset does not belong to project");
        }

        SubdivisionOptimizationMode mode = request.optimizationMode() != null
                ? request.optimizationMode()
                : SubdivisionOptimizationMode.valueOf(appProperties.getAi().getDefaultOptimizationMode());

        BoundingBox box = parseBoundingBox(dataset.getGeoJson());
        double area = box.area();
        int parcels = request.parcelCount();
        double avgArea = parcels == 0 ? 0 : area / parcels;

        String resultGeoJson = buildSubdivisionGeoJson(box, parcels, avgArea, mode);

        double qualityScore = geoJsonService.computeCompactnessScore(resultGeoJson);
        SubdivisionRunEntity run = SubdivisionRunEntity.builder()
                .project(project)
                .dataset(dataset)
                .status(SubdivisionStatus.COMPLETED)
                .optimizationMode(mode)
                .parcelCount(parcels)
                .avgParcelAreaSqm(avgArea)
                .qualityScore(qualityScore)
                .resultGeoJson(resultGeoJson)
                .createdAt(Instant.now())
                .build();
        subdivisionRunRepository.save(run);
        auditService.log(currentUserService.getCurrentUserEmail(), "RUN", "Subdivision", run.getId(), "Subdivision completed");
        return run;
    }

    public java.util.List<SubdivisionRunEntity> listRuns(Long projectId) {
        return subdivisionRunRepository.findByProjectId(projectId);
    }

    public SubdivisionDtos.AiExplanation buildAiExplanation(SubdivisionRunEntity run) {
        double compactnessScore = clamp(run.getQualityScore(), 0, 100);
        List<List<GeoJsonService.Point>> polygons = geoJsonService.extractPolygons(run.getResultGeoJson());
        double areaUniformityScore = computeAreaUniformityScore(polygons);
        double roadAccessScore = estimateRoadAccessScore(run.getOptimizationMode(), run.getParcelCount());
        double complianceReadinessScore = clamp(
                (compactnessScore * 0.45) + (areaUniformityScore * 0.35) + (roadAccessScore * 0.20),
                0,
                100
        );

        String recommendation;
        if (complianceReadinessScore >= 80) {
            recommendation = "Ready for compliance submission";
        } else if (complianceReadinessScore >= 60) {
            recommendation = "Review parcel geometry and rerun if stricter compliance is required";
        } else {
            recommendation = "Rerun with adjusted parcel count or optimization mode";
        }

        String rationale = "Readiness combines compactness, area uniformity, and inferred road access efficiency.";
        return new SubdivisionDtos.AiExplanation(
                compactnessScore,
                areaUniformityScore,
                roadAccessScore,
                complianceReadinessScore,
                recommendation,
                rationale
        );
    }

    private BoundingBox parseBoundingBox(String geoJson) {
        try {
            JsonNode root = objectMapper.readTree(geoJson);
            JsonNode coordsNode = null;
            String type = root.path("type").asText();
            if ("FeatureCollection".equalsIgnoreCase(type)) {
                coordsNode = root.path("features").get(0).path("geometry").path("coordinates");
            } else if ("Feature".equalsIgnoreCase(type)) {
                coordsNode = root.path("geometry").path("coordinates");
            } else if ("Polygon".equalsIgnoreCase(type)) {
                coordsNode = root.path("coordinates");
            }

            if (coordsNode == null || !coordsNode.isArray() || coordsNode.size() == 0) {
                return BoundingBox.defaultBox();
            }

            JsonNode ring = coordsNode.get(0);
            double minX = Double.POSITIVE_INFINITY;
            double minY = Double.POSITIVE_INFINITY;
            double maxX = Double.NEGATIVE_INFINITY;
            double maxY = Double.NEGATIVE_INFINITY;

            for (JsonNode point : ring) {
                double x = point.get(0).asDouble();
                double y = point.get(1).asDouble();
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }

            if (Double.isInfinite(minX) || Double.isInfinite(minY)) {
                return BoundingBox.defaultBox();
            }

            return new BoundingBox(minX, minY, maxX, maxY);
        } catch (Exception ex) {
            return BoundingBox.defaultBox();
        }
    }

    private String buildSubdivisionGeoJson(BoundingBox box, int parcels, double avgArea, SubdivisionOptimizationMode mode) {
        int cols;
        int rows;
        if (mode == SubdivisionOptimizationMode.MINIMIZE_ROADS) {
            rows = 1;
            cols = parcels;
        } else if (mode == SubdivisionOptimizationMode.MAXIMIZE_AREA) {
            cols = 1;
            rows = parcels;
        } else {
            cols = (int) Math.ceil(Math.sqrt(parcels));
            rows = (int) Math.ceil((double) parcels / cols);
        }
        double width = (box.maxX - box.minX) / cols;
        double height = (box.maxY - box.minY) / rows;

        ObjectNode collection = objectMapper.createObjectNode();
        collection.put("type", "FeatureCollection");
        ArrayNode features = objectMapper.createArrayNode();

        int count = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (count >= parcels) {
                    break;
                }
                double x0 = box.minX + c * width;
                double y0 = box.minY + r * height;
                double x1 = x0 + width;
                double y1 = y0 + height;

                ObjectNode feature = objectMapper.createObjectNode();
                feature.put("type", "Feature");
                ObjectNode props = objectMapper.createObjectNode();
                props.put("parcel", count + 1);
                props.put("avgAreaSqm", avgArea);
                feature.set("properties", props);

                ObjectNode geometry = objectMapper.createObjectNode();
                geometry.put("type", "Polygon");
                ArrayNode coords = objectMapper.createArrayNode();
                ArrayNode ring = objectMapper.createArrayNode();
                ring.add(point(x0, y0));
                ring.add(point(x0, y1));
                ring.add(point(x1, y1));
                ring.add(point(x1, y0));
                ring.add(point(x0, y0));
                coords.add(ring);
                geometry.set("coordinates", coords);
                feature.set("geometry", geometry);

                features.add(feature);
                count++;
            }
        }

        collection.set("features", features);
        return collection.toString();
    }

    private ArrayNode point(double x, double y) {
        ArrayNode node = objectMapper.createArrayNode();
        node.add(x);
        node.add(y);
        return node;
    }

    private double computeAreaUniformityScore(List<List<GeoJsonService.Point>> polygons) {
        if (polygons == null || polygons.isEmpty()) {
            return 0;
        }

        List<Double> areas = new ArrayList<>();
        for (List<GeoJsonService.Point> polygon : polygons) {
            double area = geoJsonService.computeAreaSqm(polygon);
            if (area > 0) {
                areas.add(area);
            }
        }

        if (areas.isEmpty()) {
            return 0;
        }

        double mean = areas.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        if (mean <= 0) {
            return 0;
        }

        double variance = areas.stream()
                .mapToDouble(area -> Math.pow(area - mean, 2))
                .average()
                .orElse(0);
        double stdDev = Math.sqrt(variance);
        double coefficientOfVariation = stdDev / mean;
        return clamp(100 - (coefficientOfVariation * 100), 0, 100);
    }

    private double estimateRoadAccessScore(SubdivisionOptimizationMode mode, int parcelCount) {
        double base = switch (mode) {
            case MINIMIZE_ROADS -> 88;
            case BALANCED -> 78;
            case MAXIMIZE_AREA -> 68;
        };
        double adjustment = parcelCount <= 8 ? 6 : (parcelCount <= 16 ? 0 : -8);
        return clamp(base + adjustment, 0, 100);
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private record BoundingBox(double minX, double minY, double maxX, double maxY) {
        double area() {
            return Math.max(0, (maxX - minX) * (maxY - minY));
        }

        static BoundingBox defaultBox() {
            return new BoundingBox(0, 0, 100, 100);
        }
    }
}
