# Container image for the EcoPulse API, built for AWS App Runner (or any container host).
# App Runner health-checks GET /api/health and routes traffic to $PORT.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Run as an unprivileged user
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER app

# App Runner sets $PORT; default to 8080 for local runs. index.js binds 0.0.0.0:$PORT.
ENV PORT=8080
EXPOSE 8080

# Local/other-runtime health check (App Runner uses its own configured check)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
