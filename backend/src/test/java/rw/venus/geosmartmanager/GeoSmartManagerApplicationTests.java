package rw.venus.geosmartmanager;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
                "spring.flyway.enabled=true",
                "spring.jpa.hibernate.ddl-auto=validate"
        }
)
class GeoSmartManagerApplicationTests {
    @Autowired
    private TestRestTemplate rest;

    @Test
    void healthEndpointResponds() {
        ResponseEntity<Map> res = rest.getForEntity("/actuator/health", Map.class);
        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(res.getBody()).isNotNull();
    }

    @Test
    void unauthenticatedApiCallsReturn401() {
        ResponseEntity<String> res = rest.getForEntity("/api/projects", String.class);
        assertThat(res.getStatusCodeValue()).isEqualTo(401);
    }
}
