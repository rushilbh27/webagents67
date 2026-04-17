import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiKeyMiddleware } from './middleware/apiKey.js';
import agentRoutes from './routes/agent.js';
import sessionRoutes from './routes/session.js';
import answersRoutes from './routes/answers.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import requestRoutes from './routes/request.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Routes ---

// Protected: requires JWT auth
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Unified /api prefix routes
app.use('/api', agentRoutes);
app.use('/api', sessionRoutes);
app.use('/api', requestRoutes);
app.use('/api', answersRoutes);

// --- Start ---
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Voice Agent API running on http://localhost:${PORT}`);
    });
}

export default app;
