# Stage 1: Build frontend
FROM node:18-alpine AS frontend_builder

# Install necessary compatibility library for esbuild
RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .

# Make sure vite is executable
RUN chmod +x node_modules/.bin/vite

# Build frontend
RUN npm run build

# Stage 2: Build and run backend (Python)
FROM python:3.9-slim AS backend_builder
WORKDIR /usr/src/app

# Install git if needed
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code (including app.py)
COPY backend/. .

# Copy built frontend into backend public directory
RUN mkdir -p src/public
COPY --from=frontend_builder /usr/src/frontend/dist src/public

# Expose a port for local testing; Azure sets PORT env var
EXPOSE 8080

# Use gunicorn and bind to $PORT.
# Azure App Service sets PORT=8080 by default, but we use $PORT for flexibility.
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:${PORT:-8080} app:app --log-level debug"]