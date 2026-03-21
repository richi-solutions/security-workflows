/**
 * @fileoverview Profile sync handler — syncs README content and project metadata to Supabase.
 *
 * Discovers all repos, reads their README.md and project.yaml metadata,
 * then upserts a project_profiles row per repo. No Claude agent needed —
 * pure data synchronisation via GitHub API and Supabase.
 *
 * @module executor/handlers/profile-sync.handler
 */

import { v4 as uuidv4 } from 'uuid';
import { JobDefinition } from '../../contracts/v1/schedule.schema';
import { JobResult, TargetResult } from '../../contracts/v1/job-result.schema';
import { DiscoveryPort } from '../../discovery/discovery.port';
import { GitHubPort } from '../../github/github.port';
import { StorePort } from '../../store/store.port';
import { Result, success } from '../../lib/result';
import { logger } from '../../lib/logger';

/** Syncs README content and project.yaml metadata to project_profiles table. */
export class ProfileSyncHandler {
  constructor(
    private discovery: DiscoveryPort,
    private github: GitHubPort,
    private store: StorePort,
    private org: string,
  ) {}

  async run(jobName: string, _jobDef: JobDefinition): Promise<Result<JobResult>> {
    const traceId = uuidv4();
    const startedAt = new Date().toISOString();

    const reposResult = await this.discovery.discoverRepos();
    if (!reposResult.ok) return reposResult;

    const repos = reposResult.data;
    const results: TargetResult[] = [];

    logger.info('profile_sync_start', { traceId, jobName, repoCount: repos.length });

    for (const repo of repos) {
      // 1. Read README.md
      const readmeResult = await this.github.readFile(this.org, repo.name, 'README.md');
      const readmeContent = readmeResult.ok ? readmeResult.data : null;

      // 2. Extract metadata from project.yaml (already parsed by discovery adapter)
      const config = repo.projectConfig ?? {};

      // 3. Upsert profile
      const upsertResult = await this.store.upsertProjectProfile({
        repoName: repo.name,
        readmeContent,
        readmeSha: null,
        tagline: asString(config['tagline']),
        description: asString(config['description']),
        techStack: asStringArray(config['tech_stack']),
        demoVideoUrl: asString(config['demo_video_url']),
        logoUrl: asString(config['logo_url']),
        projectUrl: asString(config['project_url']),
        isPublic: config['public'] !== false,
      });

      if (upsertResult.ok) {
        results.push({
          target: repo.name,
          status: 'success',
          output: `Profile synced (id: ${upsertResult.data.id})`,
        });
      } else {
        results.push({
          target: repo.name,
          status: 'failure',
          error: upsertResult.error.message,
        });
        logger.error('profile_sync_repo_failed', new Error(upsertResult.error.message), {
          traceId,
          repo: repo.name,
        });
      }
    }

    const completedAt = new Date().toISOString();
    const successCount = results.filter((r) => r.status === 'success').length;
    const overallStatus = successCount === results.length ? 'success' : successCount > 0 ? 'partial' : 'failure';

    return success({
      jobName,
      jobType: 'sync',
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      status: overallStatus,
      targets: repos.map((r) => r.name),
      results,
      summary: `${successCount}/${results.length} project profiles synced`,
    });
  }
}

/** Safely extract a string from an unknown config value. */
function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Safely extract a string array from an unknown config value. */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
}
