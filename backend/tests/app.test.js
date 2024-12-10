const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');

const app = express();
app.use(express.json());
app.use('/', routes);

describe('Backend API', () => {
    it('should return 400 if no file uploaded', async () => {
        const res = await request(app).post('/upload');
        expect(res.statusCode).toBe(400);
    });
});