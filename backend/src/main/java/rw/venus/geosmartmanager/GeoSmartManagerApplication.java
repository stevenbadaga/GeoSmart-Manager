package rw.venus.geosmartmanager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.event.EventListener;
import rw.venus.geosmartmanager.config.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class GeoSmartManagerApplication {
    private static final Logger LOG = LoggerFactory.getLogger(GeoSmartManagerApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(GeoSmartManagerApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStartupMessage(ApplicationReadyEvent event) {
        String port = event.getApplicationContext()
                .getEnvironment()
                .getProperty("local.server.port", "8080");
        LOG.info("Backend is running on port {}. Health check: http://localhost:{}/api/health", port, port);
    }
}
