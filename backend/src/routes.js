import { Router } from 'express';
import multer from 'multer';
import { generateChatResponse } from './openaiService.js';
import { BlobServiceClient } from '@azure/storage-blob';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER);

router.post('/chat', async (req, res) => {
    try {
        const { userMessage } = req.body;
        const response = await generateChatResponse(userMessage);
        res.json({ reply: response });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const file = req.file;
    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        res.json({ message: 'File uploaded successfully', file: { name: blobName, url: blockBlobClient.url } });
    } catch (error) {
        console.error('Error uploading to blob:', error);
        res.status(500).json({ error: 'Failed to upload file to blob storage' });
    }
});

export default router;