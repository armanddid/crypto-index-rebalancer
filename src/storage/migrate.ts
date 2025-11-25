// Database migration script

import { initializeDatabase, closeDatabase } from './database.js';
import { logger } from '../utils/logger.js';

async function migrate() {
  try {
    logger.info('Starting database migration...');
    
    initializeDatabase();
    
    logger.info('✅ Database migration completed successfully!');
    
    closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

migrate();

