/**
 * @fileoverview Port interface for the job executor dispatch layer.
 *
 * The executor routes incoming job definitions to the appropriate handler
 * based on the job type (sweep, aggregate, chain, provision).
 *
 * @module executor/executor.port
 */

import { Result } from '../lib/result';
import { JobResult } from '../contracts/v1/job-result.schema';
import { JobDefinition } from '../contracts/v1/schedule.schema';

/** Port interface for executing scheduled jobs. */
export interface ExecutorPort {
  /**
   * Dispatches a job to the handler matching its type.
   *
   * @param jobName - Unique job identifier from schedule.yaml
   * @param jobDef - Full job definition including type, agent, and targets
   * @returns Result with JobResult on success, or failure with EXECUTOR_ERROR
   */
  execute(jobName: string, jobDef: JobDefinition): Promise<Result<JobResult>>;
}
