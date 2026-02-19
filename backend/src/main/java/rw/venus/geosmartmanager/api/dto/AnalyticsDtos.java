package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.DatasetType;

public class AnalyticsDtos {
    public record DatasetAnalysisResponse(
            Long datasetId,
            String datasetName,
            DatasetType datasetType,
            int featureCount,
            int polygonCount,
            double totalAreaSqm,
            double averageAreaSqm,
            double minAreaSqm,
            double maxAreaSqm,
            double centroidLat,
            double centroidLon,
            double minLat,
            double minLon,
            double maxLat,
            double maxLon,
            String upiField,
            int upiFeatureCount,
            int uniqueUpiCount,
            int duplicateUpiCount,
            int missingUpiCount
    ) {}

    public record AuditIntegrityResponse(
            boolean valid,
            java.util.List<Long> brokenIds
    ) {}
}
