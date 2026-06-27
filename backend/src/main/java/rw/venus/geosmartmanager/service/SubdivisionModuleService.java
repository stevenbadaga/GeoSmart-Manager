package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygonal;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.domain.DatasetSourceFormat;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.domain.SubdivisionStatus;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class SubdivisionModuleService {
    private static final String PARCELS = "PARCELS";
    private static final String ZONING = "ZONING";
    private static final String ROADS = "ROADS";
    private static final String ADMIN_BOUNDARIES = "ADMIN_BOUNDARIES";
    private static final String CONSTRAINTS = "CONSTRAINTS";
    private static final double METERS_PER_DEGREE = 111320d;
    private static final double DEFAULT_AREA_TOLERANCE_SQM = 5d;
    private static final double INTERSECTION_TOLERANCE_SQM = 0.25d;
    private static final double TOUCH_TOLERANCE_DEGREES = 0.000003d;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final ProjectService projectService;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;
    private final GeoJsonService geoJsonService;
    private final GeoJsonReader geoJsonReader;

    public SubdivisionModuleService(ProjectService projectService,
                                    DatasetRepository datasetRepository,
                                    SubdivisionRunRepository subdivisionRunRepository,
                                    ObjectMapper objectMapper,
                                    AuditService auditService,
                                    CurrentUserService currentUserService,
                                    GeoJsonService geoJsonService) {
        this.projectService = projectService;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
        this.geoJsonService = geoJsonService;
        this.geoJsonReader = new GeoJsonReader(new GeometryFactory());
    }

    public SubdivisionDtos.DemoBundleResponse getDemoBundle(Long projectId) {
        ProjectEntity project = projectService.getProject(projectId);
        LayerBundle bundle = ensureDemoLayers(project);

        List<FeatureRecord> parcelFeatures = parseFeatures(bundle.parcels().getGeoJson());
        List<FeatureRecord> zoningFeatures = parseFeatures(bundle.zoning().getGeoJson());
        List<SubdivisionDtos.ParentParcelResponse> parentParcels = parcelFeatures.stream()
                .map(parcel -> toParentParcel(parcel, zoningFeatures))
                .sorted(Comparator.comparing(SubdivisionDtos.ParentParcelResponse::upi))
                .toList();

        List<SubdivisionDtos.DemoLayerResponse> layerResponses = List.of(
                toDemoLayer(bundle.parcels(), PARCELS),
                toDemoLayer(bundle.zoning(), ZONING),
                toDemoLayer(bundle.roads(), ROADS),
                toDemoLayer(bundle.adminBoundaries(), ADMIN_BOUNDARIES),
                toDemoLayer(bundle.constraints(), CONSTRAINTS)
        );

        return new SubdivisionDtos.DemoBundleResponse(
                projectId,
                layerResponses,
                parentParcels,
                List.of("GEOJSON", "SHAPEFILE", "GEOPACKAGE"),
                MockSubdivisionLayerFactory.sampleProposalGeoJson()
        );
    }

    public SubdivisionRunEntity validateSubdivision(Long projectId, SubdivisionDtos.ValidateSubdivisionRequest request) {
        ProjectEntity project = projectService.getProject(projectId);
        LayerBundle bundle = ensureDemoLayers(project);

        List<FeatureRecord> parcelFeatures = parseFeatures(bundle.parcels().getGeoJson());
        FeatureRecord parentParcel = parcelFeatures.stream()
                .filter(feature -> request.parentUpi().equalsIgnoreCase(stringValue(feature.properties(), "upi")))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Parent parcel not found for UPI " + request.parentUpi()));

        List<FeatureRecord> zoningFeatures = parseFeatures(bundle.zoning().getGeoJson());
        ZoningRuleSet zoningRuleSet = resolveZoning(parentParcel.geometry(), zoningFeatures)
                .orElseThrow(() -> new IllegalArgumentException("No zoning rule found for selected parent parcel"));

        ProposalGeometry proposal = parseProposal(request.proposalGeoJson());
        if (proposal.plots().isEmpty()) {
            throw new IllegalArgumentException("Proposal must include at least one polygon plot.");
        }

        List<RoadReserve> roadReserves = buildRoadReserves(parseFeatures(bundle.roads().getGeoJson()));
        List<ConstraintGeometry> constraints = buildConstraintGeometries(parseFeatures(bundle.constraints().getGeoJson()), roadReserves);
        List<Geometry> connectedServitudes = proposal.servitudes().stream()
                .filter(servitude -> touchesAny(servitude.geometry(), roadReserves.stream().map(RoadReserve::reserveGeometry).toList()))
                .map(ProposalFeature::geometry)
                .toList();

        Geometry parentGeometry = parentParcel.geometry();
        double parentAreaSqm = areaSqm(parentGeometry);
        double proposedAreaSqm = proposal.plots().stream().mapToDouble(plot -> areaSqm(plot.geometry())).sum();
        double areaToleranceSqm = request.areaToleranceSqm() != null && request.areaToleranceSqm() > 0
                ? request.areaToleranceSqm()
                : DEFAULT_AREA_TOLERANCE_SQM;
        double areaDeltaSqm = Math.abs(parentAreaSqm - proposedAreaSqm);

        boolean insideParentPass = true;
        boolean minPlotSizePass = true;
        boolean roadAccessPass = true;
        boolean constraintPass = true;
        boolean plotOverlapPass = true;

        List<SubdivisionDtos.PlotValidationResult> plotResults = new ArrayList<>();
        for (int i = 0; i < proposal.plots().size(); i++) {
            ProposalFeature plot = proposal.plots().get(i);
            boolean insideParent = parentGeometry.buffer(TOUCH_TOLERANCE_DEGREES).covers(plot.geometry());
            boolean minSize = areaSqm(plot.geometry()) >= zoningRuleSet.minimumPlotSizeSqm();
            boolean hasRoadAccess = touchesAny(plot.geometry().getBoundary().buffer(TOUCH_TOLERANCE_DEGREES),
                    roadReserves.stream().map(RoadReserve::reserveGeometry).toList())
                    || touchesAny(plot.geometry().getBoundary().buffer(TOUCH_TOLERANCE_DEGREES), connectedServitudes);
            List<String> overlaps = findConstraintOverlaps(plot.geometry(), constraints);

            insideParentPass &= insideParent;
            minPlotSizePass &= minSize;
            roadAccessPass &= hasRoadAccess;
            constraintPass &= overlaps.isEmpty();

            String plotStatus = insideParent && minSize && hasRoadAccess && overlaps.isEmpty() ? "PASS" : "FAIL";
            plotResults.add(new SubdivisionDtos.PlotValidationResult(
                    i + 1,
                    plot.featureId(),
                    areaSqm(plot.geometry()),
                    insideParent,
                    minSize,
                    hasRoadAccess,
                    overlaps,
                    plotStatus
            ));
        }

        for (int i = 0; i < proposal.plots().size(); i++) {
            for (int j = i + 1; j < proposal.plots().size(); j++) {
                Geometry intersection = proposal.plots().get(i).geometry().intersection(proposal.plots().get(j).geometry());
                if (!intersection.isEmpty() && areaSqm(intersection) > INTERSECTION_TOLERANCE_SQM) {
                    plotOverlapPass = false;
                    break;
                }
            }
            if (!plotOverlapPass) {
                break;
            }
        }

        boolean landUsePass = zoningRuleSet.allowedLandUses().stream()
                .map(value -> value.toUpperCase(Locale.ROOT))
                .toList()
                .contains(request.proposedLandUse().toUpperCase(Locale.ROOT));
        boolean areaPass = areaDeltaSqm <= areaToleranceSqm;

        List<SubdivisionDtos.RuleValidationResult> ruleResults = List.of(
                new SubdivisionDtos.RuleValidationResult(
                        "INSIDE_PARENT",
                        "All proposed plots are inside the parent parcel",
                        insideParentPass ? "PASS" : "FAIL",
                        insideParentPass
                                ? "All proposal polygons remain within the selected parent parcel."
                                : "One or more proposal polygons extend beyond the selected parent parcel."
                ),
                new SubdivisionDtos.RuleValidationResult(
                        "AREA_BALANCE",
                        "Total proposed area matches the parent parcel area",
                        areaPass ? "PASS" : "FAIL",
                        "Parent area " + format(parentAreaSqm) + " sqm versus proposed total " + format(proposedAreaSqm)
                                + " sqm (delta " + format(areaDeltaSqm) + " sqm; tolerance " + format(areaToleranceSqm) + " sqm)."
                ),
                new SubdivisionDtos.RuleValidationResult(
                        "MIN_PLOT_SIZE",
                        "Each plot meets the zoning minimum plot size",
                        minPlotSizePass ? "PASS" : "FAIL",
                        "Applicable zone " + zoningRuleSet.zoneCode() + " requires minimum plot size of "
                                + format(zoningRuleSet.minimumPlotSizeSqm()) + " sqm."
                ),
                new SubdivisionDtos.RuleValidationResult(
                        "ROAD_ACCESS",
                        "Each plot has road access or connected access servitude",
                        roadAccessPass ? "PASS" : "FAIL",
                        roadAccessPass
                                ? "Every plot touches a road edge or a servitude connected to a road reserve."
                                : "At least one plot has no direct road frontage and no connected servitude."
                ),
                new SubdivisionDtos.RuleValidationResult(
                        "CONSTRAINT_OVERLAP",
                        "No plot overlaps wetlands, river buffers, protected areas, road reserves, or other restricted zones",
                        constraintPass ? "PASS" : "FAIL",
                        constraintPass
                                ? "No restricted overlap was detected."
                                : "At least one plot intersects a restricted constraint layer."
                ),
                new SubdivisionDtos.RuleValidationResult(
                        "LAND_USE_MATCH",
                        "Proposed land use matches the applicable zoning rule",
                        landUsePass ? "PASS" : "FAIL",
                        "Zone " + zoningRuleSet.zoneCode() + " allows " + String.join(", ", zoningRuleSet.allowedLandUses())
                                + "; requested use is " + request.proposedLandUse() + "."
                ),
                new SubdivisionDtos.RuleValidationResult(
                        "PLOT_OVERLAP",
                        "Proposed plots do not overlap each other",
                        plotOverlapPass ? "PASS" : "FAIL",
                        plotOverlapPass
                                ? "No overlapping plot areas were detected."
                                : "One or more proposal polygons overlap each other."
                )
        );

        String overallStatus = ruleResults.stream().allMatch(rule -> "PASS".equals(rule.status())) ? "PASS" : "FAIL";
        SubdivisionDtos.ValidationSummary summary = new SubdivisionDtos.ValidationSummary(
                overallStatus,
                proposal.plots().size(),
                parentAreaSqm,
                proposedAreaSqm,
                areaDeltaSqm,
                areaToleranceSqm,
                toZoningRule(zoningRuleSet),
                ruleResults,
                plotResults
        );

        double complianceScore = clamp(ruleResults.stream().filter(rule -> "PASS".equals(rule.status())).count() * 100d / ruleResults.size(), 0, 100);
        double compactnessScore = geoJsonService.computeCompactnessScore(request.proposalGeoJson());
        double qualityScore = clamp((complianceScore * 0.65) + (compactnessScore * 0.35), 0, 100);

        SubdivisionRunEntity entity = SubdivisionRunEntity.builder()
                .project(project)
                .dataset(bundle.parcels())
                .status(SubdivisionStatus.COMPLETED)
                .optimizationMode(SubdivisionOptimizationMode.BALANCED)
                .parcelCount(proposal.plots().size())
                .avgParcelAreaSqm(proposedAreaSqm / proposal.plots().size())
                .qualityScore(qualityScore)
                .resultGeoJson(request.proposalGeoJson())
                .parentUpi(request.parentUpi())
                .parentParcelGeoJson(serializeNode(parentParcel.featureNode()))
                .proposedLandUse(request.proposedLandUse())
                .validationSummaryJson(serialize(summary))
                .layerSnapshotJson(serialize(Map.of(
                        PARCELS, bundle.parcels().getId(),
                        ZONING, bundle.zoning().getId(),
                        ROADS, bundle.roads().getId(),
                        ADMIN_BOUNDARIES, bundle.adminBoundaries().getId(),
                        CONSTRAINTS, bundle.constraints().getId()
                )))
                .createdAt(Instant.now())
                .build();
        subdivisionRunRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "VALIDATE", "Subdivision", entity.getId(),
                "Demo subdivision validated for parent parcel " + request.parentUpi());
        return entity;
    }

    public SubdivisionDtos.ValidationSummary readValidationSummary(String validationSummaryJson) {
        if (validationSummaryJson == null || validationSummaryJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(validationSummaryJson, SubdivisionDtos.ValidationSummary.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private SubdivisionDtos.ParentParcelResponse toParentParcel(FeatureRecord parcel, List<FeatureRecord> zoningFeatures) {
        Optional<ZoningRuleSet> zoningRuleSet = resolveZoning(parcel.geometry(), zoningFeatures);
        return new SubdivisionDtos.ParentParcelResponse(
                stringValue(parcel.properties(), "upi"),
                stringValue(parcel.properties(), "district"),
                stringValue(parcel.properties(), "sector"),
                stringValue(parcel.properties(), "cell"),
                stringValue(parcel.properties(), "village"),
                stringValue(parcel.properties(), "currentLandUse"),
                areaSqm(parcel.geometry()),
                serializeNode(parcel.featureNode()),
                zoningRuleSet.map(this::toZoningRule).orElse(null)
        );
    }

    private SubdivisionDtos.DemoLayerResponse toDemoLayer(DatasetEntity entity, String layerKey) {
        return new SubdivisionDtos.DemoLayerResponse(
                entity.getId(),
                layerKey,
                entity.getName(),
                entity.getType(),
                entity.getSourceFormat(),
                entity.getGeoJson()
        );
    }

    private Optional<ZoningRuleSet> resolveZoning(Geometry parentGeometry, List<FeatureRecord> zoningFeatures) {
        return zoningFeatures.stream()
                .filter(feature -> !feature.geometry().intersection(parentGeometry).isEmpty())
                .max(Comparator.comparingDouble(feature -> areaSqm(feature.geometry().intersection(parentGeometry))))
                .map(feature -> new ZoningRuleSet(
                        stringValue(feature.properties(), "zoneCode"),
                        stringList(feature.properties(), "allowedLandUse"),
                        doubleValue(feature.properties(), "minimumPlotSizeSqm", 0),
                        doubleValue(feature.properties(), "frontSetbackM", 0),
                        doubleValue(feature.properties(), "sideSetbackM", 0),
                        doubleValue(feature.properties(), "maximumCoveragePct", 0),
                        doubleValue(feature.properties(), "far", 0),
                        doubleValue(feature.properties(), "heightLimitM", 0)
                ));
    }

    private SubdivisionDtos.ZoningRule toZoningRule(ZoningRuleSet zoningRuleSet) {
        return new SubdivisionDtos.ZoningRule(
                zoningRuleSet.zoneCode(),
                zoningRuleSet.allowedLandUses(),
                zoningRuleSet.minimumPlotSizeSqm(),
                zoningRuleSet.frontSetbackM(),
                zoningRuleSet.sideSetbackM(),
                zoningRuleSet.maximumCoveragePct(),
                zoningRuleSet.far(),
                zoningRuleSet.heightLimitM()
        );
    }

    private ProposalGeometry parseProposal(String geoJson) {
        List<FeatureRecord> features = parseFeatures(geoJson);
        List<ProposalFeature> plots = new ArrayList<>();
        List<ProposalFeature> servitudes = new ArrayList<>();

        for (int i = 0; i < features.size(); i++) {
            FeatureRecord feature = features.get(i);
            String featureId = feature.featureId() != null && !feature.featureId().isBlank()
                    ? feature.featureId()
                    : "feature-" + (i + 1);
            if (feature.geometry() instanceof Polygonal) {
                plots.add(new ProposalFeature(featureId, feature.geometry(), feature.properties()));
            } else {
                servitudes.add(new ProposalFeature(featureId, feature.geometry(), feature.properties()));
            }
        }
        return new ProposalGeometry(plots, servitudes);
    }

    private List<RoadReserve> buildRoadReserves(List<FeatureRecord> roadFeatures) {
        List<RoadReserve> roadReserves = new ArrayList<>();
        for (FeatureRecord feature : roadFeatures) {
            double rowWidth = doubleValue(feature.properties(), "rightOfWayWidthM", 0);
            Geometry reserve = feature.geometry();
            if (!(reserve instanceof Polygonal)) {
                reserve = reserve.buffer(degreesForMeters(rowWidth / 2d));
            }
            roadReserves.add(new RoadReserve(
                    stringValue(feature.properties(), "roadClass"),
                    rowWidth,
                    reserve
            ));
        }
        return roadReserves;
    }

    private List<ConstraintGeometry> buildConstraintGeometries(List<FeatureRecord> constraintFeatures, List<RoadReserve> roadReserves) {
        List<ConstraintGeometry> results = new ArrayList<>();
        for (FeatureRecord feature : constraintFeatures) {
            Geometry geometry = feature.geometry();
            double bufferMeters = doubleValue(feature.properties(), "bufferMeters", 0);
            if (!(geometry instanceof Polygonal) && bufferMeters > 0) {
                geometry = geometry.buffer(degreesForMeters(bufferMeters));
            }
            results.add(new ConstraintGeometry(stringValue(feature.properties(), "constraintType"), geometry));
        }
        for (RoadReserve roadReserve : roadReserves) {
            results.add(new ConstraintGeometry("ROAD_RESERVE", roadReserve.reserveGeometry()));
        }
        return results;
    }

    private List<String> findConstraintOverlaps(Geometry plotGeometry, List<ConstraintGeometry> constraints) {
        List<String> overlaps = new ArrayList<>();
        for (ConstraintGeometry constraint : constraints) {
            Geometry intersection = plotGeometry.intersection(constraint.geometry());
            if (!intersection.isEmpty() && areaSqm(intersection) > INTERSECTION_TOLERANCE_SQM) {
                overlaps.add(constraint.constraintType());
            }
        }
        return overlaps;
    }

    private boolean touchesAny(Geometry geometry, Collection<Geometry> candidates) {
        for (Geometry candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            if (geometry.intersects(candidate)
                    || geometry.distance(candidate) <= TOUCH_TOLERANCE_DEGREES
                    || geometry.buffer(TOUCH_TOLERANCE_DEGREES).intersects(candidate)) {
                return true;
            }
        }
        return false;
    }

    private double areaSqm(Geometry geometry) {
        if (geometry == null || geometry.isEmpty()) {
            return 0;
        }
        JsonNode geometryNode = parseJson(serializeGeometry(geometry));
        if (geometryNode == null || geometryNode.isNull()) {
            return 0;
        }
        List<List<GeoJsonService.Point>> polygons = geoJsonService.extractPolygons(geometryNode.toString());
        return polygons.stream().mapToDouble(geoJsonService::computeAreaSqm).sum();
    }

    private String serializeGeometry(Geometry geometry) {
        try {
            return new org.locationtech.jts.io.geojson.GeoJsonWriter().write(geometry);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private JsonNode parseJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            return null;
        }
    }

    private LayerBundle ensureDemoLayers(ProjectEntity project) {
        List<DatasetEntity> datasets = datasetRepository.findByProjectId(project.getId());
        Map<String, DatasetEntity> byLayerKey = new LinkedHashMap<>();
        for (DatasetEntity dataset : datasets) {
            String layerKey = extractLayerKey(dataset.getMetadataJson());
            if (layerKey != null && !byLayerKey.containsKey(layerKey)) {
                byLayerKey.put(layerKey, dataset);
            }
        }

        for (MockSubdivisionLayerFactory.LayerDefinition definition : MockSubdivisionLayerFactory.demoLayers()) {
            if (byLayerKey.containsKey(definition.key())) {
                continue;
            }
            DatasetEntity entity = DatasetEntity.builder()
                    .project(project)
                    .name(definition.name())
                    .type(definition.type())
                    .sourceFormat(DatasetSourceFormat.GEOJSON)
                    .sourceFileName(definition.key().toLowerCase(Locale.ROOT) + ".geojson")
                    .geoJson(definition.geoJson())
                    .metadataJson(definition.metadataJson())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            datasetRepository.save(entity);
            byLayerKey.put(definition.key(), entity);
        }

        return new LayerBundle(
                requiredLayer(byLayerKey, PARCELS),
                requiredLayer(byLayerKey, ZONING),
                requiredLayer(byLayerKey, ROADS),
                requiredLayer(byLayerKey, ADMIN_BOUNDARIES),
                requiredLayer(byLayerKey, CONSTRAINTS)
        );
    }

    private DatasetEntity requiredLayer(Map<String, DatasetEntity> byLayerKey, String key) {
        DatasetEntity entity = byLayerKey.get(key);
        if (entity == null) {
            throw new IllegalArgumentException("Missing required demo layer " + key);
        }
        return entity;
    }

    private String extractLayerKey(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(metadataJson);
            return node.path("layerKey").asText(null);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<FeatureRecord> parseFeatures(String geoJson) {
        List<FeatureRecord> results = new ArrayList<>();
        if (geoJson == null || geoJson.isBlank()) {
            return results;
        }
        try {
            JsonNode root = objectMapper.readTree(geoJson);
            if ("FeatureCollection".equalsIgnoreCase(root.path("type").asText())) {
                int index = 0;
                for (JsonNode featureNode : root.path("features")) {
                    results.add(toFeatureRecord(featureNode, ++index));
                }
                return results;
            }
            if ("Feature".equalsIgnoreCase(root.path("type").asText())) {
                results.add(toFeatureRecord(root, 1));
                return results;
            }
            Geometry geometry = geoJsonReader.read(root.toString());
            results.add(new FeatureRecord("feature-1", Map.of(), geometry, wrapGeometry(root)));
            return results;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid GeoJSON payload");
        }
    }

    private FeatureRecord toFeatureRecord(JsonNode featureNode, int index) throws ParseException {
        JsonNode geometryNode = featureNode.path("geometry");
        Geometry geometry = geoJsonReader.read(geometryNode.toString());
        Map<String, Object> properties = featureNode.path("properties").isObject()
                ? objectMapper.convertValue(featureNode.path("properties"), MAP_TYPE)
                : Map.of();
        String featureId = featureNode.path("id").asText("");
        if (featureId == null || featureId.isBlank()) {
            featureId = stringValue(properties, "upi");
        }
        if (featureId == null || featureId.isBlank()) {
            featureId = "feature-" + index;
        }
        return new FeatureRecord(featureId, properties, geometry, featureNode);
    }

    private JsonNode wrapGeometry(JsonNode geometryNode) {
        Map<String, Object> feature = new LinkedHashMap<>();
        feature.put("type", "Feature");
        feature.put("properties", Map.of());
        feature.put("geometry", objectMapper.convertValue(geometryNode, Map.class));
        return objectMapper.valueToTree(feature);
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String serializeNode(JsonNode node) {
        return node == null ? "{}" : node.toString();
    }

    private String stringValue(Map<String, Object> properties, String key) {
        Object value = properties.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private double doubleValue(Map<String, Object> properties, String key, double defaultValue) {
        Object value = properties.get(key);
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private List<String> stringList(Map<String, Object> properties, String key) {
        Object value = properties.get(key);
        if (value == null) {
            return List.of();
        }
        if (value instanceof Collection<?> collection) {
            return collection.stream().filter(Objects::nonNull).map(String::valueOf).toList();
        }
        String text = String.valueOf(value);
        if (text.isBlank()) {
            return List.of();
        }
        return Arrays.stream(text.split(","))
                .map(String::trim)
                .filter(entry -> !entry.isBlank())
                .toList();
    }

    private double degreesForMeters(double meters) {
        return meters / METERS_PER_DEGREE;
    }

    private String format(double value) {
        return String.format(Locale.US, "%.2f", value);
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private record LayerBundle(
            DatasetEntity parcels,
            DatasetEntity zoning,
            DatasetEntity roads,
            DatasetEntity adminBoundaries,
            DatasetEntity constraints
    ) {
    }

    private record FeatureRecord(
            String featureId,
            Map<String, Object> properties,
            Geometry geometry,
            JsonNode featureNode
    ) {
    }

    private record ZoningRuleSet(
            String zoneCode,
            List<String> allowedLandUses,
            double minimumPlotSizeSqm,
            double frontSetbackM,
            double sideSetbackM,
            double maximumCoveragePct,
            double far,
            double heightLimitM
    ) {
    }

    private record ProposalFeature(
            String featureId,
            Geometry geometry,
            Map<String, Object> properties
    ) {
    }

    private record ProposalGeometry(
            List<ProposalFeature> plots,
            List<ProposalFeature> servitudes
    ) {
    }

    private record RoadReserve(
            String roadClass,
            double rowWidthMeters,
            Geometry reserveGeometry
    ) {
    }

    private record ConstraintGeometry(
            String constraintType,
            Geometry geometry
    ) {
    }
}
