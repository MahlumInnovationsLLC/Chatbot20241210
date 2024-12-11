# Stage 1: Build frontend
FROM node:18-alpine AS frontend_builder
WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build

# Stage 2: Build and run backend
FROM python:3.11-slim AS backend_builder
WORKDIR /usr/src/app

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code (including app.py)
COPY backend/. .

# Copy frontend build artifacts into backend
RUN mkdir -p src/public
COPY --from=frontend_builder /usr/src/frontend/dist src/public

# Expose port (not strictly required for Azure, but good practice)
EXPOSE 8080

# Use gunicorn to run the app. If relying on $PORT from Azure:
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]