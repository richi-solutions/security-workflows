import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { StorePort, CommitSummaryInput, SocialContentInput } from './store.port';
import { JobResult } from '../contracts/v1/job-result.schema';
import { Result, success, failure } from '../lib/result';
import { logger } from '../lib/logger';

export class SupabaseStoreAdapter implements StorePort {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async saveJobRun(result: JobResult): Promise<Result<{ id: string }>> {
    const traceId = uuidv4();
    try {
      const { data, error } = await this.client
        .from('job_runs')
        .insert({
          job_name: result.jobName,
          job_type: result.jobType,
          started_at: result.startedAt,
          completed_at: result.completedAt,
          duration_ms: result.durationMs,
          status: result.status,
          targets: result.targets,
          results: result.results,
          summary: result.summary ?? null,
        })
        .select('id')
        .single();

      if (error) {
        logger.error('store_save_failed', error, { traceId, jobName: result.jobName });
        return failure('STORE_ERROR', error.message, traceId);
      }

      logger.info('store_saved', { traceId, id: data.id, jobName: result.jobName });
      return success({ id: data.id });
    } catch (err) {
      logger.error('store_save_error', err, { traceId });
      return failure('STORE_ERROR', 'Failed to save job run', traceId);
    }
  }

  async getLatestJobRun(jobName: string): Promise<Result<JobResult | null>> {
    const traceId = uuidv4();
    try {
      const { data, error } = await this.client
        .from('job_runs')
        .select('*')
        .eq('job_name', jobName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return failure('STORE_ERROR', error.message, traceId);
      }

      if (!data) return success(null);

      return success({
        jobName: data.job_name,
        jobType: data.job_type,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        durationMs: data.duration_ms,
        status: data.status,
        targets: data.targets,
        results: data.results,
        summary: data.summary,
      });
    } catch (err) {
      logger.error('store_get_latest_error', err, { traceId, jobName });
      return failure('STORE_ERROR', 'Failed to get latest job run', traceId);
    }
  }

  async listJobRuns(opts: { jobName?: string; limit?: number }): Promise<Result<JobResult[]>> {
    const traceId = uuidv4();
    try {
      let query = this.client
        .from('job_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(opts.limit ?? 50);

      if (opts.jobName) {
        query = query.eq('job_name', opts.jobName);
      }

      const { data, error } = await query;

      if (error) {
        return failure('STORE_ERROR', error.message, traceId);
      }

      const results: JobResult[] = (data ?? []).map((row) => ({
        jobName: row.job_name,
        jobType: row.job_type,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        durationMs: row.duration_ms,
        status: row.status,
        targets: row.targets,
        results: row.results,
        summary: row.summary,
      }));

      return success(results);
    } catch (err) {
      logger.error('store_list_error', err, { traceId });
      return failure('STORE_ERROR', 'Failed to list job runs', traceId);
    }
  }

  async saveCommitSummary(input: CommitSummaryInput): Promise<Result<{ id: string }>> {
    const traceId = uuidv4();
    try {
      const { data, error } = await this.client
        .from('commit_summaries')
        .insert({
          job_run_id: input.jobRunId,
          summary_date: input.summaryDate,
          content: input.content,
          repos_active: input.reposActive,
          total_commits: input.totalCommits,
        })
        .select('id')
        .single();

      if (error) {
        logger.error('store_commit_summary_failed', error, { traceId });
        return failure('STORE_ERROR', error.message, traceId);
      }

      logger.info('store_commit_summary_saved', { traceId, id: data.id });
      return success({ id: data.id });
    } catch (err) {
      logger.error('store_commit_summary_error', err, { traceId });
      return failure('STORE_ERROR', 'Failed to save commit summary', traceId);
    }
  }

  async saveSocialContent(input: SocialContentInput): Promise<Result<{ id: string }>> {
    const traceId = uuidv4();
    try {
      // 1. Insert social_content row
      const { data: content, error: contentErr } = await this.client
        .from('social_content')
        .insert({
          job_run_id: input.jobRunId,
          post_date: input.postDate,
          content_type: input.contentType,
          should_post: input.shouldPost,
          reason: input.reason,
          status: input.shouldPost ? 'draft' : 'skipped',
        })
        .select('id')
        .single();

      if (contentErr) {
        logger.error('store_social_content_failed', contentErr, { traceId });
        return failure('STORE_ERROR', contentErr.message, traceId);
      }

      const contentId = content.id;

      // 2. Insert components
      if (input.components.length > 0) {
        const { error: compErr } = await this.client
          .from('social_content_components')
          .insert(
            input.components.map((c) => ({
              social_content_id: contentId,
              component_type: c.componentType,
              content: c.content,
              sort_order: c.sortOrder,
            })),
          );

        if (compErr) {
          logger.error('store_social_components_failed', compErr, { traceId, contentId });
        }
      }

      // 3. Insert platform mappings
      if (input.platforms.length > 0) {
        const { error: platErr } = await this.client
          .from('social_content_platforms')
          .insert(
            input.platforms.map((p) => ({
              social_content_id: contentId,
              platform: p,
              platform_status: 'pending',
            })),
          );

        if (platErr) {
          logger.error('store_social_platforms_failed', platErr, { traceId, contentId });
        }
      }

      logger.info('store_social_content_saved', { traceId, id: contentId, contentType: input.contentType });
      return success({ id: contentId });
    } catch (err) {
      logger.error('store_social_content_error', err, { traceId });
      return failure('STORE_ERROR', 'Failed to save social content', traceId);
    }
  }
}
