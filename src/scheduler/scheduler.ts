/**
 * @fileoverview Cron scheduler wrapper using node-cron.
 *
 * Reads job definitions from ScheduleConfig and registers cron tasks.
 * Also supports manual triggering via triggerManually(). When DISABLE_CRON
 * is set, the scheduler is not started — GitHub Actions controls the schedule.
 *
 * @module scheduler/scheduler
 */

import cron from 'node-cron';
import { ScheduleConfig, JobDefinition } from '../contracts/v1/schedule.schema';
import { logger } from '../lib/logger';

/** Result shape returned after a job completes via the trigger callback. */
export interface JobTriggerResult {
  status: string;
  error?: string;
  storeError?: string;
}

/**
 * Wraps node-cron to schedule and manage recurring job execution.
 *
 * @example
 * const scheduler = new Scheduler(config, async (name, def) => {
 *   const result = await executor.execute(name, def);
 *   return { status: result.ok ? 'success' : 'failure' };
 * });
 * scheduler.start();
 */
export class Scheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private config: ScheduleConfig,
    private onJobTrigger: (jobName: string, jobDef: JobDefinition) => Promise<JobTriggerResult>,
  ) {}

  start(): void {
    for (const [name, def] of Object.entries(this.config.jobs)) {
      if (!cron.validate(def.cron)) {
        logger.error('invalid_cron', new Error(`Invalid cron expression: ${def.cron}`), { jobName: name });
        continue;
      }

      const task = cron.schedule(def.cron, () => {
        logger.info('job_triggered', { jobName: name, type: def.type });
        this.onJobTrigger(name, def).catch((err) => {
          logger.error('job_execution_failed', err, { jobName: name });
        });
      });

      this.tasks.set(name, task);
      logger.info('job_scheduled', { jobName: name, cron: def.cron, type: def.type });
    }

    logger.info('scheduler_started', { jobCount: this.tasks.size });
  }

  stop(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info('job_stopped', { jobName: name });
    }
    this.tasks.clear();
    logger.info('scheduler_stopped');
  }

  // Returns null if job not found, otherwise a Promise that resolves with the job result
  triggerManually(jobName: string): { jobDef: JobDefinition; promise: Promise<JobTriggerResult> } | null {
    const def = this.config.jobs[jobName];
    if (!def) return null;

    logger.info('job_manual_trigger', { jobName });
    const promise = this.onJobTrigger(jobName, def);
    return { jobDef: def, promise };
  }

  getJobNames(): string[] {
    return Object.keys(this.config.jobs);
  }
}
