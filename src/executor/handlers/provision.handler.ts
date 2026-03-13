/**
 * @fileoverview Provision handler — discovers repos needing test user provisioning.
 *
 * Filters repos where project.yaml has `has_testusers: true` and provisions
 * test users. Currently a stub — logs eligible repos and returns partial status.
 *
 * @module executor/handlers/provision.handler
 */

import { v4 as uuidv4 } from 'uuid';
import { JobDefinition } from '../../contracts/v1/schedule.schema';
import { JobResult, TargetResult } from '../../contracts/v1/job-result.schema';
import { DiscoveryPort } from '../../discovery/discovery.port';
import { Result, success } from '../../lib/result';
import { logger } from '../../lib/logger';

/** Stub handler for test user provisioning (pending full implementation). */
export class ProvisionHandler {
  constructor(private discovery: DiscoveryPort) {}

  async run(jobName: string, _jobDef: JobDefinition): Promise<Result<JobResult>> {
    const traceId = uuidv4();
    const startedAt = new Date().toISOString();

    // Discover repos with testuser support
    const reposResult = await this.discovery.discoverRepos();
    if (!reposResult.ok) return reposResult;

    const eligibleRepos = reposResult.data.filter(
      (r) => r.projectConfig && r.projectConfig['has_testusers'] === true,
    );

    logger.info('provision_start', { traceId, jobName, eligible: eligibleRepos.length });

    const results: TargetResult[] = [];

    for (const repo of eligibleRepos) {
      // TODO: Implement project-specific testuser provisioning
      // Each project needs a Supabase URL + testuser table in project.yaml
      // For now, log and skip
      logger.info('provision_repo_skipped', { traceId, repo: repo.name, reason: 'not yet implemented' });
      results.push({
        target: repo.name,
        status: 'skipped',
        output: 'Testuser provisioning not yet implemented for this project.',
      });
    }

    const completedAt = new Date().toISOString();

    return success({
      jobName,
      jobType: 'provision',
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      status: eligibleRepos.length === 0 ? 'success' : 'partial',
      targets: eligibleRepos.map((r) => r.name),
      results,
      summary: `${eligibleRepos.length} projects eligible for testuser provisioning (not yet implemented).`,
    });
  }
}
