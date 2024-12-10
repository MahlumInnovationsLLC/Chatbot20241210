require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/', routes);

// Catch-all route: serve index.html for any unknown path to support SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Backend (and frontend) server running on port ${port}`);
});