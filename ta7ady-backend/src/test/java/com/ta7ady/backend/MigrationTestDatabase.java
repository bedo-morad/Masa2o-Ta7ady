package com.ta7ady.backend;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Creates only uniquely named databases on an explicitly supplied test server. */
final class MigrationTestDatabase {
    private final String url;
    private final String user = System.getenv().getOrDefault("MIGRATION_TEST_USER", "username");
    private final String password = System.getenv().getOrDefault("MIGRATION_TEST_PASSWORD", "password");

    MigrationTestDatabase() throws SQLException {
        this(true);
    }

    MigrationTestDatabase(boolean provisionSchema) throws SQLException {
        String adminUrl = System.getenv("MIGRATION_TEST_ADMIN_URL");
        if (adminUrl == null || adminUrl.isBlank()) {
            throw new IllegalStateException("Set MIGRATION_TEST_ADMIN_URL to an isolated PostgreSQL test server; "
                    + "the test role must have CREATEDB. Never use a shared/production server.");
        }
        String name = "migration_test_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = DriverManager.getConnection(adminUrl, user, password);
             var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + name);
        }
        int queryIndex = adminUrl.indexOf('?');
        String base = queryIndex < 0 ? adminUrl : adminUrl.substring(0, queryIndex);
        String query = queryIndex < 0 ? "" : adminUrl.substring(queryIndex);
        url = base.substring(0, base.lastIndexOf('/') + 1) + name + query;
        if (provisionSchema) {
            execute("CREATE SCHEMA ta7ady");
        }
    }

    String url() {
        return url;
    }

    String user() {
        return user;
    }

    String password() {
        return password;
    }

    void execute(String sql) throws SQLException {
        try (Connection connection = connect(); var statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    String scalar(String sql) throws SQLException {
        try (Connection connection = connect(); var statement = connection.createStatement();
             var result = statement.executeQuery(sql)) {
            result.next();
            return result.getString(1);
        }
    }

    Map<String, List<String>> snapshot() throws SQLException {
        Map<String, List<String>> snapshot = new TreeMap<>();
        try (Connection connection = connect(); var statement = connection.createStatement();
             var tables = statement.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname='ta7ady' "
                     + "AND tablename NOT IN ('flyway_schema_history', 'migration_probe')")) {
            while (tables.next()) {
                String table = tables.getString(1);
                snapshot.put(table, rows("SELECT row_to_json(t)::text FROM ta7ady.\"" + table
                        + "\" t ORDER BY row_to_json(t)::text"));
            }
        }
        try (Connection connection = connect(); var statement = connection.createStatement();
             var sequences = statement.executeQuery("SELECT sequencename FROM pg_sequences "
                     + "WHERE schemaname='ta7ady'")) {
            while (sequences.next()) {
                String sequence = sequences.getString(1);
                snapshot.put(sequence, rows("SELECT last_value::text || ':' || is_called::text FROM ta7ady.\""
                        + sequence + "\""));
            }
        }
        return snapshot;
    }

    private List<String> rows(String sql) throws SQLException {
        List<String> rows = new ArrayList<>();
        try (Connection connection = connect(); var statement = connection.createStatement();
             var result = statement.executeQuery(sql)) {
            while (result.next()) {
                rows.add(result.getString(1));
            }
        }
        return rows;
    }

    Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }
}
