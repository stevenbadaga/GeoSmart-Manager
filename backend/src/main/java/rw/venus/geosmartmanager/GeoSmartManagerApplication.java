package rw.venus.geosmartmanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import rw.venus.geosmartmanager.config.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class GeoSmartManagerApplication {
    public static void main(String[] args) {
        SpringApplication.run(GeoSmartManagerApplication.class, args);
    }
}
