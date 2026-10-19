package com.ta7ady.backend;

import com.ta7ady.backend.repository.AnameenSubjectRepository;
import com.ta7ady.backend.repository.BankQuestionRepository;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class Ta7adyBackendApplicationTests {
    private static final String NEXT = "--spring.flyway.locations=classpath:db/migration,classpath:db/migration-next";

    @Test
    void freshDatabaseMigratesBeforeHibernateValidation() throws Exception {
        var database = new MigrationTestDatabase();
        try (var context = start(database, "--spring.profiles.active=prod")) {
            assertThat(context.getEnvironment().getProperty("spring.jpa.hibernate.ddl-auto"))
                    .isEqualTo("validate");
            assertThat(database.scalar("SELECT version FROM ta7ady.flyway_schema_history WHERE success"))
                    .isEqualTo("1");
            assertThat(database.scalar("SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema = 'ta7ady' AND table_name <> 'flyway_schema_history'"))
                    .isEqualTo("15");
            assertThat(database.scalar("SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema = 'public'")).isEqualTo("0");
            assertThat(database.scalar("SELECT count(*) FROM pg_sequences WHERE schemaname='ta7ady'"))
                    .isEqualTo("9");
            assertThat(database.scalar("SELECT count(*) FROM pg_indexes WHERE schemaname='ta7ady' "
                    + "AND tablename <> 'flyway_schema_history'")).isEqualTo("17");
        }
    }

    @Test
    void laterMigrationRunsOnceAcrossRepeatedApplicationStarts() throws Exception {
        var database = new MigrationTestDatabase();
        try (var ignored = start(database)) {
            assertThat(database.scalar("SELECT count(*) FROM ta7ady.flyway_schema_history")).isEqualTo("1");
        }
        try (var ignored = start(database, NEXT)) {
            assertThat(database.scalar("SELECT count(*) FROM ta7ady.migration_probe")).isEqualTo("1");
        }
        String history = database.scalar("SELECT string_agg(installed_rank || ':' || version || ':' "
                + "|| checksum || ':' || installed_on, ',' ORDER BY installed_rank) "
                + "FROM ta7ady.flyway_schema_history");
        try (var ignored = start(database, NEXT)) {
            assertThat(database.scalar("SELECT string_agg(installed_rank || ':' || version || ':' "
                    + "|| checksum || ':' || installed_on, ',' ORDER BY installed_rank) "
                    + "FROM ta7ady.flyway_schema_history")).isEqualTo(history);
            assertThat(database.scalar("SELECT count(*) FROM ta7ady.migration_probe")).isEqualTo("1");
        }
    }

    @Test
    void deliberatelyBaselinedFixtureSkipsInitialDdlAndPreservesAllDataAndSequences() throws Exception {
        var database = existingFixture();
        var before = database.snapshot();
        Flyway.configure().dataSource(database.url(), database.user(), database.password())
                .defaultSchema("ta7ady").schemas("ta7ady").createSchemas(false)
                .baselineVersion("1").baselineDescription("Reviewed V1 fixture").load().baseline();
        try (var context = start(database, NEXT)) {
            assertThat(database.snapshot()).isEqualTo(before);
            assertThat(database.scalar("SELECT type FROM ta7ady.flyway_schema_history WHERE version='1'"))
                    .isEqualTo("BASELINE");
            assertThat(database.scalar("SELECT count(*) FROM ta7ady.flyway_schema_history "
                    + "WHERE version='1' AND type='SQL'")).isEqualTo("0");
            assertThat(database.scalar("SELECT count(*) FROM ta7ady.migration_probe")).isEqualTo("1");
            assertThat(context.getBean(BankQuestionRepository.class).findRandom(1).get(0).getQuestion())
                    .isEqualTo("سؤال محفوظ");
            assertThat(context.getBean(AnameenSubjectRepository.class).findAll().get(0).getClues())
                    .containsExactly("First clue", "Second clue");
        }
        assertThat(database.scalar("INSERT INTO ta7ady.bank_questions(answer, question, created_at) "
                + "VALUES ('Next answer', 'Next question', now()) RETURNING id")).isEqualTo("42");
    }

    @Test
    void nonemptyUnverifiedSchemaIsNotAutomaticallyBaselined() throws Exception {
        var database = existingFixture();
        var before = database.snapshot();
        assertThatThrownBy(() -> start(database)).hasStackTraceContaining("non-empty schema")
                .hasStackTraceContaining("baseline");
        assertThat(database.snapshot()).isEqualTo(before);
        assertThat(database.scalar("SELECT count(*) FROM pg_tables WHERE schemaname='ta7ady' "
                + "AND tablename='flyway_schema_history'")).isEqualTo("0");
    }

    @Test
    void missingProvisionedSchemaFailsInsteadOfCreatingAnEmptyReplacement() throws Exception {
        var database = new MigrationTestDatabase(false);
        database.execute("CREATE TABLE public.bank_questions (id bigint PRIMARY KEY)");
        database.execute("INSERT INTO public.bank_questions VALUES (73)");
        assertThatThrownBy(() -> start(database)).hasStackTraceContaining("ta7ady");
        assertThat(database.scalar("SELECT count(*) FROM pg_namespace WHERE nspname='ta7ady'"))
                .isEqualTo("0");
        assertThat(database.scalar("SELECT id FROM public.bank_questions")).isEqualTo("73");
    }

    @Test
    void migrationFailureRollsBackAndAbortsStartupClearly() throws Exception {
        var database = new MigrationTestDatabase();
        try (var ignored = start(database)) {
            assertThat(database.scalar("SELECT count(*) FROM ta7ady.flyway_schema_history")).isEqualTo("1");
        }
        assertThatThrownBy(() -> start(database,
                "--spring.flyway.locations=classpath:db/migration,classpath:db/migration-broken"))
                .hasStackTraceContaining("V3__failure_probe.sql").hasStackTraceContaining("division by zero");
        assertThat(database.scalar("SELECT count(*) FROM pg_tables WHERE schemaname='ta7ady' "
                + "AND tablename='failure_probe'")).isEqualTo("0");
        assertThat(database.scalar("SELECT count(*) FROM ta7ady.flyway_schema_history")).isEqualTo("1");
    }

    @Test
    void incompatibleEntitySchemaFailsValidationWithoutRepair() throws Exception {
        var database = new MigrationTestDatabase();
        try (var ignored = start(database)) {
            database.execute("ALTER TABLE ta7ady.bank_questions RENAME COLUMN answer TO legacy_answer");
        }
        assertThatThrownBy(() -> start(database)).hasStackTraceContaining("Schema validation: missing column [answer]")
                .hasStackTraceContaining("answer");
        assertThat(database.scalar("SELECT count(*) FROM information_schema.columns "
                + "WHERE table_schema='ta7ady' AND table_name='bank_questions' AND column_name='answer'"))
                .isEqualTo("0");
    }

    @Test
    void checksumMismatchFailsRatherThanSilentlyRepairingHistory() throws Exception {
        var database = new MigrationTestDatabase();
        try (var ignored = start(database)) {
            database.execute("UPDATE ta7ady.flyway_schema_history SET checksum=0 WHERE version='1'");
        }
        assertThatThrownBy(() -> start(database)).hasStackTraceContaining("checksum mismatch");
        assertThat(database.scalar("SELECT checksum FROM ta7ady.flyway_schema_history WHERE version='1'"))
                .isEqualTo("0");
    }

    private MigrationTestDatabase existingFixture() throws Exception {
        var database = new MigrationTestDatabase();
        try (var connection = database.connect()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V1__initial_schema.sql"));
        }
        database.execute("INSERT INTO ta7ady.bank_questions (question, answer, created_at) "
                + "VALUES ('سؤال محفوظ', 'إجابة محفوظة', '2020-01-01T00:00:00Z')");
        database.execute("SELECT setval('ta7ady.bank_questions_id_seq', 41, true)");
        database.execute("INSERT INTO ta7ady.anameen_subjects(player, created_at) VALUES ('Historical player', now())");
        database.execute("INSERT INTO ta7ady.anameen_subject_clues(subject_id, clue_order, clue) "
                + "VALUES (1, 0, 'First clue'), (1, 1, 'Second clue')");
        return database;
    }

    private ConfigurableApplicationContext start(MigrationTestDatabase database, String... extra) {
        String[] args = new String[extra.length + 7];
        args[0] = "--spring.datasource.url=" + database.url();
        args[1] = "--spring.datasource.username=" + database.user();
        args[2] = "--spring.datasource.password=" + database.password();
        args[3] = "--spring.config.import=";
        args[4] = "--spring.jpa.show-sql=false";
        args[5] = "--server.port=0";
        args[6] = "--spring.main.banner-mode=off";
        System.arraycopy(extra, 0, args, 7, extra.length);
        return new SpringApplicationBuilder(Ta7adyBackendApplication.class).run(args);
    }
}
