# DEPLOY — Masa2o Ta7ady

Production deploy is container-only. Local dev uses
(`docker compose up -d` for postgres, `.\mvnw spring-boot:run`, `npx ng serve`).

### Local frontend and API

The frontend API base is `/api`. Angular's default dev-server proxy config routes
`/api` and its subpaths to `http://localhost:8080`, preserving the `/api` prefix.
Therefore `npx ng serve --port 4300` uses the proxy automatically: the browser
stays same-origin and no backend CORS allowlist change is needed. Use
`http://localhost:4300/manage` locally, not a forwarded preview URL.

For direct cross-origin clients, the backend allows `http://localhost:4200` by
default. A different origin must be added explicitly in the project-root `.env`,
then the backend must be restarted; use exact origins only, never wildcards:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4300
```

If using `127.0.0.1` instead of `localhost`, add that exact origin too. Edit and
delete still require the existing admin password; changing the origin allowlist
does not bypass authorization.

## How backend and container configuration reaches the app

Backend and container settings can live in **one `.env` file at the project root**.
Frontend settings remain in the frontend project/configuration. For backend and
container values, the chain is:

```
.env  --(compose env_file)-->  environment variables inside each container
      --(application.yaml ${VAR:default})-->  Spring Boot values
```

So `ADMIN_PASSWORD=whatever` in `.env` becomes the `admin.password` that
`application.yaml` reads. The `:default` part means local `mvn` runs need **zero setup**
(no `.env` at all): missing vars fall back to dev values.

## Prereqs

- Docker Engine + Compose v2.
- Ports free: `80` (frontend), `8080` (backend), `5432` **not** published in prod
  (postgres is reachable only inside the compose network).
- For GHCR releases: just push a git tag (see CI/CD below). No extra secrets needed.

## 1. .env setup

```powershell
Copy-Item .env.example .env
# then edit .env (project root):
#   ADMIN_PASSWORD   — shared delete password (dev default: admin)
#   POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB — must match
#     SPRING_DATASOURCE_USERNAME / SPRING_DATASOURCE_PASSWORD and the DB in
#     SPRING_DATASOURCE_URL (jdbc:postgresql://postgres:5432/<db>)
```

Rules:

- `.env` (project root) is git-ignored — never commit it.
- Keep the two password pairs in sync (`POSTGRES_PASSWORD` ==
  `SPRING_DATASOURCE_PASSWORD`), otherwise the backend can't connect.
- Local `mvn` runs need zero setup: `application.yaml` defaults to
  `${ADMIN_PASSWORD:admin}` and `localhost:5432`, so a missing `.env` still works.

## 2. Deploy / update

```powershell
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend frontend
```

What you get:

- `http://<host>/` — frontend (nginx, SPA fallback, gzip). `/api/*` on the same
  origin is proxied to the backend container, preserving the `/api` prefix.
- `http://<host>:8080/api/players?count=1` — backend directly (health probe target).
- postgres is **not** published; data lives in the `postgres-prod` named volume.

Stop (keeps data): `docker compose -f docker-compose.prod.yml stop`
Full teardown **including data**: `docker compose -f docker-compose.prod.yml down -v`

## 3. Where data persists

- All question data lives in postgres, stored in the `postgres-prod` Docker volume
  (`/var/lib/postgresql/data` in the container).
- `down` without `-v` keeps the volume; `down -v` deletes it.
- Re-seeding source of truth: `seeds/*.json` (project root) via the bulk importer.

## 4. CI/CD (`.github/workflows/ci.yml`)

On every push/PR:

1. **backend** — `mvn -B verify` in `ta7ady-backend/` against a `postgres:18`
   service container (`POSTGRES_USER=username`, `POSTGRES_PASSWORD=password`,
   `POSTGRES_DB=ta7ady`, matching the app's test defaults; passed as workflow env,
   not copied from any credentials file).
2. **frontend** — `npm ci`, `npx ng build`, `npx ng test --watch=false`.
3. **docker** — `docker build` of both Dockerfiles (tagged `:ci`, never pushed).

On tags only (`git tag vX.Y.Z; git push --tags`):

4. **release** — rebuilds both images and pushes to GHCR as
   `ghcr.io/<owner>/<repo>-backend:<tag>` (+ `:latest`) and the same for
   `-frontend`. Auth uses the automatic `secrets.GITHUB_TOKEN`; no extra
   repository secrets are required.

## 5. Rotating ADMIN_PASSWORD

1. Pick a new value.
2. Update it in `.env` (project root): `ADMIN_PASSWORD=...`
3. Recreate the backend container (no rebuild needed):
   `docker compose -f docker-compose.prod.yml up -d backend`
4. Verify: `DELETE /api/players/999999` without the header → `401`;
   with `X-Admin-Password: <new>` → `404` (wrong password would be `401`).
   (No sessions, no lockout — the gate compares the header per request.)
