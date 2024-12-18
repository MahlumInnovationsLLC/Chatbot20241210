import { Router } from 'express';
import multer from 'multer';
import { generateChatResponse } from './openaiService.js';
import { BlobServiceClient } from '@azure/storage-blob';
import { Document, Packer, Paragraph, TextRun } from 'docx'; // example docx import
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER);

// Existing routes...

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

// New route for on-the-fly report generation
router.get('/api/generateReport', async (req, res) => {
    const filename = req.query.filename || 'report.docx';

    // Create a simple docx file on the fly
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [new TextRun('Your Generated Report')]
                }),
                new Paragraph({
                    children: [new TextRun('This is a dynamically generated report based on your request.')]
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
});

export default router;