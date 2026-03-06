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

// Protected: requires x-api-key inside the router itself
app.use('/api', agentRoutes);

// Public: voice session init (called by the session page)
app.use('/api', sessionRoutes);

// Public: save answers webhook (called by the client-side SDK tool)
app.use('/api', answersRoutes);

// --- Serve static frontend in production ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
}

// --- Start ---
app.listen(PORT, () => {
    console.log(`🚀 Voice Agent API running on http://localhost:${PORT}`);
});
