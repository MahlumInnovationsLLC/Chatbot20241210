# Stage 1: Build frontend
FROM node:18-alpine AS frontend_builder
WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend_builder
WORKDIR /usr/src/app
COPY backend/package*.json ./
RUN npm install
COPY backend/. .

# Copy the built frontend files into backend "src/public"
RUN mkdir -p src/public
COPY --from=frontend_builder /usr/src/frontend/dist src/public

EXPOSE 8080
CMD ["npm", "start"]