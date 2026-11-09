import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before initializing db
dotenv.config();

import { initDatabase } from './db';
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
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/test-data', testDataRoutes);

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
  });
}

export default app;

