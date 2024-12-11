# Stage 1: Build frontend
FROM node:18-alpine AS frontend_builder
WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build

# Stage 2: Build and run backend (Python-based)
FROM python:3.11-slim AS backend_builder

WORKDIR /usr/src/app

# Copy backend requirements and install them
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code (including app.py)
COPY backend/. .

# Copy the built frontend files into the backend "src/public" directory
RUN mkdir -p src/public
COPY --from=frontend_builder /usr/src/frontend/dist src/public

# Expose port 8080 (optional, Azure sets PORT anyway)
EXPOSE 8080

# Use gunicorn to run the app on $PORT
CMD ["gunicorn", "-b", "0.0.0.0:$PORT", "app:app"]