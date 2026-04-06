package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.ComplianceStatus;

import java.util.List;

public class ComplianceDtos {
    public record RunComplianceRequest(
            @NotNull Long subdivisionRunId
    ) {}

    public record ComplianceRuleResult(
            String ruleCode,
            String ruleName,
            String clauseReference,
            ComplianceStatus status,
            String detail,
            String suggestion
    ) {}

    public record ComplianceResponse(
            Long id,
            Long projectId,
            Long subdivisionRunId,
            ComplianceStatus status,
            String findings,
            String frameworkVersion,
            String checkedAt,
            List<ComplianceRuleResult> ruleResults
    ) {}

    public record RegulatoryUpdateResponse(
            String id,
            String title,
            String clauseReference,
            String effectiveDate,
            String summary
    ) {}

    public record SubmissionPackageResponse(
            String packageId,
            Long projectId,
            Long complianceCheckId,
            String projectCode,
            String projectName,
            String generatedAt,
            String frameworkVersion,
            ComplianceStatus status,
            String findingsSummary,
            List<ComplianceRuleResult> ruleResults,
            List<String> requiredAttachments,
            String submissionNotes
    ) {}

    public record CertificateTemplateResponse(
            String templateId,
            Long projectId,
            Long complianceCheckId,
            String projectCode,
            String projectName,
            String issuedAt,
            String frameworkVersion,
            ComplianceStatus status,
            String statement,
            List<String> signatories
    ) {}
}
