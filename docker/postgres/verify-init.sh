#!/bin/sh
# Requires Docker Engine and Compose >= 2.24.4 (!override support).
# Only uniquely named disposable projects/volumes are created and removed.
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
temp=$(mktemp -d)
project=''
compose_file=''
data_path=''
port=${SCHEMA_TEST_PORT:-55447}

compose() {
    PGDATA="$data_path" docker compose --project-name "$project" --env-file "$root/.env.example" \
        -f "$compose_file" -f "$temp/override.yaml" "$@"
}

cleanup() {
    status=$?
    trap - EXIT
    if [ -n "$project" ]; then
        if [ "$status" -ne 0 ]; then compose logs postgres || true; fi
        compose down --volumes --remove-orphans || status=1
    fi
    rm -rf -- "$temp"
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# A quoted role exercises psql identifier quoting, not just the default username.
# Reset production env_file so no real .env or deployment credentials are loaded.
cat > "$temp/override.yaml" <<YAML
services:
  postgres:
    env_file: !reset []
    environment:
      POSTGRES_USER: 'schema"owner'
      POSTGRES_PASSWORD: schema-test-only
      POSTGRES_DB: schema_test
    ports: !override
      - "127.0.0.1:$port:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "127.0.0.1"]
      interval: 1s
      timeout: 5s
      retries: 60
YAML

query() {
    compose exec -T postgres psql -X -v ON_ERROR_STOP=1 \
        -U 'schema"owner' -d schema_test -Atc "$1"
}

for mode in dev prod; do
    project="ta7ady-schema-check-$(date +%s)-$$-$mode"
    case "$mode" in
        dev) compose_file="$root/docker-compose.yaml"; data_path=/data/postgres ;;
        prod) compose_file="$root/docker-compose.prod.yml"; data_path=/var/lib/postgresql/data ;;
    esac
    if [ "$mode" = prod ]; then
        cat >> "$temp/override.yaml" <<'YAML'
  backend:
    env_file: !reset []
YAML
    fi
    echo "Checking $mode initialization in disposable project $project on port $port"
    compose up -d --wait --wait-timeout 180 postgres
    test "$(query "SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='ta7ady'")" = 'schema"owner'
    test "$(query "SELECT count(*) FROM information_schema.tables WHERE table_schema='ta7ady'")" = 0

    query "CREATE TABLE public.init_sentinel (value text); INSERT INTO public.init_sentinel VALUES ('preserved');"
    # Absence after recreation proves the initializer is skipped, rather than
    # merely being idempotent. This touches only this newly created test volume.
    query 'DROP SCHEMA ta7ady;'
    compose up -d --force-recreate --wait --wait-timeout 180 postgres
    test "$(query "SELECT value FROM public.init_sentinel")" = preserved
    test "$(query "SELECT count(*) FROM pg_namespace WHERE nspname='ta7ady'")" = 0
    echo "PASS: $mode schema owner and first-start-only behavior"
    compose down --volumes --remove-orphans
    project=''
done
