package rw.venus.geosmartmanager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private final Jwt jwt = new Jwt();
    private final Compliance compliance = new Compliance();
    private final Ai ai = new Ai();
    private final Metrics metrics = new Metrics();
    private final Oauth oauth = new Oauth();

    public Jwt getJwt() {
        return jwt;
    }

    public Compliance getCompliance() {
        return compliance;
    }

    public Ai getAi() {
        return ai;
    }

    public Metrics getMetrics() {
        return metrics;
    }

    public Oauth getOauth() {
        return oauth;
    }

    public static class Jwt {
        private String secret;
        private long expirationMs;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getExpirationMs() {
            return expirationMs;
        }

        public void setExpirationMs(long expirationMs) {
            this.expirationMs = expirationMs;
        }
    }

    public static class Compliance {
        private double minParcelAreaSqm;
        private double maxParcelAreaSqm;
        private int maxParcelCount;
        private double maxParcelAspectRatio;
        private String frameworkVersion = "RLMUA-Default";
        private List<RegulatoryUpdate> updates = new ArrayList<>();

        public double getMinParcelAreaSqm() {
            return minParcelAreaSqm;
        }

        public void setMinParcelAreaSqm(double minParcelAreaSqm) {
            this.minParcelAreaSqm = minParcelAreaSqm;
        }

        public double getMaxParcelAreaSqm() {
            return maxParcelAreaSqm;
        }

        public void setMaxParcelAreaSqm(double maxParcelAreaSqm) {
            this.maxParcelAreaSqm = maxParcelAreaSqm;
        }

        public int getMaxParcelCount() {
            return maxParcelCount;
        }

        public void setMaxParcelCount(int maxParcelCount) {
            this.maxParcelCount = maxParcelCount;
        }

        public double getMaxParcelAspectRatio() {
            return maxParcelAspectRatio;
        }

        public void setMaxParcelAspectRatio(double maxParcelAspectRatio) {
            this.maxParcelAspectRatio = maxParcelAspectRatio;
        }

        public String getFrameworkVersion() {
            return frameworkVersion;
        }

        public void setFrameworkVersion(String frameworkVersion) {
            this.frameworkVersion = frameworkVersion;
        }

        public List<RegulatoryUpdate> getUpdates() {
            return updates;
        }

        public void setUpdates(List<RegulatoryUpdate> updates) {
            this.updates = updates;
        }
    }

    public static class RegulatoryUpdate {
        private String id;
        private String title;
        private String clauseReference;
        private String effectiveDate;
        private String summary;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getClauseReference() {
            return clauseReference;
        }

        public void setClauseReference(String clauseReference) {
            this.clauseReference = clauseReference;
        }

        public String getEffectiveDate() {
            return effectiveDate;
        }

        public void setEffectiveDate(String effectiveDate) {
            this.effectiveDate = effectiveDate;
        }

        public String getSummary() {
            return summary;
        }

        public void setSummary(String summary) {
            this.summary = summary;
        }
    }

    public static class Ai {
        private String defaultOptimizationMode;

        public String getDefaultOptimizationMode() {
            return defaultOptimizationMode;
        }

        public void setDefaultOptimizationMode(String defaultOptimizationMode) {
            this.defaultOptimizationMode = defaultOptimizationMode;
        }
    }

    public static class Metrics {
        private double storageCapacityMb;

        public double getStorageCapacityMb() {
            return storageCapacityMb;
        }

        public void setStorageCapacityMb(double storageCapacityMb) {
            this.storageCapacityMb = storageCapacityMb;
        }
    }

    public static class Oauth {
        private String googleClientId;

        public String getGoogleClientId() {
            return googleClientId;
        }

        public void setGoogleClientId(String googleClientId) {
            this.googleClientId = googleClientId;
        }
    }
}
