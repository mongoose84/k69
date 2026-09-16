# syntax=docker/dockerfile:1
# Samme opskrift til begge frontends — APP er enten "web" eller "mobile".
FROM node:22-alpine AS byg
ARG APP=web
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/rules/package.json packages/rules/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --ignore-scripts

COPY packages packages
COPY apps/${APP} apps/${APP}
RUN npm run build:libs && npm run build -w @k69/${APP}

FROM nginx:1.27-alpine AS koer
ARG APP=web
COPY docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=byg /app/apps/${APP}/dist /usr/share/nginx/html
COPY docker/frontend-entrypoint.sh /frontend-entrypoint.sh
RUN chmod +x /frontend-entrypoint.sh
ENTRYPOINT ["/frontend-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80

HEALTHCHECK --interval=20s --timeout=4s --start-period=8s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
