package rw.venus.geosmartmanager.domain;

public enum ProjectStatus {
    SUBMITTED,
    PENDING_ASSIGNMENT,
    ASSIGNED,
    UNDER_REVIEW,
    NEEDS_MORE_INFO,
    DOCUMENTS_ACCEPTED,
    SUBDIVISION_REVIEW,
    REPORT_GENERATED,
    COMPLETED,
    CANCELLED,
    // Keep old ones for safety during migration
    PLANNING,
    IN_PROGRESS,
    REVIEW,
    APPROVED
}
