# ---- build stage: Node + Angular ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

# ---- run stage: nginx serving dist, non-root, SPA fallback + gzip ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ta7ady-frontend/browser /usr/share/nginx/html
# /run is a runtime tmpfs owned by root, so move the pid file to /tmp (writable).
# Also hand nginx.conf to the nginx user: the image entrypoint tunes it at startup.
RUN sed -i 's|^pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /etc/nginx/conf.d \
    && chown nginx:nginx /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
# (BusyBox wget resolves "localhost" to ::1 first, which nginx doesn't listen on here;
#  127.0.0.1 is the reliable probe target.)
CMD ["nginx", "-g", "daemon off;"]
