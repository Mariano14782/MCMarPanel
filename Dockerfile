# ── Production image ───────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy manifests — package-lock.json is optional (glob covers both)
COPY package*.json ./

# Use npm ci if lockfile present (faster, deterministic), else npm install
RUN if [ -f package-lock.json ]; then \
    npm ci --omit=dev; \
    else \
    npm install --omit=dev; \
    fi

# Copy the rest of the source code
COPY . .

EXPOSE ${PORT:-3007}

CMD ["node", "server.js"]
