# Production multi-stage Dockerfile for RECALL
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy application source and build both server and frontend
COPY . .
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV STORAGE_PATH=/app/uploads

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/data ./data
COPY --from=builder /app/server ./server
COPY eng.traineddata ./

# Ensure persistent directories exist
RUN mkdir -p /app/data /app/uploads

EXPOSE 5000

CMD ["node", "api/index.js"]
