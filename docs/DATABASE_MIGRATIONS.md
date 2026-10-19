# Database migrations

## What changes

Flyway owns versioned SQL in `ta7ady-backend/src/main/resources/db/migration`. The Spring Boot BOM manages `spring-boot-starter-flyway` and `flyway-database-postgresql`; do not pin separate versions. Hibernate uses `validate` in every profile, including development. It no longer creates or updates tables.

Flyway and Hibernate explicitly target `ta7ady`; Hikari sets the connection schema to `ta7ady` so native repository SQL uses the same tables. History lives in `ta7ady.flyway_schema_history`. Boot runs Flyway before JPA initialization (`defer-datasource-initialization=false`). SQL initialization is disabled, leaving one schema writer. See [Boot's initialization ordering](https://docs.spring.io/spring-boot/how-to/data-initialization.html).

Safety settings are explicit: `baseline-on-migrate=false`, `clean-disabled=true`, `create-schemas=false`, `fail-on-missing-locations=true`, and `validate-migration-naming=true`. Operators provision the schema deliberately. Never override these or Hibernate validation as a deployment shortcut. [Automatic baselining removes a wrong-database safety check](https://documentation.red-gate.com/fd/flyway-baseline-on-migrate-setting-277578974.html).

## Existing-database rollout is blocked

The available sandbox database is named `ta7ady`, but its 15 application tables are in **`public`**, and no `ta7ady` schema exists. Database names and schema names are different. A full custom-format backup was restored unchanged into a separate local PostgreSQL 16 cluster for inspection. No shared/production database was accessed or changed. A matching existing `ta7ady`-schema backup is not available.

`V1__initial_schema.sql` preserves the inspected physical layout, retargeted explicitly to `ta7ady`: 15 tables, 9 identity sequences, 15 primary keys, 6 ordered-collection check constraints, 6 foreign keys, and 2 unique constraints/backing indexes. Historical nullable `anameen_subjects.player_key` is preserved, as is `player_names` uniqueness. It does not redesign the schema or import seeds.

**Version `1` is the tested baseline for the isolated V1 fixture, not a verified shared baseline.** V1 remains provisional for shared adoption until the actual target is inspected and compared. Hibernate validation is not a complete constraint/index/data-drift audit.

Do not move the existing `public` tables, baseline that database, or create an empty `ta7ady` schema to conceal them. Missing `ta7ady` fails startup instead of silently creating a replacement. Resolving the schema mismatch requires a separately reviewed plan and rollout authorization. Issue #41 must remain open until the real existing-database gate is satisfied.

## Fresh database

Only use this path for a confirmed new database with no existing application tables in any schema.

### Compose: empty data directories only

Both Compose configurations mount the same read-only initializer,
`docker/postgres/init/10-create-ta7ady-schema.sh`. The official Postgres entrypoint
runs it **only on first initialization of an empty PostgreSQL data directory**.
It creates schema `ta7ady` in `POSTGRES_DB`, owned by `POSTGRES_USER`, before the
final server accepts TCP connections. Keep `SPRING_DATASOURCE_USERNAME` equal to
`POSTGRES_USER` (and the corresponding database/password settings in sync): that
role is both the application and Flyway migration role in this stack. A separate
migration/application role arrangement requires deliberate provisioning and grants.

For a confirmed fresh local Compose database, set `PGDATA=/data/postgres` in
the shell or project-root `.env`, then run `docker compose up -d --wait` before
starting the backend. For confirmed fresh production, set
`PGDATA=/var/lib/postgresql/data`. Production waits for the Postgres TCP healthcheck;
the socket-only temporary initialization server cannot release that dependency.
Flyway then applies V1 and Hibernate validates; the initializer does not create
tables, run migrations, import seeds, or baseline anything.

**Mandatory storage gate:** both Compose files reject an unset/empty `PGDATA`;
there is deliberately no default in `.env.example`. For a fresh database, the
paths above match the existing named-volume mounts rather than PostgreSQL 18's
different image default. Volume names and mount locations are unchanged.
Before setting `PGDATA` or upgrading an existing deployment, an operator must
inspect its actual data directory and mounts: earlier configurations may have
stored data outside the named mount. Do not select the fresh-database examples
for such a deployment. Retain the verified existing path only after the storage
and existing-database rollout gates have been satisfied.
Do not switch storage locations, copy data, or reset volumes to make startup pass;
resolve any discrepancy through a separately approved storage/rollout plan.

The entrypoint skips all init scripts when the data directory is already
initialized, even if `ta7ady` is missing. Restarting or updating Compose therefore
does not repair, alter ownership, or baseline an existing database. **Never delete
an existing volume to trigger initialization, and never run the initializer
manually against an existing database.** The existing-database gate above still
applies, including the prohibition on concealing legacy `public` tables.

### Non-Compose provisioning

1. Provision the database and role through the environment's normal authorized process. Set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` using the secret store. Do not place passwords in source, logs, or command-line arguments.
2. Connect as the database owner and explicitly provision the target schema, owned by the migration role. For a role named `ta7ady_app`, for example:

   ```sql
   CREATE SCHEMA ta7ady AUTHORIZATION ta7ady_app;
   ```

   Substitute the actual role. It needs rights to execute the reviewed DDL in that schema; the app does not need permission to create schemas. If migrations use a separate owner role, review application table/sequence privileges explicitly.
3. Start the backend normally (`./mvnw spring-boot:run` locally or the container deployment command). Flyway applies V1, then Hibernate validates. On an error, stop; do not enable `update` or `baseline-on-migrate`.
4. Check logs, application readiness, and history before allowing writes:

   ```sql
   SELECT installed_rank, version, description, type, checksum, success
   FROM ta7ady.flyway_schema_history ORDER BY installed_rank;
   ```

   A fresh database must show successful SQL version `1`. Restarting must not add another V1 history row. No test-only V2/V3 files are shipped in the application jar.

## Existing database: inventory, restore, then baseline

Do not start the new application against an existing target before this procedure is approved and completed on a restored copy.

### 1. Inventory and back up

Record the exact host/database, server version, role and search path, all schemas, tables, columns (types/defaults/nullability), identity definitions, primary/unique/check/foreign-key constraints, indexes, sequence settings and current values, owners/grants, triggers, functions, extensions and any existing migration history. Use a read-only connection. Useful starting commands are:

```sql
SELECT current_database(), current_user, version(), current_schemas(false);
SELECT schemaname, tablename FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1, 2;
SELECT table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default, is_identity, identity_generation
FROM information_schema.columns WHERE table_schema = 'ta7ady'
ORDER BY table_name, ordinal_position;
SELECT c.relname, k.conname, k.contype, pg_get_constraintdef(k.oid)
FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'ta7ady' ORDER BY 1, 2;
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'ta7ady' ORDER BY 1, 2;
SELECT * FROM pg_sequences WHERE schemaname = 'ta7ady' ORDER BY sequencename;
```

Also inspect `last_value` **and `is_called`** for each sequence, without calling `nextval`. Use schema-only dumps plus catalogs for the complete structural comparison; row counts alone cannot prove preserved contents.

Use a PostgreSQL client compatible with the server. Supply connection settings via protected service files/environment/secret tooling. The following command uses standard `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` and password/service settings:

```bash
umask 077
pg_dump --format=custom --file=pre-flyway.dump
pg_restore --list pre-flyway.dump > pre-flyway.contents
sha256sum pre-flyway.dump > pre-flyway.sha256
```

Back up the full database, not just `ta7ady`; record required role/global privileges separately with the operator. Securely retain the backup and manifest outside git. Listing an archive does not prove it restores.

### 2. Rehearse on an isolated restore

Provision a **new** isolated database/cluster, explicitly set `PGHOST`, `PGPORT`, `PGUSER` and `PGDATABASE` to it, then restore without `--clean`:

```bash
pg_restore --exit-on-error --no-owner --no-acl --dbname="$PGDATABASE" pre-flyway.dump
```

Those flags make a local operator-owned copy; separately rehearse production ownership/ACLs before rollout. Do not point this command at an existing populated/shared database.

Build a separate fresh database from V1. Compare its complete catalog with the restored target, ignoring only reviewed environmental differences such as owners and the history table. Confirm all table/column/constraint/index/sequence definitions and entity compatibility. If the target has `public` tables instead of `ta7ady`, stop: it is **not** an equivalent baseline.

On the isolated restore only, Hibernate compatibility can be checked with Flyway disabled and `ddl-auto=validate`; keep the intended `ta7ady` schema. Do not use that override in deployment. Capture deterministic all-table content hashes/row counts and each sequence's `last_value/is_called` before baseline and after upgrade; include ordered collection rows and historical nullable keys. Verify inserted identity IDs continue beyond existing IDs in the disposable copy.

### 3. Deliberately baseline only an approved equivalent catalog

Install the Flyway CLI version matching the Boot-resolved runtime version (`./mvnw dependency:tree -Dincludes=org.flywaydb:*`). CLI credentials use `FLYWAY_URL`, `FLYWAY_USER` and `FLYWAY_PASSWORD` from the secret store; do not print them. With the working directory at the repository root and **only the approved isolated equivalent restore selected**:

```bash
flyway -schemas=ta7ady -defaultSchema=ta7ady -createSchemas=false \
  -cleanDisabled=true -baselineOnMigrate=false -baselineVersion=1 \
  -baselineDescription="Reviewed initial schema" \
  -locations=filesystem:ta7ady-backend/src/main/resources/db/migration baseline

flyway -schemas=ta7ady -defaultSchema=ta7ady -createSchemas=false \
  -cleanDisabled=true -baselineOnMigrate=false \
  -locations=filesystem:ta7ady-backend/src/main/resources/db/migration info
```

Review a successful `BASELINE` row at version `1`, not SQL execution of V1. Start the application: only versions greater than 1 may apply. It must validate, preserve the content/sequence manifests, and retain existing data after restart. The automated baseline fixture tests this mechanism; it does not substitute for a restored real target. A reviewed later migration must also be rehearsed on that actual restore before rollout.

## Review, deployment order and recovery

Every schema change needs a new `V<number>__description.sql` and review of its SQL, entity mapping, lock duration, transaction behavior, indexes/constraints, data preservation and old/new application compatibility. Never edit an applied migration, manually rewrite history/checksums, use `repair` to conceal drift, or run `clean`, drop/recreate, or destructive Compose volume resets on an existing environment. Use explicit columns and schema-qualified names. Keep seeds outside migrations.

Before rollout, record a named operator/approver, the tested restore evidence, exact backup location/checksum, deployment artifact and Flyway versions, maintenance/lock window, readiness checks, recovery time and rollback decision. Pause writers or otherwise guarantee the approved consistent backup and data-manifest window. Rehearse ownership/grants as well as schema/data.

Deploy compatible **expand** SQL before code that needs it; Boot migrates at startup, before JPA/readiness. Drain incompatible old instances or use an explicitly approved one-off migration stage first. Do not allow an unreviewed old application to run against incompatible DDL. Contract/removal changes need a later reviewed release after old code is retired. Do not deploy the new image to the existing `public` database until its separate schema decision is approved.

If migration or validation fails, leave traffic off and retain logs/history. PostgreSQL transactional migrations roll back on failure (covered by the test-only division-by-zero case); verify actual state before retrying. Do not blindly downgrade the application after committed DDL: first prove compatibility. Restore the verified backup into a **new** recovery database and switch over only with operator authorization, or apply a reviewed forward fix. Never erase the original target or discard post-backup writes without a recovery decision.

## Running the checks

Run `./docker/postgres/verify-init.sh` from the repository root with Docker and
Compose 2.24.4 or later. It tests both Compose configurations in uniquely named
disposable projects, using new volumes and loopback port `55447` (override with
`SCHEMA_TEST_PORT`). No real `.env` is loaded. It checks schema ownership using a
hyphenated role that requires SQL identifier quoting, then recreates the container and proves persisted data
survives and initialization is not rerun even when the schema is absent. Only
the test's own resources are removed, including on failure; CI runs this check.

Use an isolated PostgreSQL instance and a role with `CREATEDB`. All database-backed tests provision uniquely named databases and explicit `ta7ady` schemas, rather than using the developer's existing database. Databases remain in the disposable server for inspection; stop/remove the disposable server through its normal lifecycle after testing. The fixture never drops an existing database. CI supplies its ephemeral PostgreSQL 18 service; local verification uses PostgreSQL 16.

```bash
cd ta7ady-backend
export MIGRATION_TEST_ADMIN_URL=jdbc:postgresql://127.0.0.1:55441/postgres
export MIGRATION_TEST_USER=migration_test
# Set MIGRATION_TEST_PASSWORD from the local test secret if authentication requires it.
./mvnw -B verify
```

The tests exercise fresh production-profile startup, all 15 mapped tables, identity/index counts, later migration once/restart history stability, explicit V1 baseline without initial DDL replay, all-table/sequence preservation in a synthetic fixture, native SQL and ordered collections, rejection of unverified schemas, refusal to silently create a missing schema, transactional migration failure, checksum mismatch, and Hibernate incompatibility without repair. Existing service/HTTP contract tests use the migrated isolated database too.
