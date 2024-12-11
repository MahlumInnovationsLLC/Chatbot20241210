# Stage 1: Build frontend
FROM node:18-alpine AS frontend_builder
WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build

# Stage 2: Build and run backend (Python)
FROM python:3.11-slim AS backend_builder
WORKDIR /usr/src/app

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code (including app.py)
COPY backend/. .

# Copy built frontend into backend public directory
RUN mkdir -p src/public
COPY --from=frontend_builder /usr/src/frontend/dist src/public

# Expose a port for local testing (optional)
# This won't affect Azure's mapping; it's good practice though.
EXPOSE 8080

# Use gunicorn and bind to $PORT, which Azure will set.
# If you want to use 8080, make sure you set WEBSITES_PORT=8080 in Azure App Settings.
CMD ["gunicorn", "-b", "0.0.0.0:$PORT", "app:app"]