/**
 * Background Jobs Initialization
 * 
 * Registers and starts all background jobs
 */

import { jobScheduler } from './JobScheduler.js';
import { driftMonitorJob } from './DriftMonitorJob.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize all background jobs
 */
export function initializeJobs(): void {
  logger.info('Initializing background jobs...');

  // Get configuration from environment
  const driftMonitorEnabled = process.env.DRIFT_MONITOR_ENABLED !== 'false'; // Enabled by default
  const driftMonitorSchedule = process.env.DRIFT_MONITOR_SCHEDULE || '*/5 * * * *'; // Every 5 minutes by default

  // Register drift monitor job
  jobScheduler.registerJob({
    name: 'drift-monitor',
    schedule: driftMonitorSchedule,
    enabled: driftMonitorEnabled,
    handler: async () => {
      await driftMonitorJob.execute();
    },
  });

  logger.info('Background jobs initialized', {
    jobs: jobScheduler.getAllJobsStatus(),
  });
}

/**
 * Stop all background jobs
 */
export function stopJobs(): void {
  logger.info('Stopping all background jobs...');
  jobScheduler.stopAllJobs();
  logger.info('All background jobs stopped');
}

/**
 * Get jobs status
 */
export function getJobsStatus() {
  return jobScheduler.getAllJobsStatus();
}

/**
 * Update drift monitor schedule
 */
export function updateDriftMonitorSchedule(schedule: string): void {
  jobScheduler.updateJobSchedule('drift-monitor', schedule);
}

/**
 * Enable/disable drift monitor
 */
export function setDriftMonitorEnabled(enabled: boolean): void {
  jobScheduler.setJobEnabled('drift-monitor', enabled);
}

