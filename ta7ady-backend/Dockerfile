# ---- build stage: full JDK + Maven wrapper ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn/ .mvn/
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -DskipTests package

# ---- run stage: slim JRE, non-root ----
FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 10001 appuser
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# No .env in the image: docker-compose.prod.yml injects the root .env values as real
# environment variables (compose `env_file`), which application.yaml's ${VAR:default}
# placeholders resolve. Nothing secret is ever baked into a layer.
RUN chown appuser:appuser /app/app.jar
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/players?count=1 || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
