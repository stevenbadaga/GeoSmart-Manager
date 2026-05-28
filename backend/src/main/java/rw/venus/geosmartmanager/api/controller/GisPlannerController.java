package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.PlannerDtos;
import rw.venus.geosmartmanager.service.GisPlannerService;

import java.util.List;

@RestController
@RequestMapping("/api")
public class GisPlannerController {
    private final GisPlannerService gisPlannerService;

    public GisPlannerController(GisPlannerService gisPlannerService) {
        this.gisPlannerService = gisPlannerService;
    }

    @GetMapping("/layers/status")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<PlannerDtos.LayerStatusResponse> layerStatus() {
        return gisPlannerService.listLayerStatus();
    }

    @GetMapping("/parcels/search")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<PlannerDtos.ParcelSearchResponse> searchParcels(@RequestParam(name = "upi") String upi) {
        return gisPlannerService.searchParcels(upi);
    }

    @GetMapping("/parcels/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public PlannerDtos.ParcelDetailResponse parcel(@PathVariable("id") long parcelId) {
        return gisPlannerService.getParcel(parcelId);
    }

    @GetMapping("/parcels/{id}/zoning")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<PlannerDtos.ParcelZoneResponse> parcelZoning(@PathVariable("id") long parcelId) {
        return gisPlannerService.getParcelZoning(parcelId);
    }

    @GetMapping("/parcels/{id}/context")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public PlannerDtos.ParcelContextResponse parcelContext(@PathVariable("id") long parcelId) {
        return gisPlannerService.getParcelContext(parcelId);
    }

    @PostMapping("/subdivision/check")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public PlannerDtos.SubdivisionCheckResponse checkSubdivision(@Valid @RequestBody PlannerDtos.SubdivisionCheckRequest request) {
        return gisPlannerService.checkSubdivision(request);
    }

    @PostMapping("/subdivision/report")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public PlannerDtos.PlannerReportResponse generateReport(@Valid @RequestBody PlannerDtos.SubdivisionCheckRequest request) {
        return gisPlannerService.generateReport(request);
    }

    @PostMapping("/subdivision/report/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public ResponseEntity<byte[]> downloadReportPdf(@Valid @RequestBody PlannerDtos.SubdivisionCheckRequest request) {
        PlannerDtos.SubdivisionCheckResponse report = gisPlannerService.checkSubdivision(request);
        byte[] pdf = gisPlannerService.generateReportPdf(report, request.proposalGeoJson());
        String filename = "GeoSmart-Subdivision-" + report.parcel().upi().replace("/", "-") + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(pdf);
    }
}
