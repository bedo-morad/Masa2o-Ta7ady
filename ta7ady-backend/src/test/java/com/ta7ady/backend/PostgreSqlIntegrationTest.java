package com.ta7ady.backend;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Shared disposable database for transactional service and HTTP contract tests. */
public abstract class PostgreSqlIntegrationTest {
    private static final MigrationTestDatabase DATABASE = createDatabase();

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", DATABASE::url);
        registry.add("spring.datasource.username", DATABASE::user);
        registry.add("spring.datasource.password", DATABASE::password);
        registry.add("spring.jpa.show-sql", () -> "false");
    }

    private static MigrationTestDatabase createDatabase() {
        try {
            return new MigrationTestDatabase();
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot provision isolated integration-test database", exception);
        }
    }
}
