# Stage 1: Build frontend
FROM node:18-alpine AS frontend_builder

#Install necessary compatability library for esbuild
RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/. .

#Re-build Esbuild to ensure correct binary version
RUN npm rebuild esbuild

# Make sure vite is executable
RUN chmod +x node_modules/.bin/vite

RUN npm run build

# Stage 2: Build and run backend (Python)
FROM python:3.11-slim AS backend_builder
WORKDIR /usr/src/app

# Install git if you need commit info or for some packages
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code (including app.py)
COPY backend/. .

# Copy built frontend into backend public directory
RUN mkdir -p src/public
COPY --from=frontend_builder /usr/src/frontend/dist src/public

# Expose a port for local testing (optional)
EXPOSE 8080

# Use gunicorn and bind to $PORT, which Azure will set.
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]