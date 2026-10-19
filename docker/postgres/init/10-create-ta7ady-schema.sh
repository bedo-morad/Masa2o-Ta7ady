#!/bin/sh
set -eu

# The official Postgres entrypoint runs this only for an empty data directory.
# Compose uses POSTGRES_USER for both application access and Flyway migrations.
psql -X --set=ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=app_role="$POSTGRES_USER" <<'SQL'
CREATE SCHEMA ta7ady AUTHORIZATION :"app_role";
SQL
