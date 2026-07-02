package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryCollection;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.Polygonal;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.locationtech.jts.io.geojson.GeoJsonWriter;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.PlannerDtos;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GisPlannerService {
    private static final String DISCLAIMER = "This is a preliminary planning and compliance check only. It does not replace official approval by NLA, District One Stop Centre, Irembo, or a licensed land surveyor.";
    private static final double DEFAULT_AREA_TOLERANCE_SQM = 5d;
    private static final double TOPOLOGY_EPSILON = 0.0000005d;
    private static final double ACCESS_BUFFER_DEGREES = 0.00012d;
    private static final int BUILDING_OVERLAY_LIMIT = 600;
    private static final float PDF_MARGIN = 48f;
    private static final float PDF_FONT_SIZE = 10f;
    private static final float PDF_TITLE_SIZE = 16f;
    private static final float PDF_LEADING = 14f;
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Integer>> INTEGER_LIST_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;
    private final GeoJsonService geoJsonService;
    private final GeoJsonReader geoJsonReader;
    private final GeoJsonWriter geoJsonWriter;
    private final PdfBrandingSupport pdfBrandingSupport;
    private Path sqlitePath;

    public GisPlannerService(ObjectMapper objectMapper,
                             GeoJsonService geoJsonService,
                             PdfBrandingSupport pdfBrandingSupport) {
        this.objectMapper = objectMapper;
        this.geoJsonService = geoJsonService;
        this.pdfBrandingSupport = pdfBrandingSupport;
        this.geoJsonReader = new GeoJsonReader(new GeometryFactory());
        this.geoJsonWriter = new GeoJsonWriter();
    }

    @PostConstruct
    void init() {
        this.sqlitePath = Path.of(System.getProperty("user.dir"), "data", "geosmart_gis.sqlite").toAbsolutePath();
        if (!Files.exists(sqlitePath)) {
            throw new IllegalStateException("GIS cache not found at " + sqlitePath + ". Run backend/scripts/build_gis_cache.py first.");
        }
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException ex) {
            throw new IllegalStateException("SQLite JDBC driver is missing.", ex);
        }
    }

    public List<PlannerDtos.LayerStatusResponse> listLayerStatus() {
        String sql = """
                SELECT layer_key, source_path, feature_count, geometry_type, crs, epsg, loaded_successfully, notes
                FROM layer_status
                ORDER BY layer_key
                """;
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            List<PlannerDtos.LayerStatusResponse> results = new ArrayList<>();
            while (resultSet.next()) {
                results.add(new PlannerDtos.LayerStatusResponse(
                        resultSet.getString("layer_key"),
                        resultSet.getString("source_path"),
                        getNullableInt(resultSet, "feature_count"),
                        resultSet.getString("geometry_type"),
                        resultSet.getString("crs"),
                        getNullableInt(resultSet, "epsg"),
                        resultSet.getInt("loaded_successfully") == 1,
                        resultSet.getString("notes")
                ));
            }
            return results;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read GIS layer status.", ex);
        }
    }

    public List<PlannerDtos.ParcelSearchResponse> searchParcels(String upiQuery) {
        String normalized = normalizeUpi(upiQuery);
        if (normalized.isBlank()) {
            return List.of();
        }

        String sql = """
                SELECT p.id, p.upi, p.province, p.district, p.sector, p.cell, p.village, p.status, p.accuracy,
                       p.official_area_sqm,
                       (SELECT COUNT(*) FROM parcels d WHERE d.upi_normalized = p.upi_normalized) AS duplicate_count
                FROM parcels p
                WHERE p.upi_normalized LIKE ? 
                   OR p.district LIKE ? 
                   OR p.sector LIKE ? 
                   OR p.cell LIKE ? 
                   OR p.village LIKE ?
                ORDER BY
                    CASE
                        WHEN p.upi_normalized = ? THEN 0
                        WHEN p.upi_normalized LIKE ? THEN 1
                        WHEN p.district LIKE ? THEN 2
                        WHEN p.sector LIKE ? THEN 3
                        ELSE 4
                    END,
                    LENGTH(p.upi_normalized),
                    p.id
                LIMIT 25
                """;
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            String pattern = "%" + normalized + "%";
            statement.setString(1, pattern);
            statement.setString(2, pattern);
            statement.setString(3, pattern);
            statement.setString(4, pattern);
            statement.setString(5, pattern);
            statement.setString(6, normalized);
            statement.setString(7, normalized + "%");
            statement.setString(8, pattern);
            statement.setString(9, pattern);
            try (ResultSet resultSet = statement.executeQuery()) {
                List<PlannerDtos.ParcelSearchResponse> results = new ArrayList<>();
                while (resultSet.next()) {
                    results.add(new PlannerDtos.ParcelSearchResponse(
                            resultSet.getLong("id"),
                            resultSet.getString("upi"),
                            resultSet.getInt("duplicate_count"),
                            resultSet.getString("province"),
                            resultSet.getString("district"),
                            resultSet.getString("sector"),
                            resultSet.getString("cell"),
                            resultSet.getString("village"),
                            resultSet.getString("status"),
                            resultSet.getString("accuracy"),
                            getNullableDouble(resultSet, "official_area_sqm")
                    ));
                }
                return results;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to search parcel cache.", ex);
        }
    }

    public PlannerDtos.ParcelDetailResponse getParcel(long parcelId) {
        try (Connection connection = openConnection()) {
            return toParcelDetail(fetchParcel(connection, parcelId));
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to fetch parcel.", ex);
        }
    }

    public List<PlannerDtos.ParcelZoneResponse> getParcelZoning(long parcelId) {
        try (Connection connection = openConnection()) {
            ParcelRecord parcel = fetchParcel(connection, parcelId);
            return resolveParcelZones(connection, parcel);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to resolve parcel zoning.", ex);
        }
    }

    public PlannerDtos.ParcelContextResponse getParcelContext(long parcelId) {
        try (Connection connection = openConnection()) {
            ParcelRecord parcel = fetchParcel(connection, parcelId);
            List<PlannerDtos.ParcelZoneResponse> zoning = resolveParcelZones(connection, parcel);
            List<String> warnings = new ArrayList<>();
            List<ZoneRecord> contextZones = intersectingZones(parcel.geometry(), queryZonesForEnvelope(connection, envelopeFor(parcel, 0.00035d)));

            List<OverlayFeature> zoningFeatures = contextZones.stream()
                    .map(zone -> new OverlayFeature(zone.zoneCode(), zone.geometryGeoJson(), Map.of(
                            "zoneCode", zone.zoneCode(),
                            "genLu", zone.genLu(),
                            "zoning", zone.zoning()
                    )))
                    .toList();

            List<OverlayFeature> adminFeatures = queryAdminBoundaryFeatures(connection, parcel);
            List<ZoneRecord> constraintZones = queryConstraintZones(connection, parcel.geometry(), envelopeFor(parcel, 0.00035d));
            List<OverlayFeature> constraintFeatures = constraintZones.stream()
                    .map(zone -> new OverlayFeature(zone.zoneCode(), zone.geometryGeoJson(), Map.of(
                            "zoneCode", zone.zoneCode(),
                            "label", zone.rule().displayName(),
                            "status", zone.rule().subdivisionStatus()
                    )))
                    .toList();

            Envelope parcelEnvelope = envelopeFor(parcel, 0.00018d);
            List<BuildingRecord> buildings = queryBuildingCandidates(connection, parcelEnvelope, BUILDING_OVERLAY_LIMIT + 1);
            if (buildings.size() > BUILDING_OVERLAY_LIMIT) {
                warnings.add("Building overlay was limited to the first " + BUILDING_OVERLAY_LIMIT + " nearby footprints for map performance.");
                buildings = buildings.subList(0, BUILDING_OVERLAY_LIMIT);
            }
            List<OverlayFeature> buildingFeatures = buildings.stream()
                    .map(building -> new OverlayFeature(
                            String.valueOf(building.id()),
                            building.geometryGeoJson(),
                            Map.of(
                                    "buildingId", building.id(),
                                    "confidence", building.confidence(),
                                    "plusCode", nullSafe(building.plusCode())
                            )
                    ))
                    .toList();

            String demNote = layerNote(connection, "dem");
            if (demNote != null && !demNote.isBlank()) {
                warnings.add(demNote);
            }

            return new PlannerDtos.ParcelContextResponse(
                    toParcelDetail(parcel),
                    zoning,
                    List.of(
                            new PlannerDtos.OverlayLayerResponse("ZONING", "Masterplan Zoning", featureCollectionJson(zoningFeatures)),
                            new PlannerDtos.OverlayLayerResponse("ADMIN_BOUNDARIES", "Administrative Boundaries", featureCollectionJson(adminFeatures)),
                            new PlannerDtos.OverlayLayerResponse("BUILDING_FOOTPRINTS", "Building Footprints", featureCollectionJson(buildingFeatures)),
                            new PlannerDtos.OverlayLayerResponse("CONSTRAINTS", "Constraint Zones", featureCollectionJson(constraintFeatures))
                    ),
                    warnings
            );
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to build parcel context.", ex);
        }
    }

    public PlannerDtos.SubdivisionCheckResponse checkSubdivision(PlannerDtos.SubdivisionCheckRequest request) {
        try (Connection connection = openConnection()) {
            ParcelRecord parcel = fetchParcel(connection, request.parcelId());
            List<PlannerDtos.ParcelZoneResponse> parcelZones = resolveParcelZones(connection, parcel);
            List<ZoneRecord> plotRelevantZones = queryZonesForEnvelope(connection, envelopeFor(parcel, 0.00035d));
            List<ZoneRecord> constraintZones = plotRelevantZones.stream().filter(this::isConstraintZone).toList();
            List<ZoneRecord> transportZones = plotRelevantZones.stream()
                    .filter(zone -> "T".equalsIgnoreCase(zone.zoneCode()) || "Transportation".equalsIgnoreCase(zone.rule().category()))
                    .toList();
            List<BuildingRecord> buildings = queryBuildingCandidates(connection, envelopeFor(parcel, 0.00018d), 5000);

            Proposal proposal = parseProposal(request.proposalGeoJson());
            if (proposal.plots().isEmpty()) {
                throw new IllegalArgumentException("At least one polygon feature is required.");
            }

            double parentAreaSqm = parcel.officialAreaSqm() != null ? parcel.officialAreaSqm() : areaSqm(parcel.geometry());
            double proposedAreaSqm = proposal.plots().stream().mapToDouble(plot -> areaSqm(plot.geometry())).sum();
            double toleranceSqm = request.areaToleranceSqm() != null && request.areaToleranceSqm() > 0
                    ? request.areaToleranceSqm()
                    : DEFAULT_AREA_TOLERANCE_SQM;
            double areaDeltaSqm = Math.abs(parentAreaSqm - proposedAreaSqm);

            boolean parentGeometryValid = parcel.geometry().isValid();
            boolean allInsideParent = true;
            boolean allLotSizesPass = true;
            boolean allRoadAccessPass = true;
            boolean anyBuildingSplit = false;
            boolean anySlopeRestricted = false;
            boolean allRestrictedClear = true;
            boolean anyPlotWarn = false;
            boolean anyPlotFail = false;

            List<BuildingSplitRecord> buildingSplitRecords = analyzeBuildingSplits(buildings, proposal.plots());
            Map<Integer, Boolean> plotSplitMap = buildingSplitRecords.stream()
                    .flatMap(record -> record.plotIndexes().stream().map(index -> Map.entry(index, true)))
                    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (left, right) -> true));

            boolean internalOverlapPass = true;
            outer:
            for (int i = 0; i < proposal.plots().size(); i++) {
                for (int j = i + 1; j < proposal.plots().size(); j++) {
                    Geometry intersection = safeIntersection(proposal.plots().get(i).geometry(), proposal.plots().get(j).geometry());
                    if (!intersection.isEmpty() && areaSqm(intersection) > toleranceSqm / 10d) {
                        internalOverlapPass = false;
                        break outer;
                    }
                }
            }

            List<PlannerDtos.PlotResultResponse> plotResponses = new ArrayList<>();
            for (int index = 0; index < proposal.plots().size(); index++) {
                ProposalPlot plot = proposal.plots().get(index);
                double plotAreaSqm = areaSqm(plot.geometry());
                boolean insideParent = parcel.geometry().buffer(TOPOLOGY_EPSILON).covers(plot.geometry());
                allInsideParent &= insideParent;

                List<ZoneRecord> intersectedZones = intersectingZones(plot.geometry(), plotRelevantZones);
                if (intersectedZones.isEmpty()) {
                    intersectedZones = intersectingZones(parcel.geometry(), plotRelevantZones);
                }

                Double strictMinLot = intersectedZones.stream()
                        .map(zone -> zone.rule().minimumLotSizeSqm())
                        .filter(Objects::nonNull)
                        .max(Double::compareTo)
                        .orElse(null);
                Double strictMaxLot = intersectedZones.stream()
                        .map(zone -> zone.rule().maximumLotSizeSqm())
                        .filter(Objects::nonNull)
                        .min(Double::compareTo)
                        .orElse(null);

                boolean lotPass = true;
                List<String> notes = new ArrayList<>();
                boolean lotWarn = false;
                if (strictMinLot != null && plotAreaSqm + toleranceSqm < strictMinLot) {
                    lotPass = false;
                    lotWarn = hasReviewRule(intersectedZones);
                    notes.add("Plot area is below the strictest applicable minimum lot size of " + format(strictMinLot) + " sqm.");
                }
                if (strictMaxLot != null && plotAreaSqm - toleranceSqm > strictMaxLot) {
                    lotPass = false;
                    lotWarn = true;
                    notes.add("Plot area is above the strictest applicable maximum lot size of " + format(strictMaxLot) + " sqm.");
                }
                allLotSizesPass &= lotPass;

                List<String> restrictedOverlaps = new ArrayList<>();
                String restrictedStatus = "PASS";
                for (ZoneRecord zone : intersectedZones) {
                    if (!isConstraintZone(zone)) {
                        continue;
                    }
                    Geometry intersection = safeIntersection(plot.geometry(), zone.geometry());
                    if (!intersection.isEmpty() && areaSqm(intersection) > toleranceSqm / 10d) {
                        restrictedOverlaps.add(zone.zoneCode());
                        if (severity(zone.rule().subdivisionStatus()) >= severity(restrictedStatus)) {
                            restrictedStatus = zone.rule().subdivisionStatus();
                        }
                        if ("P3C".equalsIgnoreCase(zone.zoneCode())) {
                            anySlopeRestricted = true;
                        }
                    }
                }
                if (!restrictedOverlaps.isEmpty()) {
                    allRestrictedClear = false;
                    notes.add("Restricted overlap detected with " + String.join(", ", restrictedOverlaps) + ".");
                }

                boolean roadAccessPass = transportZones.stream()
                        .map(ZoneRecord::geometry)
                        .anyMatch(transport -> transport.buffer(ACCESS_BUFFER_DEGREES).intersects(plot.geometry().getBoundary()));
                if (!roadAccessPass) {
                    notes.add("No transportation-zone frontage was detected. Access remains preliminary and needs surveyor confirmation.");
                }
                allRoadAccessPass &= roadAccessPass;

                boolean buildingSplit = plotSplitMap.getOrDefault(index + 1, false);
                if (buildingSplit) {
                    anyBuildingSplit = true;
                    notes.add("A subdivision boundary appears to split one or more existing buildings.");
                }

                boolean slopeRestricted = restrictedOverlaps.stream().anyMatch(code -> "P3C".equalsIgnoreCase(code));

                String plotStatus = "PASS";
                if (!insideParent || !internalOverlapPass || "NOT_RECOMMENDED".equals(restrictedStatus) || (!lotPass && !lotWarn)) {
                    plotStatus = "FAIL";
                    anyPlotFail = true;
                } else if (!lotPass || !roadAccessPass || buildingSplit || slopeRestricted || !restrictedOverlaps.isEmpty()) {
                    plotStatus = "WARN";
                    anyPlotWarn = true;
                }

                plotResponses.add(new PlannerDtos.PlotResultResponse(
                        index + 1,
                        plot.featureId(),
                        plotAreaSqm,
                        plotStatus,
                        insideParent,
                        lotPass,
                        roadAccessPass,
                        buildingSplit,
                        slopeRestricted,
                        intersectedZones.stream().map(ZoneRecord::zoneCode).distinct().toList(),
                        restrictedOverlaps,
                        notes
                ));
            }

            Geometry unionGeometry = unionGeometry(proposal.plots().stream().map(ProposalPlot::geometry).toList());
            double uncoveredAreaSqm = areaSqm(safeDifference(parcel.geometry(), unionGeometry));
            double overlapAreaSqm = Math.max(0, proposedAreaSqm - areaSqm(unionGeometry));
            String zoningStatus = strictestZoningStatus(parcelZones);
            String lotStatus = allLotSizesPass ? "PASS" : (anyPlotFail ? "FAIL" : "WARN");
            String restrictedStatus = allRestrictedClear ? "PASS" : strictestConstraintStatus(plotResponses);
            String buildingStatus = anyBuildingSplit ? "WARN" : "PASS";
            String accessStatus = allRoadAccessPass ? "PASS" : "WARN";
            String slopeStatus = anySlopeRestricted ? "WARN" : "PASS";
            String areaStatus = areaDeltaSqm <= toleranceSqm && overlapAreaSqm <= toleranceSqm ? "PASS" : "WARN";
            LandUseCheck landUseCheck = evaluateProposedLandUse(request.proposedLandUse(), parcelZones);

            List<PlannerDtos.CheckResultResponse> checks = new ArrayList<>();
            checks.add(new PlannerDtos.CheckResultResponse(
                    "PARENT_PARCEL",
                    "Parent parcel exists and geometry is valid",
                    parentGeometryValid ? "PASS" : "FAIL",
                    parentGeometryValid
                            ? "Selected parcel " + parcel.upi() + " was loaded successfully and its geometry is valid."
                            : "Selected parcel geometry is invalid and should be repaired before detailed review."
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "INSIDE_PARENT",
                    "All proposed plots stay inside the selected parent parcel",
                    allInsideParent ? "PASS" : "FAIL",
                    allInsideParent
                            ? "All proposed subdivision polygons are contained within the parent parcel."
                            : "At least one proposed plot extends outside the parent parcel boundary."
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "AREA_BALANCE",
                    "The proposed plots account for the parent parcel area",
                    areaStatus,
                    "Parent area " + format(parentAreaSqm) + " sqm, proposed area " + format(proposedAreaSqm)
                            + " sqm, delta " + format(areaDeltaSqm) + " sqm, uncovered area " + format(uncoveredAreaSqm)
                            + " sqm, overlap area " + format(overlapAreaSqm) + " sqm."
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "INTERNAL_OVERLAP",
                    "Proposed plots do not overlap each other",
                    internalOverlapPass ? "PASS" : "FAIL",
                    internalOverlapPass
                            ? "No overlapping plot polygons were detected."
                            : "One or more proposed plots overlap each other."
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "ZONING",
                    "Parent parcel zoning is identified from the Kigali Masterplan",
                    zoningStatus,
                    buildZoningSummary(parcelZones)
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "LAND_USE",
                    "Proposed land use is compatible with zoning rules",
                    landUseCheck.status(),
                    landUseCheck.detail()
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "LOT_SIZE",
                    "Proposed plots comply with applicable lot-size rules where rules are explicit",
                    lotStatus,
                    buildLotSummary(parcelZones)
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "RESTRICTED_ZONES",
                    "Proposed plots avoid restricted wetlands, buffers, slopes, utility, transport, and protected areas",
                    restrictedStatus,
                    buildRestrictedSummary(plotResponses)
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "BUILDING_FOOTPRINTS",
                    "Proposed boundaries do not split existing building footprints",
                    buildingStatus,
                    anyBuildingSplit
                            ? "At least one building footprint intersects more than one proposed plot."
                            : "No building footprint was split by the proposed subdivision boundaries."
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "ACCESS",
                    "Preliminary road access check using transportation zones",
                    accessStatus,
                    allRoadAccessPass
                            ? "Each plot touches a transportation-zone edge, but official right-of-way compliance still needs surveyor confirmation."
                            : "At least one plot does not touch a transportation-zone edge. Access remains preliminary and needs confirmation."
            ));
            checks.add(new PlannerDtos.CheckResultResponse(
                    "SLOPE",
                    "Steep-slope screening",
                    slopeStatus,
                    anySlopeRestricted
                            ? "At least one plot overlaps a steep-slope masterplan zone (P3C)."
                            : "No plot overlaps the steep-slope masterplan zone used in this first implementation."
            ));

            List<String> warnings = new ArrayList<>();
            if (parcelZones.size() > 1) {
                warnings.add("The parent parcel intersects multiple masterplan zones. The strictest applicable zoning status should guide interpretation.");
            }
            if (request.proposedLandUse() == null || request.proposedLandUse().isBlank()) {
                warnings.add("No proposed land-use override was supplied. Zoning checks are based on the parcel's intersecting masterplan zones only.");
            }
            String demNote = layerNote(connection, "dem");
            if (demNote != null && !demNote.isBlank()) {
                warnings.add(demNote);
            }
            warnings.add("Road access is preliminary because the current implementation uses transportation-zone features, not certified road-centerline or right-of-way surveys.");
            warnings.addAll(missingConstraintWarnings(connection));

            String recommendation = deriveRecommendation(checks);
            int complianceScore = calculateComplianceScore(checks, plotResponses, areaDeltaSqm, parentAreaSqm);
            return new PlannerDtos.SubdivisionCheckResponse(
                    toParcelDetail(parcel),
                    parcelZones,
                    proposal.plots().size(),
                    parentAreaSqm,
                    proposedAreaSqm,
                    areaDeltaSqm,
                    toleranceSqm,
                    checks,
                    plotResponses,
                    warnings,
                    recommendation,
                    complianceScore,
                    DISCLAIMER
            );
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to run subdivision compliance check.", ex);
        }
    }

    public PlannerDtos.PlannerReportResponse generateReport(PlannerDtos.SubdivisionCheckRequest request) {
        PlannerDtos.SubdivisionCheckResponse result = checkSubdivision(request);
        String now = Instant.now().toString();
        String reportMarkdown = buildReportMarkdown(result);

        try (Connection connection = openConnection()) {
            long proposalId = insertProposal(connection, request, now);
            long reportId = insertReport(connection, proposalId, result, reportMarkdown, now);
            return new PlannerDtos.PlannerReportResponse(
                    proposalId,
                    reportId,
                    now,
                    reportMarkdown,
                    result
            );
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save compliance report.", ex);
        }
    }

    public byte[] generateReportPdf(PlannerDtos.SubdivisionCheckResponse report, String proposalGeoJson) {
        try (PDDocument document = new PDDocument()) {
            List<ProposalPlot> proposalPlots = parseProposal(proposalGeoJson).plots();
            drawSubdivisionLayoutPage(document, report, proposalPlots);
            drawIndividualPlotPages(document, report, proposalPlots);
            writePdfTextPages(document, buildPdfLines(report, proposalPlots));

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate subdivision PDF report.", ex);
        }
    }

    private Connection openConnection() throws SQLException {
        return DriverManager.getConnection("jdbc:sqlite:" + sqlitePath);
    }

    private ParcelRecord fetchParcel(Connection connection, long parcelId) throws SQLException {
        String sql = """
                SELECT p.*, (SELECT COUNT(*) FROM parcels d WHERE d.upi_normalized = p.upi_normalized) AS duplicate_count
                FROM parcels p
                WHERE p.id = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, parcelId);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    throw new IllegalArgumentException("Parcel not found: " + parcelId);
                }
                return new ParcelRecord(
                        resultSet.getLong("id"),
                        resultSet.getString("upi"),
                        resultSet.getInt("duplicate_count"),
                        resultSet.getString("parcel_num"),
                        resultSet.getString("province"),
                        resultSet.getString("district"),
                        resultSet.getString("sector"),
                        resultSet.getString("cell"),
                        resultSet.getString("village"),
                        resultSet.getString("status"),
                        resultSet.getString("accuracy"),
                        getNullableDouble(resultSet, "official_area_sqm"),
                        getNullableDouble(resultSet, "calc_area_sqm"),
                        resultSet.getDouble("min_lon"),
                        resultSet.getDouble("min_lat"),
                        resultSet.getDouble("max_lon"),
                        resultSet.getDouble("max_lat"),
                        resultSet.getString("geometry_geojson"),
                        parseGeometry(resultSet.getString("geometry_geojson"))
                );
            }
        }
    }

    private PlannerDtos.ParcelDetailResponse toParcelDetail(ParcelRecord parcel) {
        return new PlannerDtos.ParcelDetailResponse(
                parcel.id(),
                parcel.upi(),
                parcel.duplicateUpiCount(),
                parcel.parcelNumber(),
                parcel.province(),
                parcel.district(),
                parcel.sector(),
                parcel.cell(),
                parcel.village(),
                parcel.status(),
                parcel.accuracy(),
                parcel.officialAreaSqm(),
                parcel.calculatedAreaSqm(),
                featureJson(parcel.geometryGeoJson(), Map.of(
                        "id", parcel.id(),
                        "upi", parcel.upi(),
                        "district", parcel.district(),
                        "sector", parcel.sector(),
                        "cell", parcel.cell(),
                        "village", parcel.village()
                ))
        );
    }

    private List<PlannerDtos.ParcelZoneResponse> resolveParcelZones(Connection connection, ParcelRecord parcel) throws SQLException {
        List<ZoneRecord> candidates = queryZonesForEnvelope(connection, envelopeFor(parcel, 0));
        List<PlannerDtos.ParcelZoneResponse> results = new ArrayList<>();
        double parentArea = parcel.officialAreaSqm() != null ? parcel.officialAreaSqm() : areaSqm(parcel.geometry());

        for (ZoneRecord zone : candidates) {
            Geometry intersection = safeIntersection(parcel.geometry(), zone.geometry());
            double overlapAreaSqm = areaSqm(intersection);
            if (intersection.isEmpty() || overlapAreaSqm <= 0.1d) {
                continue;
            }
            double overlapPct = parentArea <= 0 ? 0 : (overlapAreaSqm / parentArea) * 100d;
            results.add(new PlannerDtos.ParcelZoneResponse(
                    zone.id(),
                    zone.zoneCode(),
                    zone.genLu(),
                    zone.zoning(),
                    zone.phasing(),
                    overlapAreaSqm,
                    overlapPct,
                    featureJson(zone.geometryGeoJson(), Map.of(
                            "zoneCode", zone.zoneCode(),
                            "genLu", zone.genLu(),
                            "zoning", zone.zoning(),
                            "phasing", zone.phasing()
                    )),
                    toRuleResponse(zone.rule())
            ));
        }

        results.sort(Comparator.comparing(PlannerDtos.ParcelZoneResponse::overlapAreaSqm, Comparator.nullsLast(Comparator.reverseOrder())));
        return results;
    }

    private List<ZoneRecord> queryZonesForEnvelope(Connection connection, Envelope envelope) throws SQLException {
        String sql = """
                SELECT z.*, r.display_name, r.category, r.subdivision_status, r.minimum_lot_size_sqm, r.maximum_lot_size_sqm,
                       r.allowed_uses_json, r.prohibited_uses_json, r.development_strategy, r.subdivision_guidance,
                       r.restriction_summary, r.review_reason, r.source_pages_json
                FROM masterplan_zones z
                LEFT JOIN zoning_rules r ON r.zone_code = z.zone_code
                WHERE z.min_lon <= ? AND z.max_lon >= ? AND z.min_lat <= ? AND z.max_lat >= ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setDouble(1, envelope.maxLon());
            statement.setDouble(2, envelope.minLon());
            statement.setDouble(3, envelope.maxLat());
            statement.setDouble(4, envelope.minLat());
            try (ResultSet resultSet = statement.executeQuery()) {
                List<ZoneRecord> results = new ArrayList<>();
                while (resultSet.next()) {
                    String geometryGeoJson = resultSet.getString("geometry_geojson");
                    results.add(new ZoneRecord(
                            resultSet.getLong("id"),
                            resultSet.getString("zone_code"),
                            resultSet.getString("gen_lu"),
                            resultSet.getString("zoning"),
                            resultSet.getString("phasing"),
                            geometryGeoJson,
                            parseGeometry(geometryGeoJson),
                            new RuleRecord(
                                    resultSet.getString("zone_code"),
                                    defaultString(resultSet.getString("display_name"), resultSet.getString("zoning")),
                                    defaultString(resultSet.getString("category"), resultSet.getString("gen_lu")),
                                    defaultString(resultSet.getString("subdivision_status"), "NEEDS_REVIEW"),
                                    getNullableDouble(resultSet, "minimum_lot_size_sqm"),
                                    getNullableDouble(resultSet, "maximum_lot_size_sqm"),
                                    readStringList(resultSet.getString("allowed_uses_json")),
                                    readStringList(resultSet.getString("prohibited_uses_json")),
                                    resultSet.getString("development_strategy"),
                                    resultSet.getString("subdivision_guidance"),
                                    resultSet.getString("restriction_summary"),
                                    resultSet.getString("review_reason"),
                                    readIntegerList(resultSet.getString("source_pages_json"))
                            )
                    ));
                }
                return results;
            }
        }
    }

    private List<ZoneRecord> queryConstraintZones(Connection connection, Geometry parcelGeometry, Envelope envelope) throws SQLException {
        return queryZonesForEnvelope(connection, envelope).stream()
                .filter(this::isConstraintZone)
                .filter(zone -> !safeIntersection(parcelGeometry, zone.geometry()).isEmpty())
                .toList();
    }

    private List<BuildingRecord> queryBuildingCandidates(Connection connection, Envelope envelope, int limit) throws SQLException {
        String sql = """
                SELECT *
                FROM building_footprints
                WHERE min_lon <= ? AND max_lon >= ? AND min_lat <= ? AND max_lat >= ?
                ORDER BY id
                LIMIT ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setDouble(1, envelope.maxLon());
            statement.setDouble(2, envelope.minLon());
            statement.setDouble(3, envelope.maxLat());
            statement.setDouble(4, envelope.minLat());
            statement.setInt(5, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                List<BuildingRecord> results = new ArrayList<>();
                while (resultSet.next()) {
                    String geometryGeoJson = resultSet.getString("geometry_geojson");
                    results.add(new BuildingRecord(
                            resultSet.getLong("id"),
                            resultSet.getString("plus_code"),
                            resultSet.getInt("confidence"),
                            geometryGeoJson,
                            parseGeometry(geometryGeoJson)
                    ));
                }
                return results;
            }
        }
    }

    private List<OverlayFeature> queryAdminBoundaryFeatures(Connection connection, ParcelRecord parcel) throws SQLException {
        List<OverlayFeature> features = new ArrayList<>();
        addAdminFeature(connection, features, "province", parcel.province(), "Province");
        addAdminFeature(connection, features, "district", parcel.district(), "District");
        addAdminFeature(connection, features, "sector", parcel.sector(), "Sector");
        addAdminFeature(connection, features, "cell", parcel.cell(), "Cell");
        addAdminFeature(connection, features, "village", parcel.village(), "Village");
        return features;
    }

    private void addAdminFeature(Connection connection, List<OverlayFeature> features, String level, String name, String label) throws SQLException {
        if (name == null || name.isBlank()) {
            return;
        }
        String sql = """
                SELECT boundary_level, name, geometry_geojson
                FROM administrative_boundaries
                WHERE boundary_level = ? AND LOWER(name) = LOWER(?)
                LIMIT 1
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, level);
            statement.setString(2, name);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    features.add(new OverlayFeature(
                            level + ":" + name,
                            resultSet.getString("geometry_geojson"),
                            Map.of("level", label, "name", resultSet.getString("name"))
                    ));
                }
            }
        }
    }

    private Proposal parseProposal(String proposalGeoJson) {
        try {
            JsonNode root = objectMapper.readTree(proposalGeoJson);
            List<JsonNode> features = new ArrayList<>();
            if ("FeatureCollection".equalsIgnoreCase(root.path("type").asText())) {
                root.path("features").forEach(features::add);
            } else if ("Feature".equalsIgnoreCase(root.path("type").asText())) {
                features.add(root);
            } else {
                throw new IllegalArgumentException("Proposal must be GeoJSON Feature or FeatureCollection.");
            }

            List<ProposalPlot> plots = new ArrayList<>();
            for (int i = 0; i < features.size(); i++) {
                JsonNode feature = features.get(i);
                Geometry geometry = geoJsonReader.read(feature.path("geometry").toString());
                if (!(geometry instanceof Polygonal)) {
                    continue;
                }
                String featureId = feature.path("id").asText();
                if (featureId == null || featureId.isBlank()) {
                    featureId = feature.path("properties").path("id").asText();
                }
                if (featureId == null || featureId.isBlank()) {
                    featureId = "plot-" + (i + 1);
                }
                plots.add(new ProposalPlot(featureId, geometry));
            }
            return new Proposal(plots);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid proposal GeoJSON.", ex);
        }
    }

    private List<ZoneRecord> intersectingZones(Geometry geometry, List<ZoneRecord> zones) {
        return zones.stream()
                .filter(zone -> {
                    Geometry intersection = safeIntersection(geometry, zone.geometry());
                    return !intersection.isEmpty() && areaSqm(intersection) > 0.1d;
                })
                .toList();
    }

    private List<BuildingSplitRecord> analyzeBuildingSplits(List<BuildingRecord> buildings, List<ProposalPlot> plots) {
        List<BuildingSplitRecord> splits = new ArrayList<>();
        for (BuildingRecord building : buildings) {
            List<Integer> hitPlots = new ArrayList<>();
            for (int i = 0; i < plots.size(); i++) {
                Geometry intersection = safeIntersection(building.geometry(), plots.get(i).geometry());
                if (!intersection.isEmpty() && areaSqm(intersection) > 0.1d) {
                    hitPlots.add(i + 1);
                }
            }
            if (hitPlots.size() > 1) {
                splits.add(new BuildingSplitRecord(building.id(), hitPlots));
            }
        }
        return splits;
    }

    private Geometry unionGeometry(List<Geometry> geometries) {
        if (geometries.isEmpty()) {
            return new GeometryCollection(new Geometry[0], new GeometryFactory());
        }
        Geometry union = geometries.get(0);
        for (int i = 1; i < geometries.size(); i++) {
            union = union.union(geometries.get(i));
        }
        return union;
    }

    private String strictestZoningStatus(List<PlannerDtos.ParcelZoneResponse> zones) {
        int severity = 0;
        String status = "PASS";
        for (PlannerDtos.ParcelZoneResponse zone : zones) {
            String mapped = mapRuleToCheckStatus(zone.rule() == null ? null : zone.rule().subdivisionStatus());
            int currentSeverity = severity(mapped);
            if (currentSeverity > severity) {
                severity = currentSeverity;
                status = mapped;
            }
        }
        return status;
    }

    private String buildZoningSummary(List<PlannerDtos.ParcelZoneResponse> zones) {
        if (zones.isEmpty()) {
            return "No overlapping Kigali masterplan zone was found for the selected parcel.";
        }
        return zones.stream()
                .map(zone -> zone.zoneCode() + " (" + format(zone.overlapPercentOfParcel()) + "% of parcel, status "
                        + (zone.rule() != null ? zone.rule().subdivisionStatus() : "NEEDS_REVIEW") + ")")
                .collect(Collectors.joining("; "));
    }

    private String buildLotSummary(List<PlannerDtos.ParcelZoneResponse> zones) {
        List<String> parts = new ArrayList<>();
        for (PlannerDtos.ParcelZoneResponse zone : zones) {
            if (zone.rule() == null) {
                continue;
            }
            StringBuilder builder = new StringBuilder(zone.zoneCode()).append(": ");
            if (zone.rule().minimumLotSizeSqm() != null) {
                builder.append("min ").append(format(zone.rule().minimumLotSizeSqm())).append(" sqm");
            }
            if (zone.rule().maximumLotSizeSqm() != null) {
                if (zone.rule().minimumLotSizeSqm() != null) {
                    builder.append(", ");
                }
                builder.append("max ").append(format(zone.rule().maximumLotSizeSqm())).append(" sqm");
            }
            if (zone.rule().minimumLotSizeSqm() == null && zone.rule().maximumLotSizeSqm() == null) {
                builder.append("project-specific review");
            }
            parts.add(builder.toString());
        }
        return parts.isEmpty() ? "No explicit lot-size thresholds were available; manual review is required." : String.join("; ", parts);
    }

    private LandUseCheck evaluateProposedLandUse(String proposedLandUse, List<PlannerDtos.ParcelZoneResponse> zones) {
        if (proposedLandUse == null || proposedLandUse.isBlank()) {
            return new LandUseCheck(
                    "WARN",
                    "No proposed land use was supplied. Select a proposed use to compare it with allowed and prohibited zoning uses."
            );
        }

        String normalizedUse = normalizeUse(proposedLandUse);
        List<String> prohibitedMatches = new ArrayList<>();
        List<String> allowedMatches = new ArrayList<>();
        List<String> unknownZones = new ArrayList<>();

        for (PlannerDtos.ParcelZoneResponse zone : zones) {
            if (zone.rule() == null) {
                unknownZones.add(zone.zoneCode());
                continue;
            }

            boolean prohibited = zone.rule().prohibitedUses().stream()
                    .anyMatch(ruleUse -> useMatches(normalizedUse, ruleUse));
            if (prohibited) {
                prohibitedMatches.add(zone.zoneCode());
                continue;
            }

            boolean allowed = zone.rule().allowedUses().stream()
                    .anyMatch(ruleUse -> useMatches(normalizedUse, ruleUse));
            if (allowed) {
                allowedMatches.add(zone.zoneCode());
            } else {
                unknownZones.add(zone.zoneCode());
            }
        }

        if (!prohibitedMatches.isEmpty()) {
            return new LandUseCheck(
                    "FAIL",
                    "Proposed land use '" + proposedLandUse + "' is listed as prohibited or incompatible in zone(s): "
                            + String.join(", ", prohibitedMatches) + "."
            );
        }

        if (unknownZones.isEmpty()) {
            return new LandUseCheck(
                    "PASS",
                    "Proposed land use '" + proposedLandUse + "' is listed as allowed in the applicable zone(s): "
                            + String.join(", ", allowedMatches) + "."
            );
        }

        if (!allowedMatches.isEmpty()) {
            return new LandUseCheck(
                    "WARN",
                    "Proposed land use '" + proposedLandUse + "' is allowed in zone(s) "
                            + String.join(", ", allowedMatches)
                            + " but needs review in zone(s): " + String.join(", ", unknownZones) + "."
            );
        }

        return new LandUseCheck(
                "WARN",
                "Proposed land use '" + proposedLandUse + "' is not explicitly listed as allowed or prohibited in the applicable rule text. Treat as needs review."
        );
    }

    private boolean useMatches(String normalizedUse, String ruleUse) {
        String normalizedRule = normalizeUse(ruleUse);
        return !normalizedRule.isBlank()
                && (normalizedRule.contains(normalizedUse) || normalizedUse.contains(normalizedRule));
    }

    private String normalizeUse(String value) {
        return value == null
                ? ""
                : value.toLowerCase(Locale.ROOT)
                .replace("/", " ")
                .replace("-", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String buildRestrictedSummary(List<PlannerDtos.PlotResultResponse> plots) {
        List<String> overlaps = plots.stream()
                .flatMap(plot -> plot.restrictedOverlaps().stream())
                .distinct()
                .toList();
        return overlaps.isEmpty()
                ? "No restricted-zone overlap was detected from the currently loaded masterplan and overlay data."
                : "Restricted overlap detected with " + String.join(", ", overlaps) + ".";
    }

    private String strictestConstraintStatus(List<PlannerDtos.PlotResultResponse> plots) {
        String status = "PASS";
        for (PlannerDtos.PlotResultResponse plot : plots) {
            if (!plot.restrictedOverlaps().isEmpty()) {
                if (plot.restrictedOverlaps().stream().allMatch(this::isWarnOnlyConstraint)) {
                    status = severity("WARN") > severity(status) ? "WARN" : status;
                } else {
                    status = "FAIL";
                }
            }
        }
        return status;
    }

    private boolean isWarnOnlyConstraint(String zoneCode) {
        String code = zoneCode == null ? "" : zoneCode.toUpperCase(Locale.ROOT);
        return code.equals("P3C") || code.equals("T") || code.equals("U") || code.startsWith("PF") || code.equals("PA");
    }

    private boolean hasReviewRule(List<ZoneRecord> zones) {
        return zones.stream().anyMatch(zone -> "NEEDS_REVIEW".equalsIgnoreCase(zone.rule().subdivisionStatus()));
    }

    private boolean isConstraintZone(ZoneRecord zone) {
        String category = zone.rule().category() == null ? "" : zone.rule().category().toLowerCase(Locale.ROOT);
        String code = zone.zoneCode() == null ? "" : zone.zoneCode().toUpperCase(Locale.ROOT);
        return category.contains("wetland")
                || category.contains("buffer")
                || category.contains("water body")
                || category.contains("transport")
                || category.contains("utility")
                || category.contains("slope")
                || category.contains("forest")
                || code.startsWith("PF")
                || code.equals("PA");
    }

    private String mapRuleToCheckStatus(String subdivisionStatus) {
        if (subdivisionStatus == null) {
            return "WARN";
        }
        return switch (subdivisionStatus.toUpperCase(Locale.ROOT)) {
            case "ALLOWED" -> "PASS";
            case "NOT_RECOMMENDED" -> "FAIL";
            default -> "WARN";
        };
    }

    private int severity(String status) {
        if (status == null) {
            return 0;
        }
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "FAIL", "NOT_RECOMMENDED" -> 3;
            case "WARN", "NEEDS_REVIEW" -> 2;
            case "PASS", "ALLOWED" -> 1;
            default -> 0;
        };
    }

    private String deriveRecommendation(List<PlannerDtos.CheckResultResponse> checks) {
        boolean anyFail = checks.stream().anyMatch(check -> "FAIL".equalsIgnoreCase(check.status()));
        if (anyFail) {
            return "Not recommended";
        }
        boolean anyWarn = checks.stream().anyMatch(check -> "WARN".equalsIgnoreCase(check.status()));
        if (anyWarn) {
            return "Needs review";
        }
        return "Likely compliant";
    }

    private int calculateComplianceScore(List<PlannerDtos.CheckResultResponse> checks,
                                         List<PlannerDtos.PlotResultResponse> plots,
                                         double areaDeltaSqm,
                                         double parentAreaSqm) {
        int score = 100;
        for (PlannerDtos.CheckResultResponse check : checks) {
            String status = check.status() == null ? "" : check.status().toUpperCase(Locale.ROOT);
            if ("FAIL".equals(status)) {
                score -= switch (check.code()) {
                    case "INSIDE_PARENT", "INTERNAL_OVERLAP", "RESTRICTED_ZONES", "LAND_USE" -> 22;
                    case "LOT_SIZE" -> 18;
                    default -> 14;
                };
            } else if ("WARN".equals(status)) {
                score -= switch (check.code()) {
                    case "AREA_BALANCE" -> areaBalancePenalty(areaDeltaSqm, parentAreaSqm);
                    case "ZONING", "LAND_USE" -> 8;
                    case "ACCESS" -> 6;
                    case "BUILDING_FOOTPRINTS", "SLOPE" -> 10;
                    default -> 5;
                };
            }
        }

        long failedPlots = plots.stream().filter(plot -> "FAIL".equalsIgnoreCase(plot.status())).count();
        long warnedPlots = plots.stream()
                .filter(plot -> "WARN".equalsIgnoreCase(plot.status()))
                .filter(plot -> !isRoadAccessOnlyWarning(plot))
                .count();
        score -= (int) Math.min(15, failedPlots * 5 + warnedPlots * 2);
        return Math.max(0, Math.min(100, score));
    }

    private boolean isRoadAccessOnlyWarning(PlannerDtos.PlotResultResponse plot) {
        if (!plot.insideParent() || !plot.lotSizePass() || plot.buildingSplit() || plot.slopeRestricted()
                || !plot.restrictedOverlaps().isEmpty()) {
            return false;
        }
        return plot.notes().stream().allMatch(note -> note.toLowerCase(Locale.ROOT).contains("transportation-zone frontage"));
    }

    private int areaBalancePenalty(double areaDeltaSqm, double parentAreaSqm) {
        if (parentAreaSqm <= 0) {
            return 5;
        }
        double ratio = Math.min(1d, Math.abs(areaDeltaSqm) / parentAreaSqm);
        return ratio > 0.75d ? 10 : ratio > 0.35d ? 7 : 4;
    }

    private List<String> missingConstraintWarnings(Connection connection) throws SQLException {
        Set<String> availableZoneCodes = new HashSet<>();
        try (PreparedStatement statement = connection.prepareStatement("SELECT DISTINCT zone_code FROM masterplan_zones");
             ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                availableZoneCodes.add(resultSet.getString(1));
            }
        }
        List<String> warnings = new ArrayList<>();
        List<String> missing = List.of("C4", "A2", "W1A", "W1B", "WB", "B1", "B2", "B3", "B4");
        List<String> missingFromLayer = missing.stream()
                .filter(code -> !availableZoneCodes.contains(code))
                .toList();
        if (!missingFromLayer.isEmpty()) {
            warnings.add("The supplied Kigali masterplan layer does not contain explicit geometries for " + String.join(", ", missingFromLayer)
                    + ". Their rules are loaded from the PDF, but overlap checks can only use features that exist in the provided GIS layers.");
        }
        return warnings;
    }

    private long insertProposal(Connection connection, PlannerDtos.SubdivisionCheckRequest request, String createdAt) throws SQLException {
        String parentUpi = fetchParcel(connection, request.parcelId()).upi();
        String sql = """
                INSERT INTO subdivision_proposals (parcel_id, parent_upi, proposed_land_use, proposal_geojson, created_at)
                VALUES (?, ?, ?, ?, ?)
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            statement.setLong(1, request.parcelId());
            statement.setString(2, parentUpi);
            statement.setString(3, request.proposedLandUse());
            statement.setString(4, request.proposalGeoJson());
            statement.setString(5, createdAt);
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getLong(1);
                }
            }
        }
        throw new SQLException("Failed to create subdivision proposal record.");
    }

    private long insertReport(Connection connection,
                              long proposalId,
                              PlannerDtos.SubdivisionCheckResponse report,
                              String markdown,
                              String createdAt) throws SQLException {
        String sql = """
                INSERT INTO compliance_reports (proposal_id, parcel_id, parent_upi, recommendation, overall_status, report_json, report_markdown, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """;
        String overallStatus = report.checks().stream().anyMatch(check -> "FAIL".equalsIgnoreCase(check.status())) ? "FAIL"
                : report.checks().stream().anyMatch(check -> "WARN".equalsIgnoreCase(check.status())) ? "WARN" : "PASS";
        try (PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            statement.setLong(1, proposalId);
            statement.setLong(2, report.parcel().id());
            statement.setString(3, report.parcel().upi());
            statement.setString(4, report.recommendation());
            statement.setString(5, overallStatus);
            statement.setString(6, writeJson(report));
            statement.setString(7, markdown);
            statement.setString(8, createdAt);
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getLong(1);
                }
            }
        }
        throw new SQLException("Failed to create compliance report record.");
    }

    private String buildReportMarkdown(PlannerDtos.SubdivisionCheckResponse report) {
        StringBuilder builder = new StringBuilder();
        builder.append("# Subdivision Compliance Report\n\n");
        builder.append("- Parent parcel UPI: `").append(report.parcel().upi()).append("`\n");
        builder.append("- Administrative location: ")
                .append(report.parcel().province()).append(", ")
                .append(report.parcel().district()).append(", ")
                .append(report.parcel().sector()).append(", ")
                .append(report.parcel().cell()).append(", ")
                .append(report.parcel().village()).append("\n");
        builder.append("- Parent parcel area: `").append(format(report.parentAreaSqm())).append(" sqm`\n");
        builder.append("- Proposed number of plots: `").append(report.proposedPlotCount()).append("`\n");
        builder.append("- Proposed area total: `").append(format(report.proposedAreaSqm())).append(" sqm`\n");
        builder.append("- Recommendation: **").append(report.recommendation()).append("**\n\n");
        builder.append("- Compliance score: `").append(report.complianceScore()).append("/100`\n\n");

        builder.append("## Zoning\n\n");
        for (PlannerDtos.ParcelZoneResponse zone : report.zoning()) {
            builder.append("- `").append(zone.zoneCode()).append("` ")
                    .append(zone.zoning()).append(" | overlap ")
                    .append(format(zone.overlapAreaSqm())).append(" sqm (")
                    .append(format(zone.overlapPercentOfParcel())).append("% of parcel)")
                    .append(" | status ")
                    .append(zone.rule() != null ? zone.rule().subdivisionStatus() : "NEEDS_REVIEW")
                    .append("\n");
        }

        builder.append("\n## Checks\n\n");
        for (PlannerDtos.CheckResultResponse check : report.checks()) {
            builder.append("- [").append(check.status()).append("] ")
                    .append(check.label()).append(": ")
                    .append(check.detail()).append("\n");
        }

        builder.append("\n## Plot Results\n\n");
        for (PlannerDtos.PlotResultResponse plot : report.plots()) {
            builder.append("- Plot ").append(plot.plotNumber())
                    .append(" | status ").append(plot.status())
                    .append(" | area ").append(format(plot.areaSqm())).append(" sqm")
                    .append(" | zones ").append(String.join(", ", plot.zoneCodes()))
                    .append("\n");
            for (String note : plot.notes()) {
                builder.append("  - ").append(note).append("\n");
            }
        }

        if (!report.warnings().isEmpty()) {
            builder.append("\n## Warnings\n\n");
            for (String warning : report.warnings()) {
                builder.append("- ").append(warning).append("\n");
            }
        }

        builder.append("\n## Disclaimer\n\n");
        builder.append(DISCLAIMER).append("\n");
        return builder.toString();
    }

    private void writePdfTextPages(PDDocument document, List<PdfLine> lines) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        PDPageContentStream content = new PDPageContentStream(document, page);
        float y = page.getMediaBox().getHeight() - PDF_MARGIN;
        boolean textStarted = false;

        for (PdfLine line : lines) {
            if (!textStarted) {
                content.beginText();
                content.newLineAtOffset(PDF_MARGIN, y);
                textStarted = true;
            }

            if (y <= PDF_MARGIN) {
                content.endText();
                content.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                content = new PDPageContentStream(document, page);
                y = page.getMediaBox().getHeight() - PDF_MARGIN;
                content.beginText();
                content.newLineAtOffset(PDF_MARGIN, y);
            }

            content.setFont(line.bold() ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA,
                    line.title() ? PDF_TITLE_SIZE : PDF_FONT_SIZE);
            content.showText(line.text());
            content.newLineAtOffset(0, -PDF_LEADING);
            y -= PDF_LEADING;
        }

        if (textStarted) {
            content.endText();
        }
        content.close();
    }

    private void drawSubdivisionLayoutPage(PDDocument document,
                                           PlannerDtos.SubdivisionCheckResponse report,
                                           List<ProposalPlot> proposalPlots) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        PDRectangle box = page.getMediaBox();
        try (PDPageContentStream content = new PDPageContentStream(document, page)) {
            float width = box.getWidth();
            float height = box.getHeight();
            float y = height - PDF_MARGIN;

            // Stats count for dynamic top summary
            int passedCount = 0;
            int warnCount = 0;
            int failedCount = 0;
            if (report.checks() != null) {
                for (PlannerDtos.CheckResultResponse check : report.checks()) {
                    if ("PASS".equalsIgnoreCase(check.status())) {
                        passedCount++;
                    } else if ("WARN".equalsIgnoreCase(check.status())) {
                        warnCount++;
                    } else if ("FAIL".equalsIgnoreCase(check.status())) {
                        failedCount++;
                    }
                }
            }

            // Redesigned premium header with white/cream area
            content.setNonStrokingColor(new Color(253, 254, 251)); // premium cream/white
            content.addRect(0, height - 105, width, 105);
            content.fill();

            // Divider green brand line at bottom of header
            content.setStrokingColor(new Color(6, 63, 53)); // brand.deep green
            content.setLineWidth(2f);
            content.moveTo(PDF_MARGIN, height - 105f);
            content.lineTo(width - PDF_MARGIN, height - 105f);
            content.stroke();

            float textX = PDF_MARGIN;
            if (pdfBrandingSupport.hasLogo(PdfBrandingSupport.LogoVariant.DARK)) {
                pdfBrandingSupport.drawLogo(document, content, PDF_MARGIN, height - 28f, 110f, PdfBrandingSupport.LogoVariant.DARK);
                textX = PDF_MARGIN + 125f;
            }

            drawText(content, "Subdivision Layout Report", textX, height - 38, 18, true, new Color(16, 32, 27)); // brand.ink
            drawText(content, "Preliminary parcel review, measurement schedule, and compliance summary.", textX, height - 56, 8.5f, false, new Color(100, 116, 139)); // slate
            
            // Format dynamic date
            String dateText = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
                    .withZone(java.time.ZoneId.of("Africa/Kigali"))
                    .format(java.time.Instant.now()) + " CAT";

            drawText(content, "Parent UPI: " + report.parcel().upi() + "  |  Rec: " + report.recommendation()
                    + "  |  Score: " + report.complianceScore() + "/100  |  Date: " + dateText, textX, height - 76, 9f, true, new Color(6, 63, 53));

            Geometry parent = parseGeometry(report.parcel().geometryGeoJson());
            List<PlotMeasurement> measurements = buildPlotMeasurements(report, proposalPlots);
            List<Geometry> geometries = new ArrayList<>();
            geometries.add(parent);
            proposalPlots.forEach(plot -> geometries.add(plot.geometry()));

            float mapBottom = 275f;
            float mapHeight = 420f;
            float mapWidth = 277f; // shrunk to allow wider right compliance panel
            PdfMapTransform transform = mapTransform(geometries, PDF_MARGIN, mapBottom, mapWidth, mapHeight);

            content.setNonStrokingColor(new Color(248, 248, 244));
            content.addRect(PDF_MARGIN, mapBottom, mapWidth, mapHeight);
            content.fill();
            content.setStrokingColor(new Color(210, 204, 190));
            content.addRect(PDF_MARGIN, mapBottom, mapWidth, mapHeight);
            content.stroke();

            drawGeometry(content, parent, transform, new Color(18, 78, 68), new Color(31, 111, 95, 24), 2.5f);
            Color[] fills = {
                    new Color(37, 99, 235, 82),
                    new Color(20, 184, 166, 78),
                    new Color(245, 158, 11, 86),
                    new Color(168, 85, 247, 78),
                    new Color(239, 68, 68, 72)
            };
            for (int i = 0; i < proposalPlots.size(); i++) {
                ProposalPlot plot = proposalPlots.get(i);
                drawGeometry(content, plot.geometry(), transform, new Color(21, 89, 219), fills[i % fills.length], 2.2f);
                Coordinate centroid = plot.geometry().getCentroid().getCoordinate();
                float[] point = transform.toPage(centroid);

                int plotNum = i + 1;
                String plotStatus = "PASS";
                if (report.plots() != null) {
                    for (PlannerDtos.PlotResultResponse pr : report.plots()) {
                        if (pr.plotNumber() == plotNum) {
                            plotStatus = pr.status() != null ? pr.status() : "PASS";
                            break;
                        }
                    }
                }

                Color statusColor = new Color(16, 185, 129); // PASS
                if ("FAIL".equalsIgnoreCase(plotStatus)) {
                    statusColor = new Color(239, 68, 68);
                } else if ("WARN".equalsIgnoreCase(plotStatus)) {
                    statusColor = new Color(245, 158, 11);
                }

                float labelWidth = 38f;
                float labelHeight = 11f;
                float rectX = point[0] - labelWidth / 2f;
                float rectY = point[1] - labelHeight / 2f;

                content.setNonStrokingColor(statusColor);
                content.addRect(rectX, rectY, labelWidth, labelHeight);
                content.fill();

                content.setStrokingColor(Color.WHITE);
                content.setLineWidth(0.8f);
                content.addRect(rectX, rectY, labelWidth, labelHeight);
                content.stroke();

                drawText(content, "P" + plotNum + " " + plotStatus.toUpperCase(), rectX + 3f, rectY + 2.5f, 6.5f, true, Color.WHITE);
            }

            // Draw Compliance Checklist on the right side of the subdivided parcels map
            float rightPanelWidth = 210f; // wider panel for better text readability
            float rightPanelX = width - PDF_MARGIN - rightPanelWidth;

            content.setNonStrokingColor(new Color(250, 250, 247)); // premium cream/off-white background
            content.addRect(rightPanelX, mapBottom, rightPanelWidth, mapHeight);
            content.fill();
            content.setStrokingColor(new Color(220, 215, 200));
            content.setLineWidth(1f);
            content.addRect(rightPanelX, mapBottom, rightPanelWidth, mapHeight);
            content.stroke();

            // Panel Title
            drawText(content, "Compliance Audit", rightPanelX + 12f, mapBottom + mapHeight - 20f, 11, true, new Color(18, 78, 68));

            // Stats Box
            float statsY = mapBottom + mapHeight - 55f;
            content.setNonStrokingColor(new Color(240, 243, 238)); // subtle green-gray box
            content.addRect(rightPanelX + 10f, statsY, rightPanelWidth - 20f, 28f);
            content.fill();
            content.setStrokingColor(new Color(215, 222, 210));
            content.addRect(rightPanelX + 10f, statsY, rightPanelWidth - 20f, 28f);
            content.stroke();

            drawText(content, "Passed: " + passedCount, rightPanelX + 16f, statsY + 16f, 8, true, new Color(16, 185, 129));
            drawText(content, "Warnings: " + (warnCount + failedCount), rightPanelX + 16f, statsY + 6f, 8, true, new Color(245, 158, 11));
            drawText(content, "Score: " + report.complianceScore() + "/100", rightPanelX + 110f, statsY + 11f, 8.5f, true, new Color(6, 63, 53));

            float checkY = statsY - 18f;
            if (report.checks() != null) {
                for (PlannerDtos.CheckResultResponse check : report.checks()) {
                    if (checkY < mapBottom + 20f) break;

                    Color statusColor = new Color(16, 185, 129); // PASS
                    if ("FAIL".equalsIgnoreCase(check.status())) {
                        statusColor = new Color(239, 68, 68); // FAIL
                    } else if ("WARN".equalsIgnoreCase(check.status())) {
                        statusColor = new Color(245, 158, 11); // WARN
                    }

                    List<String> labelLines = wrapTextToLines(check.label(), PDType1Font.HELVETICA_BOLD, 7.5f, rightPanelWidth - 62f);
                    if (labelLines.isEmpty()) {
                        labelLines.add("N/A");
                    }

                    // Badge
                    content.setNonStrokingColor(statusColor);
                    content.addRect(rightPanelX + 12f, checkY - 2f, 32f, 10f);
                    content.fill();

                    String badgeStatus = check.status() != null ? check.status().toUpperCase() : "PASS";
                    drawText(content, badgeStatus, rightPanelX + 15f, checkY + 0.5f, 6.5f, true, Color.WHITE);

                    // Wrapped lines
                    float lineY = checkY + 0.5f;
                    for (int lineIdx = 0; lineIdx < labelLines.size(); lineIdx++) {
                        if (lineY < mapBottom + 8f) break;
                        drawText(content, labelLines.get(lineIdx), rightPanelX + 48f, lineY, 7.5f, true, Color.DARK_GRAY);
                        lineY -= 9.5f;
                    }

                    float itemHeight = Math.max(16f, 6f + labelLines.size() * 9.5f);
                    checkY -= itemHeight;
                }
            }

            drawText(content, "Figure 1. Proposed subdivision layout (schematic, derived from submitted GeoJSON).",
                    PDF_MARGIN, 252f, 9, true, Color.DARK_GRAY);
            drawText(content, "Green outline = parent parcel. Blue polygons = proposed plots. Measurements are approximate and must be confirmed by survey.",
                    PDF_MARGIN, 238f, 8, false, Color.DARK_GRAY);

            float tableY = 210f;
            drawText(content, "Plot Measurements", PDF_MARGIN, tableY, 12, true, Color.BLACK);
            tableY -= 18f;
            drawText(content, "Plot", PDF_MARGIN, tableY, 9, true, Color.BLACK);
            drawText(content, "Area (sqm)", PDF_MARGIN + 58, tableY, 9, true, Color.BLACK);
            drawText(content, "Approx. side lengths (m)", PDF_MARGIN + 130, tableY, 9, true, Color.BLACK);
            tableY -= 12f;
            content.setStrokingColor(new Color(210, 204, 190));
            content.moveTo(PDF_MARGIN, tableY + 5);
            content.lineTo(width - PDF_MARGIN, tableY + 5);
            content.stroke();

            drawText(content, "Parent", PDF_MARGIN, tableY, 8, true, Color.BLACK);
            drawText(content, format(report.parentAreaSqm()), PDF_MARGIN + 58, tableY, 8, false, Color.BLACK);
            drawText(content, sideLengthSummary(parent, 10), PDF_MARGIN + 130, tableY, 8, false, Color.BLACK);
            tableY -= 13f;

            for (PlotMeasurement measurement : measurements) {
                if (tableY < PDF_MARGIN + 20) break;
                drawText(content, "P" + measurement.plotNumber(), PDF_MARGIN, tableY, 8, true, Color.BLACK);
                drawText(content, format(measurement.areaSqm()), PDF_MARGIN + 58, tableY, 8, false, Color.BLACK);
                drawText(content, measurement.sideSummary(), PDF_MARGIN + 130, tableY, 8, false, Color.BLACK);
                tableY -= 13f;
            }
        }
    }

    private List<String> wrapTextToLines(String text, org.apache.pdfbox.pdmodel.font.PDFont font, float fontSize, float maxWidth) throws java.io.IOException {
        List<String> wrappedLines = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return wrappedLines;
        }

        String[] words = text.split(" ");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            if (word.isEmpty()) continue;
            String testLine = currentLine.length() == 0 ? word : currentLine + " " + word;
            String cleaned = testLine.replaceAll("[^\\x20-\\x7E]", "");
            float width = font.getStringWidth(cleaned) / 1000f * fontSize;
            if (width > maxWidth) {
                if (currentLine.length() > 0) {
                    wrappedLines.add(currentLine.toString());
                    currentLine = new StringBuilder(word);
                } else {
                    wrappedLines.add(word);
                    currentLine = new StringBuilder();
                }
            } else {
                currentLine = new StringBuilder(testLine);
            }
        }
        if (currentLine.length() > 0) {
            wrappedLines.add(currentLine.toString());
        }
        return wrappedLines;
    }

    private void drawIndividualPlotPages(PDDocument document,
                                         PlannerDtos.SubdivisionCheckResponse report,
                                         List<ProposalPlot> proposalPlots) throws Exception {
        List<PlotMeasurement> measurements = buildPlotMeasurements(report, proposalPlots);
        for (int i = 0; i < proposalPlots.size(); i++) {
            ProposalPlot plot = proposalPlots.get(i);
            PlotMeasurement measurement = measurements.get(i);
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDRectangle box = page.getMediaBox();
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float width = box.getWidth();
                float height = box.getHeight();

                content.setNonStrokingColor(new Color(18, 78, 68));
                content.addRect(0, height - 92, width, 92);
                content.fill();

                float textX = PDF_MARGIN;
                if (pdfBrandingSupport.hasLogo(PdfBrandingSupport.LogoVariant.LIGHT)) {
                    pdfBrandingSupport.drawLogo(document, content, PDF_MARGIN, height - 26f, 90f, PdfBrandingSupport.LogoVariant.LIGHT);
                    textX = PDF_MARGIN + 105f;
                }

                drawText(content, "Individual Plot Detail - P" + (i + 1), textX, height - 38, 16, true, Color.WHITE);
                drawText(content, "Parent UPI: " + report.parcel().upi(), textX, height - 56, 10, false, new Color(255, 255, 255, 192));

                float mapWidth = width * 0.58f;
                float mapHeight = 300f;
                float mapLeft = (width - mapWidth) / 2f;
                float mapBottom = 345f;
                content.setNonStrokingColor(new Color(249, 249, 246));
                content.addRect(mapLeft, mapBottom, mapWidth, mapHeight);
                content.fill();
                content.setStrokingColor(new Color(205, 199, 187));
                content.addRect(mapLeft, mapBottom, mapWidth, mapHeight);
                content.stroke();

                PdfMapTransform transform = mapTransform(List.of(plot.geometry()), mapLeft, mapBottom, mapWidth, mapHeight);
                drawGeometry(content, plot.geometry(), transform, new Color(21, 89, 219), new Color(255, 255, 255, 0), 2.8f);
                drawSideLengthLabels(content, plot.geometry(), transform);

                Coordinate centroid = plot.geometry().getCentroid().getCoordinate();
                float[] center = transform.toPage(centroid);
                drawText(content, "P" + (i + 1), center[0] - 9, center[1] - 4, 13, true, Color.BLACK);

                float infoY = 285f;
                drawText(content, "Plot P" + (i + 1) + " Summary", PDF_MARGIN, infoY, 14, true, Color.BLACK);
                infoY -= 22f;
                drawText(content, "Area: " + format(measurement.areaSqm()) + " square meters", PDF_MARGIN, infoY, 11, true, Color.BLACK);
                infoY -= 18f;
                drawText(content, "Approximate side lengths: " + measurement.sideSummary(), PDF_MARGIN, infoY, 9, false, Color.DARK_GRAY);
                infoY -= 18f;
                PlannerDtos.PlotResultResponse plotResult = i < report.plots().size() ? report.plots().get(i) : null;
                if (plotResult != null) {
                    drawText(content, "Status: " + plotResult.status()
                            + " | Inside parent: " + (plotResult.insideParent() ? "Yes" : "No")
                            + " | Lot size: " + (plotResult.lotSizePass() ? "Pass" : "Review")
                            + " | Road access: " + (plotResult.roadAccessPass() ? "Detected" : "Needs review"),
                            PDF_MARGIN, infoY, 9, false, Color.DARK_GRAY);
                }
                drawText(content, "Note: dimensions are approximate GIS-derived measurements and do not replace a licensed survey.",
                        PDF_MARGIN, 52f, 8, false, Color.DARK_GRAY);
            }
        }
    }

    private List<PdfLine> buildPdfLines(PlannerDtos.SubdivisionCheckResponse report, List<ProposalPlot> proposalPlots) {
        List<PdfLine> lines = new ArrayList<>();
        lines.add(new PdfLine("GeoSmart Manager - Subdivision Compliance Report", true, true));
        lines.add(new PdfLine("Generated preliminary planning report", false, false));
        lines.add(new PdfLine(" ", false, false));

        addWrapped(lines, "Parent parcel UPI: " + report.parcel().upi(), true);
        addWrapped(lines, "Administrative location: " + String.join(", ", List.of(
                nullSafe(report.parcel().province()),
                nullSafe(report.parcel().district()),
                nullSafe(report.parcel().sector()),
                nullSafe(report.parcel().cell()),
                nullSafe(report.parcel().village())
        )), false);
        addWrapped(lines, "Parent parcel area: " + format(report.parentAreaSqm()) + " sqm", false);
        addWrapped(lines, "Parent parcel approximate side lengths: "
                + sideLengthSummary(parseGeometry(report.parcel().geometryGeoJson()), 12), false);
        addWrapped(lines, "Proposed plots: " + report.proposedPlotCount(), false);
        addWrapped(lines, "Proposed area total: " + format(report.proposedAreaSqm()) + " sqm", false);
        addWrapped(lines, "Recommendation: " + report.recommendation(), true);
        addWrapped(lines, "Compliance score: " + report.complianceScore() + "/100", true);

        addSection(lines, "Zoning");
        for (PlannerDtos.ParcelZoneResponse zone : report.zoning()) {
            addWrapped(lines, "- " + zone.zoneCode() + " " + zone.zoning()
                    + " | overlap " + format(zone.overlapAreaSqm()) + " sqm"
                    + " | status " + (zone.rule() != null ? zone.rule().subdivisionStatus() : "NEEDS_REVIEW"), false);
        }

        addSection(lines, "Compliance Checks");
        for (PlannerDtos.CheckResultResponse check : report.checks()) {
            addWrapped(lines, "[" + check.status() + "] " + check.label() + ": " + check.detail(), false);
        }

        addSection(lines, "Plot Results");
        List<PlotMeasurement> measurements = buildPlotMeasurements(report, proposalPlots);
        for (PlannerDtos.PlotResultResponse plot : report.plots()) {
            PlotMeasurement measurement = measurements.stream()
                    .filter(item -> item.plotNumber() == plot.plotNumber())
                    .findFirst()
                    .orElse(null);
            addWrapped(lines, "Plot " + plot.plotNumber()
                    + " | status " + plot.status()
                    + " | area " + format(plot.areaSqm()) + " sqm"
                    + " | inside parent " + (plot.insideParent() ? "Yes" : "No")
                    + " | building split " + (plot.buildingSplit() ? "Yes" : "No")
                    + " | slope overlap " + (plot.slopeRestricted() ? "Yes" : "No"), true);
            addWrapped(lines, "Zones: " + String.join(", ", plot.zoneCodes()), false);
            if (!plot.restrictedOverlaps().isEmpty()) {
                addWrapped(lines, "Restricted overlaps: " + String.join(", ", plot.restrictedOverlaps()), false);
            }
            if (measurement != null) {
                addWrapped(lines, "Approximate side lengths: " + measurement.sideSummary(), false);
            }
            for (String note : plot.notes()) {
                addWrapped(lines, "- " + note, false);
            }
        }

        if (!report.warnings().isEmpty()) {
            addSection(lines, "Warnings");
            for (String warning : report.warnings()) {
                addWrapped(lines, "- " + warning, false);
            }
        }

        addSection(lines, "Disclaimer");
        addWrapped(lines, DISCLAIMER, true);
        return lines;
    }

    private void drawText(PDPageContentStream content, String text, float x, float y, float size, boolean bold, Color color)
            throws Exception {
        content.beginText();
        content.setFont(bold ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA, size);
        content.setNonStrokingColor(color);
        content.newLineAtOffset(x, y);
        content.showText(sanitizePdfText(text));
        content.endText();
    }

    private PdfMapTransform mapTransform(List<Geometry> geometries, float left, float bottom, float width, float height) {
        org.locationtech.jts.geom.Envelope envelope = new org.locationtech.jts.geom.Envelope();
        for (Geometry geometry : geometries) {
            if (geometry != null && !geometry.isEmpty()) {
                envelope.expandToInclude(geometry.getEnvelopeInternal());
            }
        }
        if (envelope.isNull()) {
            envelope.expandToInclude(0, 0);
            envelope.expandToInclude(1, 1);
        }
        double dx = Math.max(envelope.getWidth(), 0.000001d);
        double dy = Math.max(envelope.getHeight(), 0.000001d);
        double scale = Math.min(width / dx, height / dy) * 0.88d;
        float offsetX = (float) (left + (width - (dx * scale)) / 2d);
        float offsetY = (float) (bottom + (height - (dy * scale)) / 2d);
        return new PdfMapTransform(envelope.getMinX(), envelope.getMaxY(), scale, offsetX, offsetY);
    }

    private void drawGeometry(PDPageContentStream content,
                              Geometry geometry,
                              PdfMapTransform transform,
                              Color stroke,
                              Color fill,
                              float lineWidth) throws Exception {
        if (geometry == null || geometry.isEmpty()) return;
        if (geometry instanceof Polygon polygon) {
            drawPolygon(content, polygon, transform, stroke, fill, lineWidth);
            return;
        }
        for (int i = 0; i < geometry.getNumGeometries(); i++) {
            drawGeometry(content, geometry.getGeometryN(i), transform, stroke, fill, lineWidth);
        }
    }

    private void drawPolygon(PDPageContentStream content,
                             Polygon polygon,
                             PdfMapTransform transform,
                             Color stroke,
                             Color fill,
                             float lineWidth) throws Exception {
        Coordinate[] coordinates = polygon.getExteriorRing().getCoordinates();
        if (coordinates.length < 2) return;
        float[] first = transform.toPage(coordinates[0]);
        content.moveTo(first[0], first[1]);
        for (int i = 1; i < coordinates.length; i++) {
            float[] point = transform.toPage(coordinates[i]);
            content.lineTo(point[0], point[1]);
        }
        content.closePath();
        content.setNonStrokingColor(fill);
        content.setStrokingColor(stroke);
        content.setLineWidth(lineWidth);
        content.fillAndStroke();
    }

    private void drawSideLengthLabels(PDPageContentStream content, Geometry geometry, PdfMapTransform transform) throws Exception {
        Polygon polygon = firstPolygon(geometry);
        if (polygon == null) return;
        Coordinate[] coordinates = polygon.getExteriorRing().getCoordinates();
        Coordinate centroid = polygon.getCentroid().getCoordinate();
        float[] center = transform.toPage(centroid);
        for (int i = 1; i < coordinates.length; i++) {
            double meters = distanceMeters(coordinates[i - 1], coordinates[i]);
            if (meters < 0.5d) continue;
            Coordinate midpoint = new Coordinate(
                    (coordinates[i - 1].x + coordinates[i].x) / 2d,
                    (coordinates[i - 1].y + coordinates[i].y) / 2d
            );
            float[] point = transform.toPage(midpoint);
            float dx = point[0] - center[0];
            float dy = point[1] - center[1];
            float length = (float) Math.max(1d, Math.sqrt((dx * dx) + (dy * dy)));
            drawMeasurementTag(content, format(meters) + " m", point[0] + (dx / length) * 16f, point[1] + (dy / length) * 16f);
        }
    }

    private void drawMeasurementTag(PDPageContentStream content, String text, float x, float y) throws Exception {
        String clean = sanitizePdfText(text);
        float boxWidth = Math.max(34f, clean.length() * 4.8f + 8f);
        float boxHeight = 14f;
        content.setNonStrokingColor(new Color(255, 255, 255));
        content.addRect(x - (boxWidth / 2f), y - 5f, boxWidth, boxHeight);
        content.fill();
        content.setStrokingColor(new Color(80, 80, 80));
        content.setLineWidth(0.35f);
        content.addRect(x - (boxWidth / 2f), y - 5f, boxWidth, boxHeight);
        content.stroke();
        drawText(content, clean, x - (boxWidth / 2f) + 4f, y - 1f, 7f, true, Color.BLACK);
    }

    private List<PlotMeasurement> buildPlotMeasurements(PlannerDtos.SubdivisionCheckResponse report, List<ProposalPlot> proposalPlots) {
        List<PlotMeasurement> measurements = new ArrayList<>();
        for (int i = 0; i < proposalPlots.size(); i++) {
            ProposalPlot plot = proposalPlots.get(i);
            double area = i < report.plots().size() && report.plots().get(i).areaSqm() != null
                    ? report.plots().get(i).areaSqm()
                    : areaSqm(plot.geometry());
            measurements.add(new PlotMeasurement(i + 1, area, sideLengthSummary(plot.geometry(), 10)));
        }
        return measurements;
    }

    private String sideLengthSummary(Geometry geometry, int limit) {
        List<Double> sideLengths = exteriorSideLengthsMeters(geometry);
        String sideSummary = sideLengths.stream()
                .limit(limit)
                .map(value -> format(value) + "m")
                .collect(Collectors.joining(", "));
        if (sideLengths.size() > limit) {
            sideSummary += ", ...";
        }
        return sideSummary.isBlank() ? "N/A" : sideSummary;
    }

    private List<Double> exteriorSideLengthsMeters(Geometry geometry) {
        Polygon polygon = firstPolygon(geometry);
        if (polygon == null) return List.of();
        Coordinate[] coordinates = polygon.getExteriorRing().getCoordinates();
        List<Double> lengths = new ArrayList<>();
        for (int i = 1; i < coordinates.length; i++) {
            double distance = distanceMeters(coordinates[i - 1], coordinates[i]);
            if (distance > 0.25d) {
                lengths.add(distance);
            }
        }
        return lengths;
    }

    private Polygon firstPolygon(Geometry geometry) {
        if (geometry instanceof Polygon polygon) return polygon;
        if (geometry == null) return null;
        for (int i = 0; i < geometry.getNumGeometries(); i++) {
            Polygon polygon = firstPolygon(geometry.getGeometryN(i));
            if (polygon != null) return polygon;
        }
        return null;
    }

    private double distanceMeters(Coordinate left, Coordinate right) {
        double earthRadius = 6_371_000d;
        double lat1 = Math.toRadians(left.y);
        double lat2 = Math.toRadians(right.y);
        double deltaLat = Math.toRadians(right.y - left.y);
        double deltaLon = Math.toRadians(right.x - left.x);
        double a = Math.sin(deltaLat / 2d) * Math.sin(deltaLat / 2d)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2d) * Math.sin(deltaLon / 2d);
        double c = 2d * Math.atan2(Math.sqrt(a), Math.sqrt(1d - a));
        return earthRadius * c;
    }

    private void addSection(List<PdfLine> lines, String title) {
        lines.add(new PdfLine(" ", false, false));
        lines.add(new PdfLine(title, true, false));
    }

    private void addWrapped(List<PdfLine> lines, String text, boolean bold) {
        String clean = sanitizePdfText(text);
        int limit = 95;
        while (clean.length() > limit) {
            int split = clean.lastIndexOf(' ', limit);
            if (split < 30) {
                split = limit;
            }
            lines.add(new PdfLine(clean.substring(0, split).trim(), bold, false));
            clean = clean.substring(split).trim();
            bold = false;
        }
        lines.add(new PdfLine(clean.isBlank() ? " " : clean, bold, false));
    }

    private String sanitizePdfText(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("≥", ">=")
                .replace("≤", "<=")
                .replace("–", "-")
                .replace("—", "-")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("’", "'")
                .replaceAll("[^\\x20-\\x7E]", " ");
    }

    private Geometry parseGeometry(String geometryGeoJson) {
        try {
            return geoJsonReader.read(geometryGeoJson);
        } catch (ParseException ex) {
            throw new IllegalArgumentException("Invalid geometry in GIS cache.", ex);
        }
    }

    private Geometry safeIntersection(Geometry left, Geometry right) {
        try {
            return left.intersection(right);
        } catch (Exception ex) {
            return left.buffer(0).intersection(right.buffer(0));
        }
    }

    private Geometry safeDifference(Geometry left, Geometry right) {
        try {
            return left.difference(right);
        } catch (Exception ex) {
            return left.buffer(0).difference(right.buffer(0));
        }
    }

    private double areaSqm(Geometry geometry) {
        if (geometry == null || geometry.isEmpty()) {
            return 0;
        }
        try {
            String geoJson = geoJsonWriter.write(geometry);
            return geoJsonService.extractPolygons(geoJson).stream()
                    .mapToDouble(geoJsonService::computeAreaSqm)
                    .sum();
        } catch (Exception ex) {
            return 0;
        }
    }

    private String featureJson(String geometryGeoJson, Map<String, Object> properties) {
        try {
            Map<String, Object> feature = new LinkedHashMap<>();
            feature.put("type", "Feature");
            feature.put("properties", properties);
            feature.put("geometry", objectMapper.readTree(geometryGeoJson));
            return objectMapper.writeValueAsString(feature);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String featureCollectionJson(List<OverlayFeature> features) {
        try {
            Map<String, Object> collection = new LinkedHashMap<>();
            collection.put("type", "FeatureCollection");
            List<Object> records = new ArrayList<>();
            for (OverlayFeature feature : features) {
                Map<String, Object> node = new LinkedHashMap<>();
                node.put("type", "Feature");
                node.put("id", feature.id());
                node.put("properties", feature.properties());
                node.put("geometry", objectMapper.readTree(feature.geometryGeoJson()));
                records.add(node);
            }
            collection.put("features", records);
            return objectMapper.writeValueAsString(collection);
        } catch (Exception ex) {
            return "{\"type\":\"FeatureCollection\",\"features\":[]}";
        }
    }

    private PlannerDtos.ZoningRuleResponse toRuleResponse(RuleRecord rule) {
        return new PlannerDtos.ZoningRuleResponse(
                rule.zoneCode(),
                rule.displayName(),
                rule.category(),
                rule.subdivisionStatus(),
                rule.minimumLotSizeSqm(),
                rule.maximumLotSizeSqm(),
                rule.allowedUses(),
                rule.prohibitedUses(),
                rule.developmentStrategy(),
                rule.subdivisionGuidance(),
                rule.restrictionSummary(),
                rule.reviewReason(),
                rule.sourcePages()
        );
    }

    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, STRING_LIST_TYPE);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<Integer> readIntegerList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, INTEGER_LIST_TYPE);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String layerNote(Connection connection, String layerKey) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT notes FROM layer_status WHERE layer_key = ?")) {
            statement.setString(1, layerKey);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? resultSet.getString("notes") : null;
            }
        }
    }

    private String normalizeUpi(String upi) {
        return upi == null ? "" : upi.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private String format(Double value) {
        if (value == null) {
            return "0.00";
        }
        return String.format(Locale.US, "%.2f", value);
    }

    private Double getNullableDouble(ResultSet resultSet, String column) throws SQLException {
        double value = resultSet.getDouble(column);
        return resultSet.wasNull() ? null : value;
    }

    private Integer getNullableInt(ResultSet resultSet, String column) throws SQLException {
        int value = resultSet.getInt(column);
        return resultSet.wasNull() ? null : value;
    }

    private Envelope envelopeFor(ParcelRecord parcel, double expandDegrees) {
        return new Envelope(
                parcel.minLon() - expandDegrees,
                parcel.minLat() - expandDegrees,
                parcel.maxLon() + expandDegrees,
                parcel.maxLat() + expandDegrees
        );
    }

    private record ParcelRecord(
            long id,
            String upi,
            int duplicateUpiCount,
            String parcelNumber,
            String province,
            String district,
            String sector,
            String cell,
            String village,
            String status,
            String accuracy,
            Double officialAreaSqm,
            Double calculatedAreaSqm,
            double minLon,
            double minLat,
            double maxLon,
            double maxLat,
            String geometryGeoJson,
            Geometry geometry
    ) {}

    private record RuleRecord(
            String zoneCode,
            String displayName,
            String category,
            String subdivisionStatus,
            Double minimumLotSizeSqm,
            Double maximumLotSizeSqm,
            List<String> allowedUses,
            List<String> prohibitedUses,
            String developmentStrategy,
            String subdivisionGuidance,
            String restrictionSummary,
            String reviewReason,
            List<Integer> sourcePages
    ) {}

    private record ZoneRecord(
            long id,
            String zoneCode,
            String genLu,
            String zoning,
            String phasing,
            String geometryGeoJson,
            Geometry geometry,
            RuleRecord rule
    ) {}

    private record BuildingRecord(
            long id,
            String plusCode,
            int confidence,
            String geometryGeoJson,
            Geometry geometry
    ) {}

    private record OverlayFeature(
            String id,
            String geometryGeoJson,
            Map<String, Object> properties
    ) {}

    private record Proposal(
            List<ProposalPlot> plots
    ) {}

    private record ProposalPlot(
            String featureId,
            Geometry geometry
    ) {}

    private record BuildingSplitRecord(
            long buildingId,
            List<Integer> plotIndexes
    ) {}

    private record PdfLine(
            String text,
            boolean bold,
            boolean title
    ) {}

    private record PlotMeasurement(
            int plotNumber,
            double areaSqm,
            String sideSummary
    ) {}

    private record PdfMapTransform(
            double minX,
            double maxY,
            double scale,
            float offsetX,
            float offsetY
    ) {
        float[] toPage(Coordinate coordinate) {
            return new float[] {
                    (float) (offsetX + ((coordinate.x - minX) * scale)),
                    (float) (offsetY + ((maxY - coordinate.y) * scale))
            };
        }
    }

    private record LandUseCheck(
            String status,
            String detail
    ) {}

    private record Envelope(
            double minLon,
            double minLat,
            double maxLon,
            double maxLat
    ) {}
}
