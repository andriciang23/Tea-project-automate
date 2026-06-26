# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

# ---- runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Persisted store lives here; mount a volume at /app/data to survive restarts.
RUN mkdir -p /app/data
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
