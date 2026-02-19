package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.AnalyticsDtos;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.repo.DatasetRepository;

@Service
public class DatasetAnalysisService {
    private final DatasetRepository datasetRepository;
    private final GeoJsonService geoJsonService;

    public DatasetAnalysisService(DatasetRepository datasetRepository, GeoJsonService geoJsonService) {
        this.datasetRepository = datasetRepository;
        this.geoJsonService = geoJsonService;
    }

    public AnalyticsDtos.DatasetAnalysisResponse analyze(Long projectId, Long datasetId) {
        DatasetEntity dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new IllegalArgumentException("Dataset not found"));
        if (!dataset.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Dataset does not belong to project");
        }

        GeoJsonService.GeoJsonMetrics metrics = geoJsonService.analyze(dataset.getGeoJson());
        GeoJsonService.BoundingBox bounds = metrics.bounds();
        GeoJsonService.Point centroid = metrics.centroid();
        GeoJsonService.UpiStats upiStats = geoJsonService.computeUpiStats(dataset.getGeoJson());

        return new AnalyticsDtos.DatasetAnalysisResponse(
                dataset.getId(),
                dataset.getName(),
                dataset.getType(),
                metrics.featureCount(),
                metrics.polygonCount(),
                metrics.totalAreaSqm(),
                metrics.averageAreaSqm(),
                metrics.minAreaSqm(),
                metrics.maxAreaSqm(),
                centroid == null ? 0 : centroid.lat(),
                centroid == null ? 0 : centroid.lon(),
                bounds == null ? 0 : bounds.minLat(),
                bounds == null ? 0 : bounds.minLon(),
                bounds == null ? 0 : bounds.maxLat(),
                bounds == null ? 0 : bounds.maxLon(),
                upiStats.upiField(),
                upiStats.upiFeatureCount(),
                upiStats.uniqueUpiCount(),
                upiStats.duplicateUpiCount(),
                upiStats.missingUpiCount()
        );
    }
}
