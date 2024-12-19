import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from 'docx'; // Import docx here
import routes from './routes.js';
import '@fortawesome/fontawesome-pro/css/all.min.css';

const __dirname = path.resolve(); // If needed, depending on Node version

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/', routes);

// New on-the-fly report generation route
app.get('/api/generateReport', async (req, res) => {
    try {
        const docName = req.query.filename || 'untitled';

        // For demonstration: simple doc with given docName in its content
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [
                            new TextRun(`This is a dynamic report named: ${docName}`)
                        ]
                    })
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Disposition', `attachment; filename="${docName}.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating report');
    }
});

// Catch-all route: serve index.html for any unknown path to support SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Backend (and frontend) server running on port ${port}`);
});
