package rw.venus.geosmartmanager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

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
