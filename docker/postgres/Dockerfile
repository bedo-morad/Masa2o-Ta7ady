FROM postgres:18

# Ship initialization with the image: deployment hosts need no script bind mount.
# Keep the official entrypoint, including its existing-data initialization guard.
COPY --chmod=0755 init/10-create-ta7ady-schema.sh /docker-entrypoint-initdb.d/10-create-ta7ady-schema.sh
