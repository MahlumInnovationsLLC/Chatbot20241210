# Backend

This is the Node.js/Express backend that:
- Handles chat requests via the OpenAI API.
- Uploads files to Azure Blob Storage.

Environment variables:
- `OPENAI_API_KEY`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER`, `PORT`

Run locally:
```bash
npm install
npm start