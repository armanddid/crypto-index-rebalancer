/**
 * Job Scheduler
 * 
 * Manages background jobs and cron schedules
 */

import cron from 'node-cron';
import { logger } from '../utils/logger.js';

export interface JobConfig {
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
  handler: () => Promise<void>;
}

export class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobConfigs: Map<string, JobConfig> = new Map();

  /**
   * Register a new job
   */
  registerJob(config: JobConfig): void {
    if (this.jobs.has(config.name)) {
      logger.warn(`Job ${config.name} already registered, skipping`);
      return;
    }

    this.jobConfigs.set(config.name, config);

    if (config.enabled) {
      this.startJob(config.name);
    } else {
      logger.info(`Job ${config.name} registered but not started (disabled)`);
    }
  }

  /**
   * Start a job
   */
  startJob(jobName: string): void {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      logger.error(`Job ${jobName} not found`);
      return;
    }

    if (this.jobs.has(jobName)) {
      logger.warn(`Job ${jobName} already running`);
      return;
    }

    // Validate cron expression
    if (!cron.validate(config.schedule)) {
      logger.error(`Invalid cron expression for job ${jobName}: ${config.schedule}`);
      return;
    }

    const task = cron.schedule(config.schedule, async () => {
      logger.info(`Starting job: ${jobName}`);
      const startTime = Date.now();

      try {
        await config.handler();
        const duration = Date.now() - startTime;
        logger.info(`Job ${jobName} completed successfully`, { duration: `${duration}ms` });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error(`Job ${jobName} failed`, {
          error: error.message,
          duration: `${duration}ms`,
          stack: error.stack,
        });
      }
    });

    this.jobs.set(jobName, task);
    logger.info(`Job ${jobName} started`, { schedule: config.schedule });
  }

  /**
   * Stop a job
   */
  stopJob(jobName: string): void {
    const task = this.jobs.get(jobName);
    if (!task) {
      logger.warn(`Job ${jobName} not running`);
      return;
    }

    task.stop();
    this.jobs.delete(jobName);
    logger.info(`Job ${jobName} stopped`);
  }

  /**
   * Stop all jobs
   */
  stopAllJobs(): void {
    logger.info('Stopping all jobs...');
    for (const [jobName, task] of this.jobs.entries()) {
      task.stop();
      logger.info(`Job ${jobName} stopped`);
    }
    this.jobs.clear();
  }

  /**
   * Get job status
   */
  getJobStatus(jobName: string): { registered: boolean; running: boolean; config?: JobConfig } {
    const config = this.jobConfigs.get(jobName);
    const running = this.jobs.has(jobName);

    return {
      registered: !!config,
      running,
      config: config || undefined,
    };
  }

  /**
   * Get all jobs status
   */
  getAllJobsStatus(): Array<{ name: string; running: boolean; schedule: string; enabled: boolean }> {
    return Array.from(this.jobConfigs.entries()).map(([name, config]) => ({
      name,
      running: this.jobs.has(name),
      schedule: config.schedule,
      enabled: config.enabled,
    }));
  }

  /**
   * Update job schedule (requires restart)
   */
  updateJobSchedule(jobName: string, newSchedule: string): void {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      logger.error(`Job ${jobName} not found`);
      return;
    }

    // Validate new schedule
    if (!cron.validate(newSchedule)) {
      logger.error(`Invalid cron expression: ${newSchedule}`);
      throw new Error(`Invalid cron expression: ${newSchedule}`);
    }

    // Stop job if running
    if (this.jobs.has(jobName)) {
      this.stopJob(jobName);
    }

    // Update config
    config.schedule = newSchedule;
    this.jobConfigs.set(jobName, config);

    // Restart if enabled
    if (config.enabled) {
      this.startJob(jobName);
    }

    logger.info(`Job ${jobName} schedule updated`, { newSchedule });
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobName: string, enabled: boolean): void {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      logger.error(`Job ${jobName} not found`);
      return;
    }

    config.enabled = enabled;
    this.jobConfigs.set(jobName, config);

    if (enabled) {
      this.startJob(jobName);
    } else {
      this.stopJob(jobName);
    }

    logger.info(`Job ${jobName} ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler();

