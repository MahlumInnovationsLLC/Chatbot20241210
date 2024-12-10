# Futuristic Chatbot on Azure with Blob Storage

This is a full-stack futuristic chatbot interface deployed on Azure. It consists of:

- **Frontend**: React + Tailwind CSS
- **Backend**: Node.js/Express
- **File Uploads**: Directly to Azure Blob Storage
- **Chat Intelligence**: OpenAI API integration

## Features

- Ask questions to the chatbot and get responses powered by OpenAI.
- Upload files which are stored in Azure Blob Storage.
- Responsive UI built with Tailwind CSS.
- CI/CD pipeline with GitHub Actions for building, testing, dockerizing, and deploying to Azure.

## Requirements

- **Azure Web Apps** for hosting the frontend and backend Docker containers.
- **Azure Blob Storage** account and container (already created by you).
- **OpenAI API Key** for chatbot responses.
- **Azure Credentials** for GitHub Actions deployment.
- **Node.js** and **npm** if running locally.

## Environment Variables & Secrets

**Backend**:
- `OPENAI_API_KEY`: Your OpenAI API key.  
- `AZURE_STORAGE_CONNECTION_STRING`: Connection string to your Azure Storage account.  
- `AZURE_BLOB_CONTAINER`: Name of the blob container where files will be stored.
- `PORT`: (optional) defaults to 8080.

**Frontend**:
- `VITE_BACKEND_URL`: The URL of the backend API (e.g. `https://your-backend.azurewebsites.net`).

**GitHub Actions Secrets**:
- `OPENAI_API_KEY`
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_SECRET` for Azure login.
- `AZURE_WEBAPP_NAME_BACKEND`, `AZURE_WEBAPP_NAME_FRONTEND`: The names of your Azure Web Apps.
- `AZURE_RESOURCE_GROUP`: The resource group containing your Web Apps.

Add these secrets in your GitHub repo:  
Settings -> Secrets and Variables -> Actions

## Local Setup

1. **Backend**:
   ```bash
   cd backend
   npm install
   echo "OPENAI_API_KEY=your_openai_api_key" > .env
   echo "AZURE_STORAGE_CONNECTION_STRING=your_azure_conn_string" >> .env
   echo "AZURE_BLOB_CONTAINER=your_container_name" >> .env
   npm start