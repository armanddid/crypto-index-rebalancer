// Express server setup

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger, httpLoggerStream } from '../utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import assetRoutes from './routes/assets.js';
import depositRoutes from './routes/deposits.js';
import indexRoutes from './routes/indexes.js';
import webhookRoutes from './routes/webhooks.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (simple version)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'healthy',
      nearIntents: 'unknown', // TODO: Add actual health checks
      priceOracle: 'unknown',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/indexes', indexRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

