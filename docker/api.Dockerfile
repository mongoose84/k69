# syntax=docker/dockerfile:1
# Byg fra rodmappen: docker build -f docker/api.Dockerfile .
FROM node:22-alpine AS byg
WORKDIR /app

# Manifester først, så npm ci kan caches uafhængigt af kildekoden.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/rules/package.json packages/rules/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --ignore-scripts

COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @k69/rules && npm run build -w @k69/api

FROM node:22-alpine AS koer
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini && addgroup -S k69 && adduser -S k69 -G k69

COPY --from=byg --chown=k69:k69 /app/node_modules ./node_modules
COPY --from=byg --chown=k69:k69 /app/package.json ./package.json
COPY --from=byg --chown=k69:k69 /app/packages/rules/package.json ./packages/rules/package.json
COPY --from=byg --chown=k69:k69 /app/packages/rules/dist ./packages/rules/dist
COPY --from=byg --chown=k69:k69 /app/apps/api/package.json ./apps/api/package.json
COPY --from=byg --chown=k69:k69 /app/apps/api/dist ./apps/api/dist

USER k69
EXPOSE 8080
ENV PORT=8080 HOST=0.0.0.0

HEALTHCHECK --interval=20s --timeout=4s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/sundhed').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/index.js"]
