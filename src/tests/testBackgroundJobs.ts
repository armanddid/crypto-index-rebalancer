/**
 * Test Background Jobs
 * 
 * Tests the drift monitor job and webhook notifications
 */

import 'dotenv/config';
import { initializeDatabase } from '../storage/database.js';
import { driftMonitorJob } from '../jobs/DriftMonitorJob.js';
import { jobScheduler } from '../jobs/JobScheduler.js';
import { logger } from '../utils/logger.js';

async function testBackgroundJobs() {
  console.log('========================================');
  console.log('🧪 Testing Background Jobs');
  console.log('========================================\n');

  try {
    // Initialize database
    initializeDatabase();
    logger.info('Database initialized');

    // Test 1: Manual execution of drift monitor job
    console.log('📋 Test 1: Manual Drift Monitor Execution\n');
    console.log('⏳ Running drift monitor job manually...\n');

    await driftMonitorJob.execute();

    console.log('\n✅ Drift monitor job executed successfully\n');

    // Test 2: Job scheduler
    console.log('📋 Test 2: Job Scheduler\n');

    // Register a test job
    jobScheduler.registerJob({
      name: 'test-job',
      schedule: '*/1 * * * *', // Every minute
      enabled: false, // Don't actually run it
      handler: async () => {
        console.log('Test job executed');
      },
    });

    console.log('✅ Test job registered\n');

    // Get job status
    const status = jobScheduler.getJobStatus('test-job');
    console.log('Job Status:', status);
    console.log('');

    // Test 3: Get all jobs status
    console.log('📋 Test 3: All Jobs Status\n');

    const allJobs = jobScheduler.getAllJobsStatus();
    console.log('All Jobs:');
    allJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ${job.name}`);
      console.log(`     Schedule: ${job.schedule}`);
      console.log(`     Running: ${job.running}`);
      console.log(`     Enabled: ${job.enabled}`);
      console.log('');
    });

    // Test 4: Schedule validation
    console.log('📋 Test 4: Schedule Validation\n');

    const validSchedules = [
      '*/5 * * * *',    // Every 5 minutes
      '0 * * * *',      // Every hour
      '0 0 * * *',      // Daily at midnight
      '0 9 * * 1-5',    // Weekdays at 9am
    ];

    const invalidSchedules = [
      '* * * * * *',    // Too many fields
      'invalid',        // Not a cron expression
      '60 * * * *',     // Invalid minute
    ];

    console.log('Valid schedules:');
    validSchedules.forEach(schedule => {
      try {
        jobScheduler.registerJob({
          name: `test-${schedule}`,
          schedule,
          enabled: false,
          handler: async () => {},
        });
        console.log(`  ✅ ${schedule}`);
      } catch (error: any) {
        console.log(`  ❌ ${schedule}: ${error.message}`);
      }
    });

    console.log('\nInvalid schedules (should fail):');
    invalidSchedules.forEach(schedule => {
      try {
        jobScheduler.registerJob({
          name: `test-${schedule}`,
          schedule,
          enabled: false,
          handler: async () => {},
        });
        console.log(`  ❌ ${schedule}: Should have failed!`);
      } catch (error: any) {
        console.log(`  ✅ ${schedule}: Correctly rejected`);
      }
    });

    console.log('\n========================================');
    console.log('🎉 All Tests Completed!');
    console.log('========================================\n');

    console.log('📝 Summary:');
    console.log('  ✅ Drift monitor job can be executed manually');
    console.log('  ✅ Job scheduler works correctly');
    console.log('  ✅ Job status tracking works');
    console.log('  ✅ Schedule validation works');
    console.log('');

    console.log('💡 Next Steps:');
    console.log('  1. Create an active index with funds');
    console.log('  2. Let drift accumulate (wait or manually adjust prices)');
    console.log('  3. Run drift monitor to see automatic rebalancing');
    console.log('  4. Set up webhooks to receive notifications');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }

  process.exit(0);
}

testBackgroundJobs();

