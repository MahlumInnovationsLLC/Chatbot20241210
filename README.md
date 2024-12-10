# Futuristic Chatbot on Azure (Single Web App Deployment)

This repository contains a full-stack futuristic chatbot application that:

- Uses a **React + Tailwind CSS** frontend.
- A **Node.js/Express** backend that serves both API routes and the frontend’s static files from one container.
- Uploads files directly to **Azure Blob Storage**.
- Integrates with the **OpenAI API** to provide AI-powered responses.

By consolidating both frontend and backend into a single Docker image, we can deploy the entire application to a single Azure Web App for simplicity.

## Features

- **Futuristic UI**: Tailwind CSS for a sleek, dark-themed UI.
- **One Container, One App**: The backend hosts the React-built frontend, simplifying deployment.
- **Azure Blob Storage**: Uploaded files are stored in your Azure Blob container, no local disk needed.
- **OpenAI Integration**: Chat with an AI assistant using the OpenAI API.

## Prerequisites

- **Azure Web App (Linux)** configured for container-based deployment.  
- **Azure Blob Storage** with a container already created.
- **OpenAI API key** for chatbot responses.
- **GitHub repository** connected with GitHub Actions for CI/CD (optional but recommended).
- **Docker** if testing locally.

## Environment Variables

Set the following environment variables in your Azure Web App’s "Configuration" -> "Application settings":

- `OPENAI_API_KEY`: Your OpenAI API key.
- `AZURE_STORAGE_CONNECTION_STRING`: Connection string for your Azure Storage account.
- `AZURE_BLOB_CONTAINER`: Blob container name for file uploads.
- `PORT`: (optional) Defaults to `8080`.

You can also set these locally in a `.env` file within the `backend` directory for local testing. Do not commit `.env` files to version control.

## Deployment Configuration

### GitHub Secrets

Add the following secrets to your GitHub repository (Settings -> Security -> Actions -> New repository secret):

- `OPENAI_API_KEY`
- `AZURE_CLIENT_ID`: Your Azure Service Principal’s Client ID.
- `AZURE_TENANT_ID`: Your Azure AD Tenant ID.
- `AZURE_SUBSCRIPTION_ID`: Your Azure Subscription ID.
- `AZURE_CLIENT_SECRET`: Your Azure Service Principal’s Secret.
- `AZURE_WEBAPP_NAME`: The name of your single Azure Web App.
- `AZURE_RESOURCE_GROUP`: The resource group containing your Web App.

### CI/CD Process

On push to `main`, GitHub Actions will:

1. **Build & Test** the backend.
2. **Build & Test** the frontend.
3. **Build** a single Docker image that includes both the frontend (as static files) and the backend server.
4. **Push** the Docker image to GitHub Container Registry.
5. **Deploy** the image to your Azure Web App using the Azure credentials and settings you provided.

## Running Locally

1. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create a .env with your environment variables if needed:
   # OPENAI_API_KEY=your_key
   # AZURE_STORAGE_CONNECTION_STRING=your_connection_string
   # AZURE_BLOB_CONTAINER=your_container_name
   npm start