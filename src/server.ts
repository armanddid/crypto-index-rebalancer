// Main server entry point

import dotenv from 'dotenv';
import app from './api/server.js';
import { initializeDatabase, closeDatabase } from './storage/database.js';
import { initializeJobs, stopJobs } from './jobs/index.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize database
try {
  initializeDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
}

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  // Initialize background jobs
  try {
    initializeJobs();
    logger.info('✅ Background jobs initialized');
  } catch (error) {
    logger.error('Failed to initialize background jobs:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    stopJobs();
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    stopJobs();
    closeDatabase();
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  closeDatabase();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  closeDatabase();
  process.exit(1);
});

export default server;

