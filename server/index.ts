import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before initializing db
dotenv.config();

import fs from 'fs';
import { initDatabase } from './db';
import { startPersistentBackgroundWorker } from './services/processingQueue';
import authRoutes from './routes/authRoutes';
import screenshotRoutes from './routes/screenshotRoutes';
import searchRoutes from './routes/searchRoutes';
import testDataRoutes from './routes/testDataRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database & Tables
initDatabase();

// Global Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'RECALL API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai_vision_active: Boolean(process.env.GEMINI_API_KEY),
    mode: process.env.VERCEL ? 'serverless' : 'persistent-server',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/test-data', testDataRoutes);

// Static frontend serving for persistent server production mode (Express 5 compatible wildcard fallback)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath) && !process.env.VERCEL) {
  app.use(express.static(distPath));
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server (when not running in Vercel Serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 RECALL Server running on http://localhost:${PORT}`);
    console.log(`📡 Storage Path: ${path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads')}`);
    // Start continuous autonomous background AI worker on persistent server
    startPersistentBackgroundWorker();
  });
}

export default app;

