import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import routes from '../src/routes.js';

const app = express();
app.use(express.json());
app.use('/', routes);

describe('Backend API', () => {
    it('should return 400 if no file uploaded', async () => {
        const res = await request(app).post('/upload');
        expect(res.statusCode).toBe(400);
    });
});